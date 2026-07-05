import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { nowISTISOString } from "../../../lib/istDate";

const adminOnlyActions = new Set(["assign", "generate_payout", "mark_paid", "close"]);
const workerStatuses = new Set(["started", "in_progress", "completed", "failed"]);
const adminStatuses = new Set(["pending", "assigned", "started", "in_progress", "completed", "failed", "cancelled", "closed"]);
const setupTaskTypes = [
    "create_facebook_page",
    "create_instagram_page",
    "setup_whatsapp_business",
    "catalog_setup",
    "account_setup",
    "manual_client_support",
];

function normalizeRole(role) {
    const value = String(role || "client").toLowerCase();
    if (value === "admin") return "admin";
    if (value === "worker" || value === "partner") return "partner";
    return "client";
}

function cleanText(value, fallback = "") {
    return String(value || fallback).trim();
}

function normalizeChannel(value) {
    const channel = String(value || "general_setup").toLowerCase();
    if (["whatsapp_business", "whatsapp_catalog", "instagram_setup", "instagram", "facebook_setup", "facebook_page", "online_store", "general_setup"].includes(channel)) {
        return channel;
    }
    return "general_setup";
}

function normalizeTaskType(value) {
    const taskType = String(value || "manual_client_support").toLowerCase();
    if ([
        "create_facebook_page",
        "create_instagram_page",
        "setup_whatsapp_business",
        "catalog_setup",
        "account_setup",
        "manual_client_support",
        "product_update",
        "social_post_required",
    ].includes(taskType)) {
        return taskType;
    }
    return "manual_client_support";
}

async function getProfile(supabase, userId) {
    const { data } = await supabase.from("users").select("id, name, role, upi_id, availability").eq("id", userId).maybeSingle();
    return { id: userId, role: normalizeRole(data?.role), profile: data || { id: userId, role: "client" } };
}

async function writeLog(supabase, { taskId, actorId, actorRole, action, fromStatus, toStatus, note, metadata }) {
    await supabase.from("task_activity_logs").insert({
        task_id: taskId,
        actor_id: actorId,
        actor_role: actorRole,
        action,
        from_status: fromStatus || null,
        to_status: toStatus || null,
        note: note || null,
        metadata: metadata || {},
    });
}

async function loadUsers(supabase) {
    const { data } = await supabase
        .from("users")
        .select("id, name, role, upi_id, availability")
        .in("role", ["worker", "partner"]);
    return data || [];
}

async function loadPayouts(supabase, taskIds) {
    if (!taskIds.length) return [];
    const { data } = await supabase.from("partner_payouts").select("*").in("task_id", taskIds.map(String));
    return data || [];
}

async function loadLogs(supabase, taskIds) {
    if (!taskIds.length) return [];
    const { data } = await supabase
        .from("task_activity_logs")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });
    return data || [];
}

function attachRelated(tasks, workers, payouts, logs) {
    return tasks.map((task) => ({
        ...task,
        specialist: workers.find((worker) => worker.id === task.assigned_to) || null,
        payout: payouts.find((payout) => String(payout.task_id) === String(task.id)) || null,
        activity_logs: logs.filter((log) => log.task_id === task.id),
    }));
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const supabase = createSupabaseAdmin();
    const { role } = await getProfile(supabase, user.id);
    if (!["admin", "partner"].includes(role)) {
        return NextResponse.json({ error: "Only admins and digital setup specialists can access operations tasks." }, { status: 403 });
    }

    let query = supabase
        .from("update_tasks")
        .select("*")
        .in("task_type", setupTaskTypes)
        .order("created_at", { ascending: false });
    if (role === "partner") query = query.eq("assigned_to", user.id);

    const { data: tasks, error } = await query;
    if (error) {
        return NextResponse.json({
            error: error.message?.includes("update_tasks")
                ? "Run scripts/orva-specialist-operations.sql in Supabase before using operations tasks."
                : error.message || "Could not load operations tasks.",
        }, { status: 500 });
    }

    const taskIds = (tasks || []).map((task) => task.id);
    const [workers, payouts, logs] = await Promise.all([
        loadUsers(supabase),
        loadPayouts(supabase, taskIds),
        loadLogs(supabase, taskIds),
    ]);

    return NextResponse.json({ role, tasks: attachRelated(tasks || [], workers, payouts, logs), workers });
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const supabase = createSupabaseAdmin();
    const { role } = await getProfile(supabase, user.id);
    if (role !== "admin") return NextResponse.json({ error: "Only admin can create setup tasks." }, { status: 403 });

    const body = await request.json();
    const title = cleanText(body.title);
    if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });

    const clientName = cleanText(body.client_name);
    const clientBusinessName = cleanText(body.client_business_name);
    const clientPhone = cleanText(body.client_phone);
    const clientEmail = cleanText(body.client_email).toLowerCase();
    if (!clientName || !clientBusinessName || !clientPhone) {
        return NextResponse.json({ error: "Client name, business name, and phone are required." }, { status: 400 });
    }

    const payload = {
        user_id: user.id,
        product_id: null,
        channel: normalizeChannel(body.channel),
        task_type: normalizeTaskType(body.task_type),
        title,
        description: cleanText(body.description),
        instructions: cleanText(body.instructions),
        client_name: clientName,
        client_business_name: clientBusinessName,
        client_email: clientEmail,
        client_phone: clientPhone,
        priority: ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : "medium",
        status: body.assigned_to ? "assigned" : "pending",
        assigned_to: body.assigned_to || null,
        assigned_at: body.assigned_to ? nowISTISOString() : null,
        payout_amount: Math.max(0, Number(body.payout_amount || 0)),
        payout_status: "not_generated",
        old_value: {},
        new_value: {},
    };

    const { data, error } = await supabase.from("update_tasks").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message || "Could not create task." }, { status: 500 });

    await writeLog(supabase, {
        taskId: data.id,
        actorId: user.id,
        actorRole: role,
        action: "created",
        toStatus: data.status,
        note: body.assigned_to ? "Task created and assigned." : "Task created.",
    });

    return NextResponse.json({ task: data });
}

export async function PATCH(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json();
    const taskId = cleanText(body.task_id);
    const action = cleanText(body.action);
    if (!taskId || !action) return NextResponse.json({ error: "Task and action are required." }, { status: 400 });

    const supabase = createSupabaseAdmin();
    const { role } = await getProfile(supabase, user.id);
    const { data: task, error: taskError } = await supabase.from("update_tasks").select("*").eq("id", taskId).maybeSingle();
    if (taskError || !task) return NextResponse.json({ error: taskError?.message || "Task not found." }, { status: 404 });

    if (adminOnlyActions.has(action) && role !== "admin") {
        return NextResponse.json({ error: "Only admin can perform this action." }, { status: 403 });
    }
    if (role === "partner" && task.assigned_to !== user.id) {
        return NextResponse.json({ error: "This task is not assigned to you." }, { status: 403 });
    }
    if (!["admin", "partner"].includes(role)) {
        return NextResponse.json({ error: "Only admin and assigned specialists can update operations tasks." }, { status: 403 });
    }

    const now = nowISTISOString();
    const fromStatus = task.status;
    const patch = { updated_at: now };
    let logAction = action;
    let note = cleanText(body.note || body.specialist_notes || body.admin_notes);

    if (action === "assign") {
        const partnerId = cleanText(body.assigned_to);
        if (!partnerId) return NextResponse.json({ error: "Choose a specialist to assign." }, { status: 400 });
        patch.assigned_to = partnerId;
        patch.assigned_at = now;
        patch.status = "assigned";
        if (note) patch.admin_notes = note;
    } else if (action === "status") {
        const status = cleanText(body.status);
        const allowed = role === "admin" ? adminStatuses : workerStatuses;
        if (!allowed.has(status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
        patch.status = status;
        if (["started", "in_progress"].includes(status) && !task.started_at) patch.started_at = now;
        if (status === "completed") {
            patch.completed_by = user.id;
            patch.completed_at = now;
            patch.completion_note = note || task.completion_note || "";
        }
        if (role === "partner" && note) patch.specialist_notes = note;
        if (role === "admin" && note) patch.admin_notes = note;
        logAction = `status_${status}`;
    } else if (action === "generate_payout") {
        if (!task.assigned_to) return NextResponse.json({ error: "Assign this task before generating payout." }, { status: 400 });
        if (!["completed", "payout_generated", "payout_paid", "payment_confirmed", "closed"].includes(task.status)) {
            return NextResponse.json({ error: "Complete the task before generating payout." }, { status: 400 });
        }
        const amount = Math.max(0, Number(body.payout_amount || task.payout_amount || 0));
        if (!amount) return NextResponse.json({ error: "Enter payout amount." }, { status: 400 });
        patch.payout_amount = amount;
        patch.payout_status = "pending_admin_payment";
        patch.payout_generated_at = task.payout_generated_at || now;
        patch.status = task.status === "completed" ? "payout_generated" : task.status;
        if (note) patch.admin_notes = note;

        const { data: existing } = await supabase.from("partner_payouts").select("*").eq("task_id", String(task.id)).maybeSingle();
        const payoutPayload = {
            task_id: String(task.id),
            partner_id: task.assigned_to,
            payout_amount: amount,
            status: "pending_admin_payment",
            payout_method: "upi",
            notes: note || null,
            updated_at: now,
        };
        if (existing) {
            await supabase.from("partner_payouts").update(payoutPayload).eq("id", existing.id);
        } else {
            await supabase.from("partner_payouts").insert({ ...payoutPayload, created_at: now });
        }
    } else if (action === "mark_paid") {
        if (!["pending_admin_payment", "paid_by_admin", "confirmed_by_worker"].includes(task.payout_status)) {
            return NextResponse.json({ error: "Generate payout before marking it paid." }, { status: 400 });
        }
        patch.payout_status = "paid_by_admin";
        patch.payout_reference = cleanText(body.payout_reference || task.payout_reference);
        patch.payout_paid_at = now;
        patch.status = "payout_paid";
        if (note) patch.admin_notes = note;
        await supabase
            .from("partner_payouts")
            .update({
                status: "paid",
                payout_reference: patch.payout_reference,
                paid_at: now,
                updated_at: now,
                notes: note || task.admin_notes || null,
            })
            .eq("task_id", String(task.id));
    } else if (action === "confirm_payout") {
        if (task.payout_status !== "paid_by_admin") {
            return NextResponse.json({ error: "Admin must mark the payout paid before you can confirm it." }, { status: 400 });
        }
        patch.payout_status = "confirmed_by_worker";
        patch.payout_confirmed_at = now;
        patch.payout_confirmed_by = user.id;
        patch.status = "closed";
        if (note) patch.specialist_notes = note;
        await supabase
            .from("partner_payouts")
            .update({ status: "confirmed", confirmed_at: now, confirmed_by: user.id, updated_at: now })
            .eq("task_id", String(task.id));
    } else if (action === "close") {
        patch.status = "closed";
        if (note) patch.admin_notes = note;
    } else {
        return NextResponse.json({ error: "Choose a valid task action." }, { status: 400 });
    }

    const { data, error } = await supabase.from("update_tasks").update(patch).eq("id", task.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message || "Could not update task." }, { status: 500 });

    await writeLog(supabase, {
        taskId: task.id,
        actorId: user.id,
        actorRole: role,
        action: logAction,
        fromStatus,
        toStatus: data.status,
        note,
        metadata: {
            payout_amount: patch.payout_amount,
            payout_reference: patch.payout_reference,
            assigned_to: patch.assigned_to,
        },
    });

    return NextResponse.json({ task: data });
}
