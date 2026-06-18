import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { normalizeInventoryStatus } from "../../../lib/inventory";
import { insertUpdateTasks, tasksForNewProduct } from "../../../lib/updateTasks";

const demoRows = [
    ["Black Kurti", "Kurtis", 1299, 5, "KUR001", "New arrival"],
    ["Brown Handbag", "Bags", 899, 8, "BAG001", "Trending"],
    ["Party Gown", "Gowns", 3499, 2, "GWN001", "Low stock"],
    ["Pink Kids Frock", "Kids Wear", 699, 0, "KID001", "Restock needed"],
];

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const supabase = createSupabaseUserClient(token);
    const rows = demoRows.map(([product_name, category, price, stock, product_code, notes]) => ({
        client_id: user.id,
        product_name,
        category,
        price,
        stock,
        product_code,
        notes,
        status: normalizeInventoryStatus(stock),
    }));

    const { data, error } = await supabase.from("products").insert(rows).select("*");
    if (error) {
        return NextResponse.json({ error: error.message || "Could not load demo inventory." }, { status: 500 });
    }

    await supabase.from("inventory_logs").insert(
        (data || []).map((product) => ({
            product_id: product.id,
            client_id: user.id,
            action: "demo_loaded",
            old_stock: 0,
            new_stock: product.stock || 0,
            old_price: null,
            new_price: product.price || 0,
            note: "Demo inventory loaded.",
        }))
    );

    let updateTaskWarning = "";
    try {
        await insertUpdateTasks(supabase, (data || []).flatMap(tasksForNewProduct));
    } catch (taskError) {
        updateTaskWarning = taskError.message || "Update tasks could not be created.";
    }

    return NextResponse.json({ products: data || [], update_task_warning: updateTaskWarning }, { status: 201 });
}
