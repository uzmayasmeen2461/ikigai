import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { nowISTISOString } from "../../../lib/istDate";

const openStatuses = ["pending", "assigned", "started", "in_progress", "completed", "payout_generated", "payout_paid", "payment_confirmed"];

function cleanText(value, fallback = "") {
    return String(value || fallback).trim();
}

function profileName(profile = {}, user = {}) {
    return cleanText(profile.name || profile.full_name || user.user_metadata?.name || user.email, "Client");
}

function businessName(profile = {}) {
    return cleanText(profile.business_name || profile.company_name || profile.shop_name || profile.name, "ORVA Client Business");
}

async function writeLog(supabase, { taskId, actorId, note, metadata }) {
    const { error } = await supabase.from("task_activity_logs").insert({
        task_id: taskId,
        actor_id: actorId,
        actor_role: "client",
        action: "client_requested_whatsapp_catalog",
        from_status: null,
        to_status: "pending",
        note,
        metadata,
    });
    if (error) {
        const message = String(error.message || error.details || "");
        if (!message.includes("does not exist") && !message.includes("schema cache")) throw error;
    }
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const requestedProductIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];
    const note = cleanText(body.note);

    const supabase = createSupabaseAdmin();
    const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    const role = String(profile?.role || "client").toLowerCase();
    if (role !== "client") {
        return NextResponse.json({ error: "Only clients can request WhatsApp catalog publishing from this page." }, { status: 403 });
    }

    const { data: existingTask, error: existingError } = await supabase
        .from("update_tasks")
        .select("id, status, title")
        .eq("user_id", user.id)
        .eq("channel", "whatsapp_catalog")
        .eq("task_type", "catalog_setup")
        .in("status", openStatuses)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingError) {
        const message = String(existingError.message || existingError.details || "");
        if (message.includes("does not exist") || message.includes("schema cache")) {
            return NextResponse.json({ error: "Run scripts/orva-specialist-operations.sql in Supabase before requesting WhatsApp catalog setup." }, { status: 500 });
        }
        return NextResponse.json({ error: existingError.message || "Could not check existing WhatsApp request." }, { status: 500 });
    }

    if (existingTask) {
        return NextResponse.json({
            message: "A WhatsApp catalog request is already in the admin queue.",
            task: existingTask,
        });
    }

    const productQuery = supabase
        .from("products")
        .select("id, product_name, name, product_code, sku, price, stock, image_url, cleaned_image_url")
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`);
    const { data: products } = await productQuery;
    const selectedProducts = requestedProductIds.length
        ? (products || []).filter((product) => requestedProductIds.includes(product.id))
        : (products || []);

    if (!selectedProducts.length) {
        return NextResponse.json({ error: "Add products before requesting WhatsApp catalog publishing." }, { status: 400 });
    }

    const missingImages = selectedProducts.filter((product) => !(product.cleaned_image_url || product.image_url)).length;
    const missingPrices = selectedProducts.filter((product) => !Number(product.price || 0)).length;
    const scopeText = requestedProductIds.length ? `${selectedProducts.length} selected products` : `${selectedProducts.length} inventory products`;
    const now = nowISTISOString();
    const metadata = {
        requested_product_ids: selectedProducts.map((product) => product.id),
        selected_only: Boolean(requestedProductIds.length),
        product_count: selectedProducts.length,
        missing_images: missingImages,
        missing_prices: missingPrices,
    };

    const payload = {
        user_id: user.id,
        product_id: null,
        channel: "whatsapp_catalog",
        task_type: "catalog_setup",
        title: "Publish inventory to WhatsApp catalog",
        description: `Client requested WhatsApp catalog setup for ${scopeText}.`,
        instructions: [
            "Review the client's ORVA products.",
            "Prepare product images, names, prices, and descriptions for WhatsApp Business catalog.",
            "Add/update items manually in the client's WhatsApp Business catalog.",
            "Add a note with what was completed before marking the task complete.",
        ].join("\n"),
        client_name: profileName(profile || {}, user),
        client_business_name: businessName(profile || {}),
        client_email: cleanText(profile?.email || user.email).toLowerCase(),
        client_phone: cleanText(profile?.phone),
        priority: "high",
        status: "pending",
        assigned_to: null,
        payout_status: "not_generated",
        old_value: {},
        new_value: metadata,
        admin_notes: note,
        created_at: now,
        updated_at: now,
    };

    const { data: task, error } = await supabase.from("update_tasks").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: error.message || "Could not create WhatsApp catalog request." }, { status: 500 });

    await writeLog(supabase, {
        taskId: task.id,
        actorId: user.id,
        note: note || "Client requested WhatsApp catalog publishing.",
        metadata,
    });

    return NextResponse.json({
        message: "WhatsApp catalog request sent to admin. ORVA will assign it to a specialist.",
        task,
    }, { status: 201 });
}
