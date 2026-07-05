import { publishProductToFacebookPage } from "./facebookPage";
import { publishProductToInstagram } from "./instagramPublishing";
import { requireActiveSubscription } from "./onboarding";
import { publicProductImageFields } from "./productImageStorage";
import { nowISTISOString } from "./istDate";

async function saveSocialExport(supabase, values) {
    const { data, error } = await supabase.from("social_exports").insert(values).select("*").single();
    if (error) throw error;
    return data;
}

async function loadProductForItem(supabase, userId, productId) {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
    if (error) throw error;
    if (!data || (data.user_id || data.client_id) !== userId) return null;
    return data;
}

export async function publishGrowthAutopilotItem({ supabase, userId, item }) {
    if (!item.product_id) {
        throw new Error("This autopilot item is not linked to a product yet.");
    }

    const access = await requireActiveSubscription(userId);
    if (!access.ok) throw new Error(access.error || "Active subscription is required before publishing.");

    const product = await loadProductForItem(supabase, userId, item.product_id);
    if (!product) throw new Error("Product not found.");

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    let result;
    let publishProduct = product;

    if (item.channel === "instagram") {
        publishProduct = await publicProductImageFields(product, {
            userId,
            productId: product.id,
        });
        if (publishProduct.image_url !== product.image_url || publishProduct.cleaned_image_url !== product.cleaned_image_url) {
            await supabase
                .from("products")
                .update({
                    image_url: publishProduct.image_url,
                    cleaned_image_url: publishProduct.cleaned_image_url,
                    updated_at: nowISTISOString(),
                })
                .eq("id", product.id);
        }

        const { data: connection } = await supabase
            .from("social_connections")
            .select("external_account_id, access_token, status")
            .eq("user_id", userId)
            .eq("channel", "instagram")
            .maybeSingle();
        if (!mockMode && connection?.status !== "connected") throw new Error("Connect Instagram Business before publishing.");
        result = await publishProductToInstagram({ product: publishProduct, connection, mockMode, caption: item.caption });
        await saveSocialExport(supabase, {
            user_id: userId,
            product_id: product.id,
            channel: "instagram",
            status: "published",
            external_post_id: result.externalPostId,
            error_message: null,
        });
    } else if (item.channel === "facebook_page") {
        const { data: connection } = await supabase
            .from("social_connections")
            .select("external_account_id, access_token, status")
            .eq("user_id", userId)
            .eq("channel", "facebook")
            .maybeSingle();
        if (!mockMode && connection?.status !== "connected") throw new Error("Connect your Facebook Page before publishing.");
        result = await publishProductToFacebookPage({ product, connection, mockMode, caption: item.caption });
        await saveSocialExport(supabase, {
            user_id: userId,
            product_id: product.id,
            channel: "facebook_page",
            status: "published",
            external_post_id: result.externalPostId,
            error_message: null,
        });
    } else {
        throw new Error("This item is manual for now. Copy the message and complete it outside ORVA.");
    }

    await supabase
        .from("products")
        .update({
            last_promoted_at: nowISTISOString(),
            promotion_count: Number(product.promotion_count || 0) + 1,
            updated_at: nowISTISOString(),
        })
        .eq("id", product.id);

    const { data: updated, error } = await supabase
        .from("growth_autopilot_items")
        .update({
            status: "published",
            published_at: nowISTISOString(),
            external_post_id: result.externalPostId || result.externalProductId || null,
            error_message: null,
            updated_at: nowISTISOString(),
        })
        .eq("id", item.id)
        .eq("user_id", userId)
        .select("*")
        .single();
    if (error) throw error;
    return updated;
}

export async function publishDueGrowthAutopilotItems(supabase, limit = 5) {
    const { data: items, error } = await supabase
        .from("growth_autopilot_items")
        .select("*")
        .eq("posting_mode", "auto_post")
        .eq("automation_paused", false)
        .eq("status", "scheduled")
        .lte("scheduled_for", nowISTISOString())
        .order("scheduled_for", { ascending: true })
        .limit(limit);

    if (error) {
        if (error.code === "42P01" || error.code === "42703") return [];
        throw error;
    }

    const results = [];
    for (const item of items || []) {
        try {
            const updated = await publishGrowthAutopilotItem({ supabase, userId: item.user_id, item });
            results.push({ id: item.id, status: "published", item: updated });
        } catch (publishError) {
            await supabase
                .from("growth_autopilot_items")
                .update({
                    status: "failed",
                    error_message: publishError.message || "Could not auto-publish item.",
                    updated_at: nowISTISOString(),
                })
                .eq("id", item.id);
            results.push({ id: item.id, status: "failed", error: publishError.message || "Could not auto-publish item." });
        }
    }

    return results;
}
