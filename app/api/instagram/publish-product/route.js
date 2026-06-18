import { NextResponse } from "next/server";
import { publishProductToInstagram } from "../../../lib/instagramPublishing";
import { requireActiveSubscription } from "../../../lib/onboarding";
import { publicProductImageFields } from "../../../lib/productImageStorage";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

async function saveExport(supabase, values) {
    const { data, error } = await supabase.from("social_exports").insert(values).select("*").single();
    if (error) throw error;
    return data;
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before publishing to Instagram." }, { status: 503 });
    const access = await requireActiveSubscription(user.id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status || 403 });

    const body = await request.json().catch(() => ({}));
    const { productId } = body;
    const caption = String(body.caption || body.copy || "").trim();
    if (!productId) return NextResponse.json({ error: "Choose a product to publish." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    const { data: product } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
    if (!product || (product.user_id || product.client_id) !== user.id) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    let publishProduct = product;

    try {
        publishProduct = await publicProductImageFields(product, {
            userId: product.user_id || product.client_id || user.id,
            productId: product.id,
        });
        if (publishProduct.image_url !== product.image_url || publishProduct.cleaned_image_url !== product.cleaned_image_url) {
            await supabase
                .from("products")
                .update({
                    image_url: publishProduct.image_url,
                    cleaned_image_url: publishProduct.cleaned_image_url,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", product.id);
        }
    } catch (imageError) {
        return NextResponse.json({ error: imageError.message || "Could not prepare product image for Instagram." }, { status: 500 });
    }

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    const { data: connection } = await supabase
        .from("social_connections")
        .select("external_account_id, access_token, status")
        .eq("user_id", user.id)
        .eq("channel", "instagram")
        .maybeSingle();
    if (!mockMode && connection?.status !== "connected") return NextResponse.json({ error: "Connect Instagram Business before publishing." }, { status: 400 });

    try {
        const result = await publishProductToInstagram({ product: publishProduct, connection, mockMode, caption });
        const socialExport = await saveExport(supabase, {
            user_id: user.id,
            product_id: product.id,
            channel: "instagram",
            status: "published",
            external_post_id: result.externalPostId,
            error_message: null,
        });
        await supabase
            .from("products")
            .update({
                last_promoted_at: new Date().toISOString(),
                promotion_count: Number(product.promotion_count || 0) + 1,
                updated_at: new Date().toISOString(),
            })
            .eq("id", product.id);
        return NextResponse.json({ message: "Product published to Instagram successfully.", export: socialExport }, { status: 201 });
    } catch (error) {
        try {
            await saveExport(supabase, {
                user_id: user.id,
                product_id: product.id,
                channel: "instagram",
                status: "failed",
                external_post_id: null,
                error_message: error.message,
            });
        } catch {}
        return NextResponse.json({ error: error.message || "Could not publish to Instagram." }, { status: 502 });
    }
}
