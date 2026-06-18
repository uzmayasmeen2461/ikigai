import { NextResponse } from "next/server";
import { publishProductReelToInstagram } from "../../../../lib/instagramPublishing";
import { requireActiveSubscription } from "../../../../lib/onboarding";
import { publicProductMediaFields } from "../../../../lib/productImageStorage";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";

async function saveExport(supabase, values) {
    const { data, error } = await supabase.from("social_exports").insert(values).select("*").single();
    if (!error) return data;

    const message = String(error.message || "");
    if (message.includes("client_id") || message.includes("content_type")) {
        const { client_id, content_type, ...fallbackValues } = values;
        const { data: fallbackData, error: fallbackError } = await supabase.from("social_exports").insert(fallbackValues).select("*").single();
        if (fallbackError) throw fallbackError;
        return fallbackData;
    }

    throw error;
}

function reelLimitFor(subscription = {}) {
    const packageText = `${subscription.packages?.slug || ""} ${subscription.packages?.name || ""}`.toLowerCase();
    if (packageText.includes("managed")) return 40;
    if (packageText.includes("growth")) return 20;
    return 5;
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before publishing Instagram Reels." }, { status: 503 });

    const access = await requireActiveSubscription(user.id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status || 403 });
    const reelLimit = reelLimitFor(access.subscription);

    const body = await request.json().catch(() => ({}));
    const productId = body.productId;
    const reel = body.reel || {};
    const caption = String(body.caption || "").trim();
    if (!productId && !reel.reel_video_url) return NextResponse.json({ error: "Upload or create a reel video before publishing." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { count: publishedReelCount } = await supabase
        .from("social_exports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("channel", "instagram_reel")
        .eq("status", "published")
        .gte("created_at", monthStart.toISOString());

    if ((publishedReelCount || 0) >= reelLimit) {
        return NextResponse.json({ error: "Reel Content Studio is available in Growth and Managed plans for higher monthly limits. Your current monthly reel limit has been reached." }, { status: 402 });
    }

    let product = {
        id: null,
        user_id: user.id,
        client_id: user.id,
        product_name: reel.name || "ORVA Reel",
        name: reel.name || "ORVA Reel",
        price: reel.price || 0,
        reel_video_url: reel.reel_video_url,
        reel_hook: reel.reel_hook,
        reel_caption: reel.reel_caption,
        reel_hashtags: reel.reel_hashtags,
        reel_cta: reel.reel_cta,
    };
    if (productId) {
        const { data: productRow } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
        if (!productRow || (productRow.user_id || productRow.client_id) !== user.id) return NextResponse.json({ error: "Product not found." }, { status: 404 });
        product = productRow;
    }
    if (!product.reel_video_url) return NextResponse.json({ error: "Upload a product video before publishing a Reel." }, { status: 400 });
    let publishProduct = product;

    try {
        publishProduct = await publicProductMediaFields(product, {
            userId: product.user_id || product.client_id || user.id,
            productId: product.id || `standalone-reel-${Date.now()}`,
        });
        if (product.id && publishProduct.reel_video_url !== product.reel_video_url) {
            await supabase
                .from("products")
                .update({ reel_video_url: publishProduct.reel_video_url, updated_at: new Date().toISOString() })
                .eq("id", product.id);
        }
    } catch (mediaError) {
        return NextResponse.json({ error: mediaError.message || "Could not prepare reel video for Instagram." }, { status: 500 });
    }

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    const { data: connection } = await supabase
        .from("social_connections")
        .select("external_account_id, access_token, status")
        .eq("user_id", user.id)
        .eq("channel", "instagram")
        .maybeSingle();

    if (!mockMode && connection?.status !== "connected") {
        return NextResponse.json({ error: "Connect Instagram Business before publishing a Reel." }, { status: 400 });
    }

    try {
        const result = await publishProductReelToInstagram({ product: publishProduct, connection, mockMode, caption });
        let socialExport = null;
        let warning = "";
        try {
            socialExport = await saveExport(supabase, {
                user_id: user.id,
                client_id: user.id,
                product_id: product.id || null,
                channel: "instagram_reel",
                content_type: "reel",
                status: "published",
                external_post_id: result.externalPostId,
                error_message: null,
            });
        } catch (trackingError) {
            warning = `Instagram Reel was published, but ORVA could not save the export record. Run scripts/orva-reel-content-studio.sql in Supabase. ${trackingError.message || ""}`.trim();
        }
        if (product.id) await supabase.from("products").update({ reel_status: "published", updated_at: new Date().toISOString() }).eq("id", product.id);
        return NextResponse.json({ message: "Instagram Reel published successfully.", export: socialExport, warning }, { status: 201 });
    } catch (error) {
        try {
            await saveExport(supabase, {
                user_id: user.id,
                client_id: user.id,
                product_id: product.id || null,
                channel: "instagram_reel",
                content_type: "reel",
                status: "failed",
                external_post_id: null,
                error_message: error.message,
            });
            if (product.id) await supabase.from("products").update({ reel_status: "failed", updated_at: new Date().toISOString() }).eq("id", product.id);
        } catch {}
        return NextResponse.json({
            error: error.message || "Instagram Reel publishing requires an Instagram Business/Creator account connected to a Facebook Page and proper Meta permissions. You can still copy the caption and publish manually.",
        }, { status: 502 });
    }
}
