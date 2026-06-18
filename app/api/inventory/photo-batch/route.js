import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { cleanText, generateProductCode, normalizeInventoryStatus } from "../../../lib/inventory";
import { publicProductImageFields } from "../../../lib/productImageStorage";

function titleFromFilename(filename = "", index = 1) {
    const baseName = cleanText(filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "));
    if (!baseName) return `Photo Product ${index}`;

    return baseName
        .split(" ")
        .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : "")
        .join(" ");
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const photos = Array.isArray(body.photos)
        ? body.photos
            .filter((photo) => photo?.url)
            .slice(0, 20)
            .map((photo) => ({
                name: String(photo.name || "Product photo").trim(),
                url: photo.url,
                price: Number(photo.price),
            }))
        : [];
    if (!photos.length) {
        return NextResponse.json({ error: "Upload at least one product or shelf photo." }, { status: 400 });
    }
    const missingPrice = photos.find((photo) => !(Number(photo.price) > 0));
    if (missingPrice) {
        return NextResponse.json({ error: "Enter a valid price for every uploaded photo before creating inventory." }, { status: 400 });
    }

    const supabase = createSupabaseUserClient(token);
    const clientName = user.user_metadata?.full_name || user.email?.split("@")[0] || "ORVA Client";
    const priceNotes = photos
        .map((photo, index) => `${index + 1}. ${photo.name}: ₹${photo.price}`)
        .join("\n");

    let productRows = photos.map((photo, index) => {
        const productName = titleFromFilename(photo.name, index + 1);
        const productCode = generateProductCode(productName, index + 1);

        return {
            user_id: user.id,
            client_id: user.id,
            name: productName,
            product_name: productName,
            category: "Photo upload",
            sku: productCode,
            product_code: productCode,
            price: Math.round(Number(photo.price)),
            stock: 1,
            status: normalizeInventoryStatus(1),
            description: "Draft product created from uploaded photo and price.",
            notes: "Confirm product name, category, and stock before publishing.",
            image_url: photo.url,
            cleaned_image_url: photo.url,
            is_featured: false,
        };
    });

    try {
        productRows = await Promise.all(productRows.map((row) => publicProductImageFields(row, { userId: user.id })));
    } catch (imageError) {
        return NextResponse.json({ error: imageError.message || "Could not upload product photos." }, { status: 500 });
    }

    const { data: products, error: productError } = await supabase
        .from("products")
        .insert(productRows)
        .select("*");

    if (productError) {
        return NextResponse.json({ error: productError.message || "Could not create products from photos." }, { status: 500 });
    }

    const productLogs = (products || []).map((product) => ({
        product_id: product.id,
        client_id: user.id,
        action: "created_from_photo",
        old_stock: 0,
        new_stock: product.stock || 0,
        old_price: null,
        new_price: product.price || 0,
        note: "Draft product created from uploaded photo and price.",
    }));

    if (productLogs.length) {
        await supabase.from("inventory_logs").insert(productLogs);
    }

    const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
            title: "Convert product photos to inventory",
            description: [
                "Client uploaded product or shelf photos. Convert them into inventory product rows.",
                `Photo prices:\n${priceNotes}`,
            ].filter(Boolean).join("\n\n"),
            service_type: "inventory_photo_conversion",
            client_id: user.id,
            client_email: user.email,
            client_name: clientName,
            payment_status: "paid",
            status: "needs_admin_assignment",
            base_amount: 0,
            gst_percent: 0,
            gst_amount: 0,
            platform_fee: 0,
            total_amount: 0,
        })
        .select("*")
        .single();

    if (taskError) {
        return NextResponse.json({
            products: products || [],
            warning: taskError.message || "Products were created, but the conversion task could not be created.",
        }, { status: 201 });
    }

    const { data: batch, error: batchError } = await supabase
        .from("inventory_photo_batches")
        .insert({
            client_id: user.id,
            task_id: task.id,
            photos,
            status: "pending_conversion",
        })
        .select("*")
        .single();

    if (batchError) {
        return NextResponse.json({
            products: products || [],
            task,
            warning: batchError.message || "Products were created, but the photo batch could not be saved.",
        }, { status: 201 });
    }

    return NextResponse.json({ products: products || [], task, batch }, { status: 201 });
}
