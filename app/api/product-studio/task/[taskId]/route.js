import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser, getUserRole } from "../../../../lib/supabaseServer";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function isContentTask(task = {}) {
    const text = `${task.service_type || ""} ${task.title || ""}`.toLowerCase();
    return [
        "product",
        "catalog",
        "whatsapp",
        "instagram",
        "facebook",
        "social",
        "marketplace",
    ].some((keyword) => text.includes(keyword));
}

export async function GET(request, { params }) {
    const { taskId } = await params;
    if (!uuidPattern.test(taskId || "")) {
        return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const role = await getUserRole(user.id);
    if (!["admin", "partner", "worker"].includes(role)) {
        return NextResponse.json({ error: "Open Product Studio from an assigned paid task." }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();

    if (taskError || !task) {
        return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    if (!isContentTask(task)) {
        return NextResponse.json({ error: "This task is not enabled for Product Studio." }, { status: 400 });
    }

    if (role !== "admin") {
        const status = task.status || "assigned";
        if (task.worker_id !== user.id || task.payment_status !== "paid" || ["completed", "cancelled"].includes(status)) {
            return NextResponse.json({ error: "Product Studio is available only for paid tasks assigned to you." }, { status: 403 });
        }
    }

    const { data: products, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("client_id", task.client_id)
        .order("updated_at", { ascending: false });

    if (productError) {
        return NextResponse.json({ error: productError.message || "Could not load products." }, { status: 500 });
    }

    const { data: outputs } = await supabase
        .from("product_content_outputs")
        .select("*")
        .eq("task_id", taskId)
        .order("updated_at", { ascending: false });

    return NextResponse.json({ task, products: products || [], outputs: outputs || [], role });
}
