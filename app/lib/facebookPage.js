import { buildFacebookPageCaption } from "./inventory";

export const facebookPagePermissionMessage = "Facebook Page publishing requires pages_manage_posts, pages_read_engagement, and pages_show_list. Please update Meta Login permissions and reconnect.";
const facebookAmbiguousPublishMessage = "Facebook accepted the publish request but returned a delayed confirmation warning. Please check your Facebook Page; the post may already be live.";

function facebookGraphVersion() {
    return process.env.META_GRAPH_VERSION || "v22.0";
}

function mockExternalPostId(productId) {
    return `mock-facebook-page-${String(productId || Date.now()).replace(/[^a-z0-9]/gi, "").slice(-12)}`;
}

function isPermissionError(error = {}) {
    const message = String(error.message || "").toLowerCase();
    return error.code === 10 || error.code === 200 || message.includes("permission") || message.includes("permissions");
}

function isAmbiguousPublishError(error = {}) {
    const message = String(error.message || "").toLowerCase();
    return message.includes("please reduce the amount of data") || message.includes("reduce the amount of data");
}

function facebookGraphErrorMessage(error = {}, fallback = "Meta could not publish this product.") {
    const detail = error.message || fallback;
    if (isPermissionError(error)) return `${facebookPagePermissionMessage} ${detail}`;
    return `${fallback} ${detail}`;
}

async function graphPost(url, params) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        const graphError = result.error || {};
        const error = new Error(facebookGraphErrorMessage(graphError));
        error.metaCode = graphError.code;
        error.metaSubcode = graphError.error_subcode;
        error.metaMessage = graphError.message;
        error.ambiguousPublish = isAmbiguousPublishError(graphError);
        throw error;
    }
    return result;
}

export async function publishProductToFacebookPage({ product, connection, mockMode = false, caption: captionOverride = "" }) {
    const caption = String(captionOverride || "").trim() || buildFacebookPageCaption(product);
    if (mockMode) {
        return { externalPostId: mockExternalPostId(product.id), caption, mock: true };
    }

    const pageId = connection?.external_account_id;
    const pageAccessToken = connection?.access_token;
    if (!pageId || !pageAccessToken) {
        throw new Error(`${facebookPagePermissionMessage} Reconnect Facebook so ORVA can securely load your Page access token.`);
    }

    const imageUrl = product.cleaned_image_url || product.image_url;
    const params = new URLSearchParams({ access_token: pageAccessToken });
    let endpoint = "feed";
    if (imageUrl) {
        endpoint = "photos";
        params.set("url", imageUrl);
        params.set("caption", caption);
    } else {
        params.set("message", caption);
    }

    try {
        const result = await graphPost(`https://graph.facebook.com/${facebookGraphVersion()}/${pageId}/${endpoint}`, params);
        return { externalPostId: result.post_id || result.id, caption, mock: false };
    } catch (error) {
        if (error.ambiguousPublish) {
            return {
                externalPostId: `facebook-page-confirmation-pending-${mockExternalPostId(product.id)}`,
                caption,
                mock: false,
                warning: facebookAmbiguousPublishMessage,
            };
        }
        throw error;
    }
}

export async function publishProductReelToFacebookPage({ product, connection, mockMode = false, caption: captionOverride = "" }) {
    const caption = String(captionOverride || "").trim() || [
        product.reel_hook,
        product.reel_caption || buildFacebookPageCaption(product),
        product.reel_cta,
        product.reel_hashtags,
    ].filter(Boolean).join("\n\n");

    if (mockMode) {
        return { externalPostId: `${mockExternalPostId(product.id)}-reel`, caption, mock: true };
    }

    const pageId = connection?.external_account_id;
    const pageAccessToken = connection?.access_token;
    if (!pageId || !pageAccessToken) {
        throw new Error(`${facebookPagePermissionMessage} Reconnect Facebook so ORVA can securely load your Page access token.`);
    }
    if (!product.reel_video_url || product.reel_video_url.startsWith("data:") || product.reel_video_url.startsWith("blob:")) {
        throw new Error("Facebook Reel publishing requires a publicly accessible product video URL before publishing.");
    }

    const params = new URLSearchParams({
        access_token: pageAccessToken,
        file_url: product.reel_video_url,
        description: caption,
    });

    const result = await graphPost(`https://graph.facebook.com/${facebookGraphVersion()}/${pageId}/videos`, params);
    return { externalPostId: result.id, caption, mock: false };
}
