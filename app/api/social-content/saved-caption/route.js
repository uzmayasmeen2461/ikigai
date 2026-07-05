import { NextResponse } from "next/server";
import {
    createSupabaseServiceRole,
    createSupabaseUserClient,
    getAuthenticatedUser,
    hasSupabaseServiceRoleKey,
} from "../../../lib/supabaseServer";
import { productName } from "../../../lib/inventory";
import { nowISTISOString } from "../../../lib/istDate";

const allowedChannels = new Set(["facebook", "facebook_page", "instagram", "whatsapp"]);

function normalizeChannel(channel = "facebook") {
    const value = String(channel || "facebook").trim();
    return value === "facebook_page" ? "facebook" : value;
}

function copyFromOutput(output = {}, channel = "facebook") {
    if (channel === "instagram") {
        return [output.instagram_caption, output.instagram_hashtags].filter(Boolean).join("\n").trim();
    }
    if (channel === "whatsapp") return String(output.whatsapp_description || "").trim();
    return String(output.facebook_description || "").trim();
}

function fieldsForChannel(product = {}, channel = "facebook", copy = "") {
    if (channel === "instagram") {
        return {
            instagram_caption: copy,
            instagram_hashtags: "",
        };
    }
    if (channel === "whatsapp") {
        return {
            whatsapp_title: productName(product),
            whatsapp_description: copy,
        };
    }
    return {
        facebook_title: productName(product),
        facebook_description: copy,
        facebook_category: product.category || "",
    };
}

function writeClient() {
    return hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : null;
}

async function loadOwnedProduct(supabase, productId, userId) {
    const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

    if (error) return { error };
    if (!product || (product.user_id || product.client_id) !== userId) {
        return { notFound: true };
    }
    return { product };
}

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const url = new URL(request.url);
    const productId = String(url.searchParams.get("productId") || "").trim();
    const channel = normalizeChannel(url.searchParams.get("channel"));

    if (!productId) return NextResponse.json({ error: "Choose a product first." }, { status: 400 });
    if (!allowedChannels.has(channel)) return NextResponse.json({ error: "Unsupported channel." }, { status: 400 });

    const supabase = createSupabaseUserClient(token);
    const owned = await loadOwnedProduct(supabase, productId, user.id);
    if (owned.error) return NextResponse.json({ error: owned.error.message || "Could not load product." }, { status: 500 });
    if (owned.notFound) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const { data, error } = await supabase
        .from("product_content_outputs")
        .select("*")
        .eq("product_id", productId)
        .eq("client_id", user.id)
        .is("task_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message || "Could not load saved caption." }, { status: 500 });
    }

    return NextResponse.json({ output: data || null, copy: copyFromOutput(data || {}, channel) });
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || "").trim();
    const channel = normalizeChannel(body.channel);
    const copy = String(body.copy || body.caption || "").trim();

    if (!productId) return NextResponse.json({ error: "Choose a product first." }, { status: 400 });
    if (!allowedChannels.has(channel)) return NextResponse.json({ error: "Unsupported channel." }, { status: 400 });
    if (!copy) return NextResponse.json({ error: "Write or generate a caption before saving." }, { status: 400 });

    const userSupabase = createSupabaseUserClient(token);
    const owned = await loadOwnedProduct(userSupabase, productId, user.id);
    if (owned.error) return NextResponse.json({ error: owned.error.message || "Could not load product." }, { status: 500 });
    if (owned.notFound) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const supabase = writeClient();
    if (!supabase) {
        return NextResponse.json({
            error: "Saving captions needs SUPABASE_SERVICE_ROLE_KEY on the server, or a client insert/update RLS policy for product_content_outputs.",
        }, { status: 500 });
    }

    const { data: existing, error: existingError } = await supabase
        .from("product_content_outputs")
        .select("*")
        .eq("product_id", productId)
        .eq("client_id", user.id)
        .is("task_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingError) {
        return NextResponse.json({
            error: `${existingError.message || "Could not load saved caption."} Run scripts/orva-inventory.sql if product_content_outputs is missing.`,
        }, { status: 500 });
    }

    const values = {
        product_id: productId,
        client_id: user.id,
        task_id: null,
        status: "draft",
        created_by: user.id,
        updated_at: nowISTISOString(),
        ...fieldsForChannel(owned.product, channel, copy),
    };

    const query = existing?.id
        ? supabase.from("product_content_outputs").update(values).eq("id", existing.id).select("*").single()
        : supabase.from("product_content_outputs").insert(values).select("*").single();

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({
            error: `${error.message || "Could not save caption."} Run scripts/orva-inventory.sql if product_content_outputs is missing.`,
        }, { status: 500 });
    }

    return NextResponse.json({ output: data, copy: copyFromOutput(data, channel), message: "Caption saved for this product." });
}
