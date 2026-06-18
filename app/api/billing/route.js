import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../lib/supabaseServer";
import { normalizeInventoryStatus, productName, toInteger } from "../../lib/inventory";
import { changeLogsForProduct, insertUpdateTasks, tasksForProductChanges } from "../../lib/updateTasks";

async function getRole(supabase, userId) {
    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

    const role = data?.role?.toLowerCase();
    if (role === "admin") return "admin";
    if (role === "worker" || role === "partner") return "partner";
    return "client";
}

async function nextBillNumber(supabase, clientId) {
    const year = new Date().getFullYear();
    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year + 1}-01-01T00:00:00.000Z`;
    const { count } = await supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", start)
        .lt("created_at", end);

    return `ORVA-${year}-${String((count || 0) + 1).padStart(4, "0")}`;
}

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const supabase = createSupabaseUserClient(token);
    const role = await getRole(supabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners cannot access billing." }, { status: 403 });
    }

    let query = supabase.from("bills").select("*").order("created_at", { ascending: false });
    if (role !== "admin") query = query.eq("client_id", user.id);

    const { data: bills, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message || "Could not load bills." }, { status: 500 });
    }

    const billIds = (bills || []).map((bill) => bill.id);
    let items = [];
    if (billIds.length) {
        const { data } = await supabase
            .from("bill_items")
            .select("*")
            .in("bill_id", billIds);
        items = data || [];
    }

    return NextResponse.json({
        bills: (bills || []).map((bill) => ({
            ...bill,
            items: items.filter((item) => item.bill_id === bill.id),
        })),
    });
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const supabase = createSupabaseUserClient(token);
    const role = await getRole(supabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners cannot create bills." }, { status: 403 });
    }

    const body = await request.json();
    const clientId = role === "admin" && body.client_id ? body.client_id : user.id;
    const incomingItems = Array.isArray(body.items) ? body.items : [];

    if (!incomingItems.length) {
        return NextResponse.json({ error: "Add at least one product to create a bill." }, { status: 400 });
    }

    const productIds = [...new Set(incomingItems.map((item) => String(item.product_id || "").trim()).filter(Boolean))];
    const { data: products, error: productError } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);

    if (productError) {
        return NextResponse.json({ error: productError.message || "Could not load products." }, { status: 500 });
    }

    const productMap = new Map((products || []).map((product) => [String(product.id), product]));
    let billItems = [];
    try {
        billItems = incomingItems.map((item) => {
            const productId = String(item.product_id || "").trim();
            const product = productMap.get(productId);
            const quantity = Math.max(1, toInteger(item.quantity, 1));
            if (!product) throw new Error("A selected product was not found.");
            if (role !== "admin" && product.client_id !== user.id) throw new Error("You cannot bill products from another account.");
            if (Number(product.stock || 0) < quantity) throw new Error(`${productName(product)} has only ${product.stock || 0} in stock.`);
            const price = Number(product.price || 0);
            return {
                product,
                row: {
                    product_id: product.id,
                    product_name: productName(product),
                    quantity,
                    price,
                    line_total: price * quantity,
                },
            };
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not create bill." }, { status: 400 });
    }

    const totalAmount = billItems.reduce((sum, item) => sum + item.row.line_total, 0);
    const billNumber = await nextBillNumber(supabase, clientId);

    const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
            client_id: clientId,
            customer_name: body.customer_name || "",
            customer_phone: body.customer_phone || "",
            total_amount: totalAmount,
            payment_status: body.payment_status || "unpaid",
            bill_number: billNumber,
        })
        .select("*")
        .single();

    if (billError) {
        return NextResponse.json({ error: billError.message || "Could not create bill." }, { status: 500 });
    }

    const { data: savedItems, error: itemError } = await supabase
        .from("bill_items")
        .insert(billItems.map((item) => ({ ...item.row, bill_id: bill.id })))
        .select("*");

    if (itemError) {
        return NextResponse.json({ error: itemError.message || "Could not save bill items." }, { status: 500 });
    }

    let updateTaskWarning = "";
    for (const item of billItems) {
        const oldStock = Number(item.product.stock || 0);
        const newStock = oldStock - item.row.quantity;
        const { data: updatedProduct } = await supabase
            .from("products")
            .update({
                stock: newStock,
                status: normalizeInventoryStatus(newStock, item.product.status),
                updated_at: new Date().toISOString(),
            })
            .eq("id", item.product.id)
            .select("*")
            .single();

        await supabase.from("inventory_logs").insert({
            product_id: item.product.id,
            client_id: item.product.client_id,
            action: "bill_sale",
            old_stock: oldStock,
            new_stock: newStock,
            old_price: item.product.price || 0,
            new_price: item.product.price || 0,
            note: `Sold ${item.row.quantity} via bill ${bill.bill_number}.`,
        });

        if (updatedProduct) {
            try {
                const changes = changeLogsForProduct(item.product, updatedProduct);
                if (changes.length) await supabase.from("product_change_logs").insert(changes);
                await insertUpdateTasks(supabase, tasksForProductChanges(item.product, updatedProduct));
            } catch (taskError) {
                updateTaskWarning ||= taskError.message || "Update tasks could not be created.";
            }
        }
    }

    return NextResponse.json({ bill: { ...bill, items: savedItems || [] }, update_task_warning: updateTaskWarning }, { status: 201 });
}
