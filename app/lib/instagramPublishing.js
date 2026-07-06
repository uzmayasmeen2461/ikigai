import { buildInstagramCaption, buildReelContent } from "./inventory";

export const instagramPermissionMessage = "Instagram publishing requires an Instagram professional account linked to your Facebook Page plus instagram_basic and instagram_content_publish permissions. Reconnect Meta after enabling these permissions.";

function graphVersion() {
    return process.env.META_GRAPH_VERSION || "v22.0";
}

function mockExternalPostId(productId) {
    return `mock-instagram-${String(productId || Date.now()).replace(/[^a-z0-9]/gi, "").slice(-12)}`;
}

async function graphPost(path, params) {
    const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(`${instagramPermissionMessage} ${result.error?.message || "Meta could not publish this Instagram post."}`);
    }
    return result;
}

async function graphGet(path, params) {
    const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}?${params.toString()}`, {
        cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(`${instagramPermissionMessage} ${result.error?.message || "Meta could not verify this Instagram account."}`);
    }
    return result;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInstagramMediaContainer({ containerId, accessToken, maxAttempts = 8, contentType = "media" }) {
    if (!containerId) {
        throw new Error(`${instagramPermissionMessage} Instagram did not return a media container ID.`);
    }

    const delays = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 14000];
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const status = await graphGet(containerId, new URLSearchParams({
            fields: "status_code",
            access_token: accessToken,
        }));

        if (status.status_code === "FINISHED") return status;
        if (status.status_code === "ERROR") {
            const hint = contentType === "reel"
                ? "Try a shorter MP4 with a public URL."
                : "Check that the product image URL is public and uses JPEG or PNG.";
            throw new Error(`${instagramPermissionMessage} Instagram could not process this ${contentType}. ${hint}`);
        }
        if (status.status_code === "EXPIRED") {
            throw new Error(`${instagramPermissionMessage} Instagram media processing expired. Please upload the ${contentType === "reel" ? "reel video" : "product image"} again.`);
        }

        await wait(delays[attempt] || 10000);
    }

    throw new Error(`Instagram is still processing this ${contentType}. Please try publishing again in a minute. Copy Caption and download/export fallback will still work.`);
}

export async function verifyInstagramConnection({ connection, mockMode = false }) {
    if (mockMode) {
        return {
            id: "mock-instagram-business",
            username: "orva",
            account_type: "BUSINESS",
            media_count: 0,
            mock: true,
        };
    }

    const instagramAccountId = connection?.external_account_id;
    const accessToken = connection?.access_token;
    if (!instagramAccountId || !accessToken) {
        throw new Error(`${instagramPermissionMessage} Connect Instagram Business before verifying.`);
    }

    return graphGet(instagramAccountId, new URLSearchParams({
        fields: "id,username,media_count",
        access_token: accessToken,
    }));
}

export async function publishProductToInstagram({ product, connection, mockMode = false, caption: captionOverride = "" }) {
    const caption = String(captionOverride || "").trim() || buildInstagramCaption(product);
    if (mockMode) return { externalPostId: mockExternalPostId(product.id), caption, mock: true };

    const instagramAccountId = connection?.external_account_id;
    const accessToken = connection?.access_token;
    const imageUrl = product.cleaned_image_url || product.image_url;
    if (!instagramAccountId || !accessToken) throw new Error(`${instagramPermissionMessage} Connect Instagram Business before publishing.`);
    if (!imageUrl || imageUrl.startsWith("data:")) throw new Error("Instagram requires a publicly accessible product image URL before publishing.");

    const container = await graphPost(`${instagramAccountId}/media`, new URLSearchParams({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
    }));
    if (!container.id) throw new Error(`${instagramPermissionMessage} Instagram did not return a media container ID.`);
    await waitForInstagramMediaContainer({ containerId: container.id, accessToken, contentType: "post" });
    const published = await graphPost(`${instagramAccountId}/media_publish`, new URLSearchParams({
        creation_id: container.id,
        access_token: accessToken,
    }));
    if (!published.id) throw new Error(`${instagramPermissionMessage} Instagram did not return a published post ID.`);
    return { externalPostId: published.id, caption, mock: false };
}

export function buildInstagramReelCaption(product = {}) {
    const generated = buildReelContent(product);
    return [
        product.reel_hook || generated.reel_hook,
        product.reel_caption || generated.reel_caption,
        product.reel_cta || generated.reel_cta,
        product.reel_hashtags || generated.reel_hashtags,
    ].filter(Boolean).join("\n\n");
}

export async function publishProductReelToInstagram({ product, connection, mockMode = false, caption: captionOverride = "" }) {
    const caption = String(captionOverride || "").trim() || buildInstagramReelCaption(product);
    if (mockMode) return { externalPostId: `${mockExternalPostId(product.id)}-reel`, caption, mock: true };

    const instagramAccountId = connection?.external_account_id;
    const accessToken = connection?.access_token;
    const videoUrl = product.reel_video_url;
    if (!instagramAccountId || !accessToken) throw new Error(`${instagramPermissionMessage} Connect Instagram Business before publishing.`);
    if (!videoUrl || videoUrl.startsWith("data:") || videoUrl.startsWith("blob:")) {
        throw new Error("Instagram Reel publishing requires a publicly accessible product video URL before publishing.");
    }

    const container = await graphPost(`${instagramAccountId}/media`, new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        access_token: accessToken,
    }));
    await waitForInstagramMediaContainer({ containerId: container.id, accessToken, contentType: "reel" });
    const published = await graphPost(`${instagramAccountId}/media_publish`, new URLSearchParams({
        creation_id: container.id,
        access_token: accessToken,
    }));
    if (!published.id) throw new Error(`${instagramPermissionMessage} Instagram did not return a published reel ID.`);
    return { externalPostId: published.id, caption, mock: false };
}
