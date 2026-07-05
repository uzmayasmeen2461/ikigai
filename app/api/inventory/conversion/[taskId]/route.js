import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser, getUserRole } from "../../../../lib/supabaseServer";
import { nowISTISOString } from "../../../../lib/istDate";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getTaskAccess(taskId, userId, token) {
    const userSupabase = createSupabaseUserClient(token);
    const role = await getUserRole(userId);
    const { data: task, error } = await userSupabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();

    if (error || !task) return { error: "Task not found.", status: 404 };
    if (task.service_type !== "inventory_photo_conversion") return { error: "This is not an inventory conversion task.", status: 400 };
    if (role === "admin") return { supabase: userSupabase, role, task };
    if ((role === "partner" || role === "worker") && task.worker_id === userId && task.payment_status === "paid") {
        return { supabase: userSupabase, role, task };
    }
    return { error: "Open this tool from an assigned paid inventory conversion task.", status: 403 };
}

export async function GET(request, { params }) {
    const { taskId } = await params;
    if (!uuidPattern.test(taskId || "")) return NextResponse.json({ error: "Invalid task id." }, { status: 400 });

    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const access = await getTaskAccess(taskId, user.id, token);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { data: batch } = await access.supabase
        .from("inventory_photo_batches")
        .select("*")
        .eq("task_id", taskId)
        .maybeSingle();
    const { data: items } = await access.supabase
        .from("inventory_conversion_items")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

    return NextResponse.json({ task: access.task, batch, items: items || [], role: access.role });
}

export async function POST(request, { params }) {
    const { taskId } = await params;
    if (!uuidPattern.test(taskId || "")) return NextResponse.json({ error: "Invalid task id." }, { status: 400 });

    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const access = await getTaskAccess(taskId, user.id, token);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    if (body.action === "submit") {
        const { data: draftItems } = await access.supabase
            .from("inventory_conversion_items")
            .select("*")
            .eq("task_id", taskId)
            .eq("status", "draft");

        if (!draftItems?.length) {
            return NextResponse.json({ error: "Save at least one product row before submitting." }, { status: 400 });
        }

        await access.supabase.from("inventory_conversion_items").update({ status: "submitted" }).eq("task_id", taskId);
        await access.supabase.from("inventory_photo_batches").update({ status: "submitted_for_review" }).eq("task_id", taskId);
        await access.supabase.from("tasks").update({
            status: "submitted_for_review",
            submitted_at: nowISTISOString(),
            notes: body.notes || "Inventory conversion submitted for review.",
        }).eq("id", taskId);

        return NextResponse.json({ ok: true });
    }

    const item = {
        task_id: taskId,
        client_id: access.task.client_id,
        partner_id: user.id,
        source_image_url: body.source_image_url || "",
        cropped_image_url: body.cropped_image_url || body.source_image_url || "",
        product_name: body.product_name || "",
        category: body.category || "",
        product_code: body.product_code || "",
        price: Number.parseInt(body.price || "0", 10) || 0,
        stock: Number.parseInt(body.stock || "0", 10) || 0,
        notes: body.notes || "",
        status: "draft",
    };

    if (!item.product_name) return NextResponse.json({ error: "Product name is required." }, { status: 400 });

    const { data, error } = await access.supabase
        .from("inventory_conversion_items")
        .insert(item)
        .select("*")
        .single();

    if (error) return NextResponse.json({ error: error.message || "Could not save product row." }, { status: 500 });

    await access.supabase.from("tasks").update({ status: "in_progress", started_at: nowISTISOString() }).eq("id", taskId);
    return NextResponse.json({ item: data }, { status: 201 });
}
