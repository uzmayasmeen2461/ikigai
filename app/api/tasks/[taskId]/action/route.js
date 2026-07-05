import { NextResponse } from "next/server";
import {
    createPayoutForCompletedTask,
    getSlaStatus,
    notifyUser,
} from "../../../../lib/automation";
import {
    createSupabaseAdmin,
    getAuthenticatedUser,
    getBearerToken,
    getUserRole,
} from "../../../../lib/supabaseServer";
import { nowISTISOString } from "../../../../lib/istDate";

export const runtime = "nodejs";

function hasChecklist(payload = {}) {
    const checklist = payload.checklist || {};
    return Boolean(checklist.output_attached && checklist.notes_added && checklist.deliverables_completed);
}

async function loadTaskContext(supabase, taskId) {
    const { data: task, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
    if (error || !task) return { task: null, error: "Task not found." };
    return { task };
}

export async function POST(request, context) {
    try {
        const token = getBearerToken(request);
        if (!token) return NextResponse.json({ error: "Missing authentication token." }, { status: 401 });

        const auth = await getAuthenticatedUser(request);
        if (auth.error || !auth.user) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
        }

        const { taskId } = await context.params;
        const payload = await request.json();
        const action = payload.action;
        const supabase = createSupabaseAdmin();
        const rawRole = await getUserRole(auth.user.id);
        const role = rawRole === "worker" ? "partner" : rawRole;
        const { task, error } = await loadTaskContext(supabase, taskId);

        if (error) return NextResponse.json({ error }, { status: 404 });

        const isPartnerOwner = task.worker_id === auth.user.id;
        const isClientOwner = task.client_id === auth.user.id;
        const now = nowISTISOString();

        if (action === "partner_start") {
            if (role !== "partner" || !isPartnerOwner) {
                return NextResponse.json({ error: "Only the assigned partner can start this task." }, { status: 403 });
            }

            const { data, error: updateError } = await supabase
                .from("tasks")
                .update({ status: "in_progress", started_at: now, sla_status: getSlaStatus({ ...task, status: "in_progress" }) })
                .eq("id", task.id)
                .select("*")
                .single();

            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

            await notifyUser(supabase, {
                userId: task.client_id,
                taskId: task.id,
                type: "task_started",
                title: "Your ORVA task has started",
                message: `${task.title || "Your task"} is now in progress.`,
                email: task.client_email,
            });

            return NextResponse.json({ task: data });
        }

        if (action === "partner_submit") {
            if (role !== "partner" || !isPartnerOwner) {
                return NextResponse.json({ error: "Only the assigned partner can submit this task." }, { status: 403 });
            }
            if (!hasChecklist(payload)) {
                return NextResponse.json({ error: "Complete the review checklist before submitting." }, { status: 400 });
            }
            if (!String(payload.notes || "").trim()) {
                return NextResponse.json({ error: "Add delivery notes before submitting." }, { status: 400 });
            }

            const { data, error: updateError } = await supabase
                .from("tasks")
                .update({
                    status: "submitted_for_review",
                    notes: String(payload.notes || "").trim(),
                    delivery_output: String(payload.output || "").trim(),
                    review_checklist: payload.checklist,
                    submitted_at: now,
                    sla_status: getSlaStatus({ ...task, status: "submitted_for_review" }),
                })
                .eq("id", task.id)
                .select("*")
                .single();

            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

            await notifyUser(supabase, {
                userId: task.client_id,
                taskId: task.id,
                type: "task_submitted",
                title: "Your ORVA delivery is ready",
                message: `${task.title || "Your task"} is ready for approval. You can approve or request changes within 3 days.`,
                email: task.client_email,
            });

            return NextResponse.json({ task: data });
        }

        if (action === "client_approve") {
            if (role !== "client" || !isClientOwner) {
                return NextResponse.json({ error: "Only the client can approve this delivery." }, { status: 403 });
            }

            const { data, error: updateError } = await supabase
                .from("tasks")
                .update({
                    status: "client_approved",
                    client_approved_at: now,
                    completed_at: now,
                    sla_status: getSlaStatus({ ...task, status: "client_approved" }),
                })
                .eq("id", task.id)
                .select("*")
                .single();

            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

            await createPayoutForCompletedTask(supabase, data);
            return NextResponse.json({ task: data });
        }

        if (action === "client_revision") {
            if (role !== "client" || !isClientOwner) {
                return NextResponse.json({ error: "Only the client can request changes." }, { status: 403 });
            }
            const revisionNote = String(payload.revision_note || "").trim();
            if (revisionNote.length < 5) {
                return NextResponse.json({ error: "Please add a clear change request." }, { status: 400 });
            }

            const { data, error: updateError } = await supabase
                .from("tasks")
                .update({
                    status: "revision_requested",
                    revision_note: revisionNote,
                    revision_requested_at: now,
                    dispute_status: payload.dispute ? "admin_review" : null,
                })
                .eq("id", task.id)
                .select("*")
                .single();

            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

            await notifyUser(supabase, {
                userId: task.worker_id,
                taskId: task.id,
                type: "changes_requested",
                title: "Changes requested on your ORVA task",
                message: revisionNote,
            });

            if (payload.dispute) {
                await notifyUser(supabase, {
                    role: "admin",
                    taskId: task.id,
                    type: "dispute_opened",
                    title: "Client dispute needs review",
                    message: `${task.title || "A task"} has a client dispute: ${revisionNote}`,
                });
            }

            return NextResponse.json({ task: data });
        }

        if (action === "admin_complete") {
            if (role !== "admin") {
                return NextResponse.json({ error: "Only admin can complete this task." }, { status: 403 });
            }

            const { data, error: updateError } = await supabase
                .from("tasks")
                .update({
                    status: "completed",
                    completed_at: now,
                    sla_status: getSlaStatus({ ...task, status: "completed" }),
                })
                .eq("id", task.id)
                .select("*")
                .single();

            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

            await createPayoutForCompletedTask(supabase, data);
            return NextResponse.json({ task: data });
        }

        if (action === "admin_resolve_dispute") {
            if (role !== "admin") {
                return NextResponse.json({ error: "Only admin can resolve disputes." }, { status: 403 });
            }

            const { data, error: updateError } = await supabase
                .from("tasks")
                .update({
                    dispute_status: payload.resolution || "resolved",
                    admin_resolution_note: String(payload.note || "").trim(),
                    status: payload.return_to_partner ? "revision_requested" : task.status,
                })
                .eq("id", task.id)
                .select("*")
                .single();

            if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
            return NextResponse.json({ task: data });
        }

        return NextResponse.json({ error: "Unsupported task action." }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not update task." }, { status: 500 });
    }
}
