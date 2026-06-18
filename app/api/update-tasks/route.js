import { NextResponse } from "next/server";
import {
    createSupabaseServiceRole,
    createSupabaseUserClient,
    getAuthenticatedUser,
    hasSupabaseServiceRoleKey,
} from "../../lib/supabaseServer";

const allowedStatuses = ["pending", "in_progress", "completed", "failed", "cancelled"];

async function getRole(supabase, userId) {
    const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    const role = String(data?.role || "client").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "worker" || role === "partner") return "partner";
    return "client";
}

function scopedQuery(supabase, role, userId) {
    let query = supabase
        .from("update_tasks")
        .select("*, products(name, product_name, sku, product_code, price, stock, status, image_url)")
        .order("created_at", { ascending: false });
    if (role === "client") query = query.eq("user_id", userId);
    if (role === "partner") query = query.eq("assigned_to", userId);
    return query;
}

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    const supabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : userSupabase;
    const { data, error } = await scopedQuery(supabase, role, user.id);

    if (error) {
        return NextResponse.json({
            error: error.message.includes("update_tasks")
                ? "Run scripts/orva-update-tasks.sql in Supabase to enable the update queue."
                : error.message,
        }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [], role });
}

export async function PATCH(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json();
    const taskId = body.task_id;
    const status = String(body.status || "");
    if (!taskId || !allowedStatuses.includes(status)) {
        return NextResponse.json({ error: "Choose a valid task and status." }, { status: 400 });
    }

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    const supabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : userSupabase;
    const { data: task, error: loadError } = await supabase.from("update_tasks").select("*").eq("id", taskId).maybeSingle();
    if (loadError || !task) return NextResponse.json({ error: loadError?.message || "Update task not found." }, { status: 404 });

    const allowed = role === "admin" || task.user_id === user.id || task.assigned_to === user.id;
    if (!allowed) return NextResponse.json({ error: "You cannot update this task." }, { status: 403 });

    const patch = {
        status,
        updated_at: new Date().toISOString(),
        completion_note: String(body.completion_note || task.completion_note || "").trim(),
    };
    if (status === "completed") {
        patch.completed_by = user.id;
        patch.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from("update_tasks").update(patch).eq("id", taskId).select("*, products(name, product_name, sku, product_code, price, stock, status, image_url)").single();
    if (error) return NextResponse.json({ error: error.message || "Could not update task." }, { status: 500 });
    return NextResponse.json({ task: data });
}
