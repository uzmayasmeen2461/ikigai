import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";
import { nowISTISOString } from "../../../lib/istDate";

function canWriteForTask({ role, task, userId }) {
    if (role === "admin") return true;
    if (!["partner", "worker"].includes(role)) return false;
    const status = task?.status || "assigned";
    return task?.worker_id === userId && task?.payment_status === "paid" && !["completed", "cancelled"].includes(status);
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const taskId = body.task_id || null;
    const outputs = Array.isArray(body.outputs) ? body.outputs : [];

    if (!taskId || !outputs.length) {
        return NextResponse.json({ error: "Task and outputs are required." }, { status: 400 });
    }

    const role = await getUserRole(user.id);
    const supabase = createSupabaseAdmin();
    const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();

    if (!canWriteForTask({ role, task, userId: user.id })) {
        return NextResponse.json({ error: "You cannot save outputs for this task." }, { status: 403 });
    }

    const rows = outputs.map((output) => ({
        product_id: output.product_id,
        client_id: task.client_id,
        task_id: taskId,
        whatsapp_title: output.whatsapp_title || "",
        whatsapp_description: output.whatsapp_description || "",
        instagram_caption: output.instagram_caption || "",
        instagram_hashtags: output.instagram_hashtags || "",
        facebook_title: output.facebook_title || "",
        facebook_description: output.facebook_description || "",
        facebook_category: output.facebook_category || "",
        status: output.status || "draft",
        created_by: user.id,
        updated_at: nowISTISOString(),
    }));

    await supabase.from("product_content_outputs").delete().eq("task_id", taskId);
    const { data, error } = await supabase.from("product_content_outputs").insert(rows).select("*");

    if (error) {
        return NextResponse.json({ error: error.message || "Could not save generated content." }, { status: 500 });
    }

    return NextResponse.json({ outputs: data || [] }, { status: 201 });
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
        .from("product_content_outputs")
        .select("*")
        .eq("client_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: error.message || "Could not load generated content." }, { status: 500 });
    }

    return NextResponse.json({ outputs: data || [] });
}
