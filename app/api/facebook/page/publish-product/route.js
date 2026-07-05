import { NextResponse } from "next/server";
import { publishProductToFacebookPage } from "../../../../lib/facebookPage";
import { requireActiveSubscription } from "../../../../lib/onboarding";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { nowISTISOString } from "../../../../lib/istDate";

function cleanProductId(value) {
    return String(value || "").trim();
}

async function saveExport(supabase, values) {
    const { data, error } = await supabase
        .from("social_exports")
        .insert(values)
        .select("id, product_id, channel, status, external_post_id, error_message, created_at")
        .single();
    if (error) throw error;
    return data;
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before publishing to Facebook Page." }, { status: 503 });
    }
    const access = await requireActiveSubscription(user.id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status || 403 });

    const body = await request.json().catch(() => ({}));
    const productId = cleanProductId(body.productId);
    const caption = String(body.caption || body.copy || "").trim();
    if (!productId) return NextResponse.json({ error: "Choose a product to publish." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
    if (productError) return NextResponse.json({ error: productError.message || "Could not load product." }, { status: 500 });
    if (!product || (product.user_id || product.client_id) !== user.id) {
        return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    const { data: connection, error: connectionError } = await supabase
        .from("social_connections")
        .select("external_account_id, access_token, status")
        .eq("user_id", user.id)
        .eq("channel", "facebook")
        .maybeSingle();
    if (connectionError) return NextResponse.json({ error: connectionError.message || "Could not load Facebook connection." }, { status: 500 });
    if (!mockMode && connection?.status !== "connected") {
        return NextResponse.json({ error: "Connect your Facebook Page before publishing a product." }, { status: 400 });
    }

    try {
        const result = await publishProductToFacebookPage({ product, connection, mockMode, caption });
        const socialExport = await saveExport(supabase, {
            user_id: user.id,
            product_id: product.id,
            channel: "facebook_page",
            status: "published",
            external_post_id: result.externalPostId,
            error_message: null,
        });
        await supabase
            .from("products")
            .update({
                last_promoted_at: nowISTISOString(),
                promotion_count: Number(product.promotion_count || 0) + 1,
                updated_at: nowISTISOString(),
            })
            .eq("id", product.id);
        return NextResponse.json({
            message: result.warning || "Product published to Facebook Page successfully.",
            warning: result.warning || null,
            export: socialExport,
        }, { status: 201 });
    } catch (error) {
        let socialExport;
        try {
            socialExport = await saveExport(supabase, {
                user_id: user.id,
                product_id: product.id,
                channel: "facebook_page",
                status: "failed",
                external_post_id: null,
                error_message: error.message || "Could not publish product.",
            });
        } catch {
            return NextResponse.json({
                error: `${error.message || "Could not publish product."} Run scripts/orva-facebook-page-export.sql in Supabase if social_exports is not installed.`,
            }, { status: 500 });
        }
        return NextResponse.json({ error: error.message || "Could not publish product.", export: socialExport }, { status: 502 });
    }
}
