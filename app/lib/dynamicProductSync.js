import {
    buildFacebookPageUpdateCaption,
    buildInstagramUpdateCaption,
    buildWhatsAppText,
    describeProductChange,
    productName,
} from "./inventory";
import { publishProductToFacebookPage } from "./facebookPage";
import { publishProductToInstagram } from "./instagramPublishing";
import { getClientSubscription } from "./onboarding";
import { nowISTISOString } from "./istDate";

function isMissingTable(error = {}) {
    const message = String(error.message || error.details || "");
    return error.code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

function autoPublishSocialUpdates() {
    return process.env.ORVA_AUTO_PUBLISH_SOCIAL_UPDATES === "true";
}

function metaMockMode() {
    return process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
}

function shouldCreateSocialUpdate(change) {
    return ["new_product", "out_of_stock", "back_in_stock", "price_update", "product_update"].includes(change.type);
}

function taskStatusFromSync(result) {
    if (!result) return "pending";
    return result.ok ? "completed" : "failed";
}

async function insertSocialExport(supabase, values) {
    const { error } = await supabase.from("social_exports").insert({
        ...values,
        created_at: nowISTISOString(),
    });
    if (error && !isMissingTable(error)) throw error;
}

async function updateChannelTasks(supabase, { userId, productId, channel, result }) {
    const status = taskStatusFromSync(result);
    const patch = {
        status,
        updated_at: nowISTISOString(),
    };
    if (status === "completed") patch.completed_at = nowISTISOString();

    const { error } = await supabase
        .from("update_tasks")
        .update(patch)
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("channel", channel)
        .in("status", ["pending", "in_progress", "failed"]);

    if (error && !isMissingTable(error)) throw error;
}

async function saveGeneratedUpdateContent(supabase, { userId, product, change }) {
    if (!shouldCreateSocialUpdate(change)) return null;

    const instagramCaption = buildInstagramUpdateCaption(product, change);
    const facebookDescription = buildFacebookPageUpdateCaption(product, change);
    const whatsappDescription = buildWhatsAppText(product);
    const row = {
        product_id: product.id,
        client_id: userId,
        task_id: null,
        whatsapp_title: productName(product),
        whatsapp_description: whatsappDescription,
        instagram_caption: instagramCaption,
        instagram_hashtags: "#ORVA #ShopLocal #LocalBusiness",
        facebook_title: productName(product),
        facebook_description: facebookDescription,
        facebook_category: product.category || "",
        status: autoPublishSocialUpdates() ? "ready" : "draft",
        created_by: userId,
        updated_at: nowISTISOString(),
    };

    const { data, error } = await supabase
        .from("product_content_outputs")
        .insert(row)
        .select("*")
        .maybeSingle();

    if (error && !isMissingTable(error)) throw error;
    return data || null;
}

async function loadConnection(supabase, userId, channel) {
    const { data, error } = await supabase
        .from("social_connections")
        .select("external_account_id, access_token, status")
        .eq("user_id", userId)
        .eq("channel", channel)
        .maybeSingle();

    if (error && !isMissingTable(error)) throw error;
    return data || null;
}

async function publishSocialUpdate(supabase, { userId, product, channel }) {
    const connectionChannel = channel === "facebook_page" ? "facebook" : "instagram";
    const connection = await loadConnection(supabase, userId, connectionChannel);
    if (!metaMockMode() && connection?.status !== "connected") {
        return { ok: false, error: `Connect ${connectionChannel === "facebook" ? "Facebook Page" : "Instagram Business"} before auto-publishing.` };
    }

    try {
        const result = channel === "facebook_page"
            ? await publishProductToFacebookPage({ product, connection, mockMode: metaMockMode() })
            : await publishProductToInstagram({ product, connection, mockMode: metaMockMode() });

        await insertSocialExport(supabase, {
            user_id: userId,
            product_id: product.id,
            channel,
            status: "published",
            external_post_id: result.externalPostId,
            error_message: null,
        });
        return { ok: true, externalId: result.externalPostId };
    } catch (error) {
        await insertSocialExport(supabase, {
            user_id: userId,
            product_id: product.id,
            channel,
            status: "failed",
            external_post_id: null,
            error_message: error.message,
        });
        return { ok: false, error: error.message };
    }
}

export async function runDynamicProductSync(supabase, { userId, before = null, after }) {
    if (!after?.id || !userId) return { content: null, channels: {} };

    const change = describeProductChange(before || {}, after);
    const content = await saveGeneratedUpdateContent(supabase, { userId, product: after, change });
    const channels = {};
    const subscription = await getClientSubscription(supabase, userId).catch(() => null);

    if (!subscription) {
        return {
            change,
            content,
            channels: {
                locked: {
                    ok: false,
                    error: "ORVA account is pending activation. Channel publishing will start after payment verification.",
                },
            },
        };
    }

    channels.online_store = { ok: true, externalId: after.id };
    await updateChannelTasks(supabase, { userId, productId: after.id, channel: "online_store", result: channels.online_store });

    if (shouldCreateSocialUpdate(change) && autoPublishSocialUpdates()) {
        channels.instagram = await publishSocialUpdate(supabase, { userId, product: after, channel: "instagram" });
        channels.facebook_page = await publishSocialUpdate(supabase, { userId, product: after, channel: "facebook_page" });
        await updateChannelTasks(supabase, { userId, productId: after.id, channel: "instagram", result: channels.instagram });
        await updateChannelTasks(supabase, { userId, productId: after.id, channel: "facebook_page", result: channels.facebook_page });
    }

    return { change, content, channels };
}
