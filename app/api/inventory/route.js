import { NextResponse } from "next/server";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";
import {
    cleanText,
    generateProductCode,
    normalizeInventoryStatus,
    toInteger,
} from "../../lib/inventory";
import { insertUpdateTasks, tasksForNewProduct } from "../../lib/updateTasks";
import { runDynamicProductSync } from "../../lib/dynamicProductSync";
import { publicProductImageFields } from "../../lib/productImageStorage";

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

function valueFrom(item, keys, fallback = "") {
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
            return item[key];
        }
    }
    return fallback;
}

function serializeProduct(item, clientId, index = 1) {
    const productName = cleanText(valueFrom(item, ["product_name", "Product Name", "name", "Name"]));
    const stock = Math.max(0, toInteger(valueFrom(item, ["stock", "Stock", "stock_quantity"], 0)));
    const requestedStatus = cleanText(valueFrom(item, ["status", "Status"]));
    const productCode = cleanText(valueFrom(item, ["product_code", "Product Code", "sku", "SKU"], "")).toUpperCase();

    return {
        user_id: clientId,
        client_id: clientId,
        name: productName,
        product_name: productName,
        category: cleanText(valueFrom(item, ["category", "Category"])),
        sku: productCode || generateProductCode(productName, index),
        product_code: productCode || generateProductCode(productName, index),
        price: Math.max(0, toInteger(valueFrom(item, ["price", "Price"], 0))),
        stock,
        status: normalizeInventoryStatus(stock, requestedStatus),
        description: cleanText(valueFrom(item, ["description", "Description", "notes", "Notes"])),
        notes: cleanText(valueFrom(item, ["notes", "Notes", "description", "Description"])),
        image_url: cleanText(valueFrom(item, ["image_url", "Image URL"], "")),
        cleaned_image_url: cleanText(valueFrom(item, ["cleaned_image_url", "Cleaned Image URL"], "")),
        is_featured: Boolean(valueFrom(item, ["is_featured", "Featured"], false)),
    };
}

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    const url = new URL(request.url);
    const adminClientId = url.searchParams.get("clientId");

    if (role === "partner") {
        return NextResponse.json({ error: "Partners can only access inventory from assigned tasks." }, { status: 403 });
    }

    let query = userSupabase.from("products").select("*").order("updated_at", { ascending: false });
    if (role !== "admin") {
        query = query.eq("user_id", user.id);
    } else if (adminClientId) {
        query = query.eq("user_id", adminClientId);
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message || "Could not load products." }, { status: 500 });
    }

    return NextResponse.json({ products: data || [], role });
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners can only update inventory from assigned tasks." }, { status: 403 });
    }

    const body = await request.json();
    const clientId = role === "admin" && body.client_id ? body.client_id : user.id;
    const incoming = Array.isArray(body.products) ? body.products : [body];
    let rows = incoming.map((item, index) => serializeProduct(item, clientId, index + 1));
    const invalid = rows.find((row) => !row.product_name);

    if (invalid) {
        return NextResponse.json({ error: "Every product needs a Product Name." }, { status: 400 });
    }

    try {
        rows = await Promise.all(rows.map((row) => publicProductImageFields(row, { userId: clientId })));
    } catch (imageError) {
        return NextResponse.json({ error: imageError.message || "Could not upload product images." }, { status: 500 });
    }

    const { data, error } = await userSupabase
        .from("products")
        .insert(rows)
        .select("*");

    if (error) {
        return NextResponse.json({ error: error.message || "Could not save products." }, { status: 500 });
    }

    const logs = (data || []).map((product) => ({
        product_id: product.id,
        client_id: product.client_id,
        action: "created",
        old_stock: 0,
        new_stock: product.stock || 0,
        old_price: null,
        new_price: product.price || 0,
        note: "Product added to ORVA inventory.",
    }));

    if (logs.length) {
        await userSupabase.from("inventory_logs").insert(logs);
    }

    let updateTaskWarning = "";
    const dynamicSync = [];
    try {
        await insertUpdateTasks(userSupabase, (data || []).flatMap(tasksForNewProduct));
    } catch (taskError) {
        updateTaskWarning = taskError.message || "Update tasks could not be created.";
    }

    try {
        const syncSupabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : userSupabase;
        for (const product of data || []) {
            dynamicSync.push(await runDynamicProductSync(syncSupabase, {
                userId: product.user_id || product.client_id || clientId,
                before: null,
                after: product,
            }));
        }
    } catch (syncError) {
        updateTaskWarning = [updateTaskWarning, syncError.message || "Dynamic channel sync could not run."].filter(Boolean).join(" ");
    }

    return NextResponse.json({ products: data || [], update_task_warning: updateTaskWarning, dynamic_sync: dynamicSync }, { status: 201 });
}
