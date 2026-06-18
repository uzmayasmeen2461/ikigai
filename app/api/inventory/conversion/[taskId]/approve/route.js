import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser, getUserRole } from "../../../../../lib/supabaseServer";
import { normalizeInventoryStatus } from "../../../../../lib/inventory";
import { insertUpdateTasks, tasksForNewProduct } from "../../../../../lib/updateTasks";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request, { params }) {
    const { taskId } = await params;
    if (!uuidPattern.test(taskId || "")) return NextResponse.json({ error: "Invalid task id." }, { status: 400 });

    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const role = await getUserRole(user.id);
    if (role !== "admin") return NextResponse.json({ error: "Only admin can approve converted inventory." }, { status: 403 });

    const supabase = createSupabaseUserClient(token);
    const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

    const { data: items } = await supabase
        .from("inventory_conversion_items")
        .select("*")
        .eq("task_id", taskId)
        .in("status", ["draft", "submitted"]);

    if (!items?.length) return NextResponse.json({ error: "No converted product rows to approve." }, { status: 400 });

    const rows = items.map((item) => ({
        client_id: task.client_id,
        product_name: item.product_name,
        category: item.category,
        product_code: item.product_code,
        price: item.price || 0,
        stock: item.stock || 0,
        status: normalizeInventoryStatus(item.stock || 0),
        notes: item.notes,
        image_url: item.cropped_image_url || item.source_image_url,
    }));

    const { data: products, error } = await supabase.from("products").insert(rows).select("*");
    if (error) return NextResponse.json({ error: error.message || "Could not approve inventory." }, { status: 500 });

    await supabase.from("inventory_conversion_items").update({ status: "approved" }).eq("task_id", taskId);
    await supabase.from("inventory_photo_batches").update({ status: "approved" }).eq("task_id", taskId);
    await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", taskId);

    let updateTaskWarning = "";
    try {
        await insertUpdateTasks(supabase, (products || []).flatMap(tasksForNewProduct));
    } catch (taskError) {
        updateTaskWarning = taskError.message || "Update tasks could not be created.";
    }

    return NextResponse.json({ products: products || [], update_task_warning: updateTaskWarning });
}
