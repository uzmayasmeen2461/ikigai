import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { generateProductCode, normalizeInventoryStatus, toInteger } from "../../../lib/inventory";
import { insertUpdateTasks, tasksForNewProduct } from "../../../lib/updateTasks";

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json();
    const products = Array.isArray(body.products) ? body.products : [];
    if (!products.length) return NextResponse.json({ error: "No valid products to import." }, { status: 400 });

    const supabase = createSupabaseUserClient(token);
    const rows = products.map((product, index) => {
        const stock = Math.max(0, toInteger(product.stock, 0));
        return {
            client_id: user.id,
            product_name: product.product_name,
            category: product.category || "",
            price: Math.max(0, toInteger(product.price, 0)),
            stock,
            product_code: product.product_code || generateProductCode(product.product_name, index + 1),
            notes: product.notes || "",
            status: normalizeInventoryStatus(stock),
        };
    });

    const { data: upload } = await supabase.from("inventory_uploads").insert({
        client_id: user.id,
        upload_type: "csv",
        status: "imported",
        parsed_rows: rows,
        errors: [],
    }).select("*").single();

    const { data, error } = await supabase.from("products").insert(rows).select("*");
    if (error) return NextResponse.json({ error: error.message || "Could not import products." }, { status: 500 });

    let updateTaskWarning = "";
    try {
        await insertUpdateTasks(supabase, (data || []).flatMap(tasksForNewProduct));
    } catch (taskError) {
        updateTaskWarning = taskError.message || "Update tasks could not be created.";
    }

    return NextResponse.json({ products: data || [], upload, update_task_warning: updateTaskWarning }, { status: 201 });
}
