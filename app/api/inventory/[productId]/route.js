import { NextResponse } from "next/server";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";
import {
    cleanText,
    normalizeInventoryStatus,
    toInteger,
} from "../../../lib/inventory";
import { changeLogsForProduct, insertUpdateTasks, tasksForProductChanges } from "../../../lib/updateTasks";
import { runDynamicProductSync } from "../../../lib/dynamicProductSync";
import { publicProductMediaFields } from "../../../lib/productImageStorage";
import { nowISTISOString } from "../../../lib/istDate";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function getProductOrResponse(supabase, productId, userId, role) {
    const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

    if (error) {
        return { response: NextResponse.json({ error: error.message || "Could not load product." }, { status: 500 }) };
    }

    if (!product) {
        return { response: NextResponse.json({ error: "Product not found." }, { status: 404 }) };
    }

    if (role !== "admin" && (product.user_id || product.client_id) !== userId) {
        return { response: NextResponse.json({ error: "You cannot access this product." }, { status: 403 }) };
    }

    return { product };
}

async function writeLog(supabase, product, action, patch, note = "") {
    const oldStock = Number(product.stock || 0);
    const newStock = patch.stock ?? oldStock;
    const oldPrice = Number(product.price || 0);
    const newPrice = patch.price ?? oldPrice;

    await supabase.from("inventory_logs").insert({
        product_id: product.id,
        client_id: product.client_id || product.user_id,
        action,
        old_stock: oldStock,
        new_stock: newStock,
        old_price: oldPrice,
        new_price: newPrice,
        note,
    });
}

export async function GET(request, { params }) {
    const { productId } = await params;
    if (!uuidPattern.test(productId || "")) {
        return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
    }

    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners can only access inventory from assigned tasks." }, { status: 403 });
    }

    const { product, response } = await getProductOrResponse(userSupabase, productId, user.id, role);
    if (response) return response;

    const { data: logs } = await userSupabase
        .from("inventory_logs")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });

    return NextResponse.json({ product, logs: logs || [] });
}

export async function PATCH(request, { params }) {
    const { productId } = await params;
    if (!uuidPattern.test(productId || "")) {
        return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
    }

    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners can only update inventory from assigned tasks." }, { status: 403 });
    }

    const { product, response } = await getProductOrResponse(userSupabase, productId, user.id, role);
    if (response) return response;

    const body = await request.json();
    const action = body.action || "update";
    const patch = {};
    let note = cleanText(body.note);

    if (action === "mark_sold") {
        const currentStock = Number(product.stock || 0);
        if (currentStock <= 0) {
            return NextResponse.json({ error: "Stock is already 0." }, { status: 400 });
        }
        patch.stock = currentStock - 1;
        note ||= "Marked one product sold.";
    } else if (action === "add_stock") {
        const quantity = Math.max(1, toInteger(body.quantity, 1));
        patch.stock = Number(product.stock || 0) + quantity;
        note ||= `Added ${quantity} product(s).`;
    } else if (action === "mark_out_of_stock") {
        patch.stock = 0;
        patch.status = "out_of_stock";
        note ||= "Marked out of stock.";
    } else {
        if ("product_name" in body || "name" in body) {
            patch.name = cleanText(body.product_name || body.name);
            patch.product_name = patch.name;
        }
        if ("product_code" in body || "sku" in body) {
            patch.sku = cleanText(body.product_code || body.sku).toUpperCase();
            patch.product_code = patch.sku;
        }
        if ("category" in body) patch.category = cleanText(body.category);
        if ("price" in body) patch.price = Math.max(0, toInteger(body.price));
        if ("stock" in body || "stock_quantity" in body) patch.stock = Math.max(0, toInteger(body.stock ?? body.stock_quantity));
        if ("status" in body) patch.status = body.status;
        if ("notes" in body || "description" in body) {
            patch.description = cleanText(body.notes || body.description);
            patch.notes = patch.description;
        }
        if ("image_url" in body) patch.image_url = cleanText(body.image_url);
        if ("cleaned_image_url" in body) patch.cleaned_image_url = cleanText(body.cleaned_image_url);
        if ("is_featured" in body) patch.is_featured = Boolean(body.is_featured);
        if ("reel_video_url" in body) patch.reel_video_url = cleanText(body.reel_video_url);
        if ("reel_thumbnail_url" in body) patch.reel_thumbnail_url = cleanText(body.reel_thumbnail_url);
        if ("reel_hook" in body) patch.reel_hook = cleanText(body.reel_hook);
        if ("reel_caption" in body) patch.reel_caption = String(body.reel_caption || "").trim();
        if ("reel_hashtags" in body) patch.reel_hashtags = cleanText(body.reel_hashtags);
        if ("reel_cta" in body) patch.reel_cta = cleanText(body.reel_cta);
        if ("reel_status" in body) patch.reel_status = cleanText(body.reel_status) || "draft";
        note ||= "Product updated.";
    }

    const nextStock = patch.stock ?? product.stock ?? 0;
    patch.status = normalizeInventoryStatus(nextStock, patch.status ?? product.status);
    patch.updated_at = nowISTISOString();

    try {
        const imagePatch = await publicProductMediaFields(patch, {
            userId: product.user_id || product.client_id || user.id,
            productId: product.id,
        });
        Object.assign(patch, imagePatch);
    } catch (imageError) {
        return NextResponse.json({ error: imageError.message || "Could not upload product image." }, { status: 500 });
    }

    const { data, error } = await userSupabase
        .from("products")
        .update(patch)
        .eq("id", product.id)
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message || "Could not update product." }, { status: 500 });
    }

    await writeLog(userSupabase, product, action, patch, note);

    let updateTaskWarning = "";
    let dynamic_sync = null;
    try {
        const changes = changeLogsForProduct(product, data);
        if (changes.length) await userSupabase.from("product_change_logs").insert(changes);
        await insertUpdateTasks(userSupabase, tasksForProductChanges(product, data));
    } catch (taskError) {
        updateTaskWarning = taskError.message || "Update tasks could not be created.";
    }

    try {
        const syncSupabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : userSupabase;
        dynamic_sync = await runDynamicProductSync(syncSupabase, {
            userId: data.user_id || data.client_id || user.id,
            before: product,
            after: data,
        });
    } catch (syncError) {
        updateTaskWarning = [updateTaskWarning, syncError.message || "Dynamic channel sync could not run."].filter(Boolean).join(" ");
    }

    return NextResponse.json({ product: data, update_task_warning: updateTaskWarning, dynamic_sync });
}

export async function DELETE(request, { params }) {
    const { productId } = await params;
    if (!uuidPattern.test(productId || "")) {
        return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
    }

    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const userSupabase = createSupabaseUserClient(token);
    const role = await getRole(userSupabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners can only update inventory from assigned tasks." }, { status: 403 });
    }

    const { product, response } = await getProductOrResponse(userSupabase, productId, user.id, role);
    if (response) return response;

    await writeLog(userSupabase, product, "deleted", { stock: 0, price: product.price || 0 }, "Product deleted from inventory.");

    const { error } = await userSupabase
        .from("products")
        .delete()
        .eq("id", product.id);

    if (error) {
        return NextResponse.json({ error: error.message || "Could not delete product." }, { status: 500 });
    }

    return NextResponse.json({ success: true, product_id: product.id });
}
