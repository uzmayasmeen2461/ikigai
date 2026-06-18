import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceRole } from "./supabaseServer";

export const connectionChannels = ["whatsapp", "instagram", "facebook"];
export const safeConnectionFields = "id, channel, provider, external_account_name, status, created_at, updated_at";
const facebookChannel = "facebook";
const facebookProvider = "meta";
const facebookGraphVersion = process.env.META_GRAPH_VERSION || "v22.0";
const oauthStateLifetimeMs = 10 * 60 * 1000;

export function providerForChannel(channel) {
    return channel === "whatsapp" ? "whatsapp_business" : "meta";
}

export function getWhatsAppCatalogConfig() {
    return {
        catalogId: process.env.WHATSAPP_CATALOG_ID || "",
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
        wabaId: process.env.WHATSAPP_WABA_ID || "",
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    };
}

export function whatsappCatalogConfigError() {
    const { catalogId, accessToken } = getWhatsAppCatalogConfig();
    const missing = [];
    if (!catalogId) missing.push("WHATSAPP_CATALOG_ID");
    if (!accessToken) missing.push("WHATSAPP_ACCESS_TOKEN");

    if (!missing.length) return "";
    return `WhatsApp Catalog connection is missing ${missing.join(" and ")} in the server environment. Add the values, restart the server, then reconnect.`;
}

export async function recordWhatsAppCatalogConnection(userId) {
    const configError = whatsappCatalogConfigError();
    if (configError) {
        const { connection, error } = await recordPlaceholderConnection(userId, "whatsapp");
        return { connection, error, configurationError: configError };
    }

    let supabase;
    try {
        supabase = createSupabaseServiceRole();
    } catch (error) {
        return { connection: null, error };
    }

    const { catalogId, wabaId, phoneNumberId } = getWhatsAppCatalogConfig();
    const { data, error } = await supabase
        .from("social_connections")
        .upsert({
            user_id: userId,
            channel: "whatsapp",
            provider: "whatsapp_business",
            external_account_id: catalogId,
            external_account_name: "WhatsApp Commerce Catalog",
            status: "connected",
            metadata: {
                catalog_id: catalogId,
                waba_id: wabaId || null,
                phone_number_id: phoneNumberId || null,
            },
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,channel" })
        .select(safeConnectionFields)
        .single();

    return { connection: data, error, configurationError: "" };
}

function requireMetaConfig() {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
        throw new Error("Facebook Login is not configured. Add META_APP_ID and META_APP_SECRET to the server environment.");
    }
    return { appId, appSecret };
}

function encodeState(payload) {
    const { appSecret } = requireMetaConfig();
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(encoded).digest("base64url");
    return `${encoded}.${signature}`;
}

function decodeState(state) {
    const { appSecret } = requireMetaConfig();
    const [encoded, signature] = String(state || "").split(".");
    if (!encoded || !signature) throw new Error("The Facebook connection request is invalid.");
    const expected = createHmac("sha256", appSecret).update(encoded).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        throw new Error("The Facebook connection request could not be verified.");
    }
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.userId || !payload.nonce || Number(payload.expiresAt) < Date.now()) {
        throw new Error("The Facebook connection request has expired. Please try again.");
    }
    return payload;
}

async function metaRequest(url, options = {}) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Meta could not complete the Facebook connection.");
    }
    return result;
}

export function facebookCallbackUrl(origin) {
    // This exact redirect URI must be added in Meta Developer Dashboard under Facebook Login settings.
    if (process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI) return process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
    return `${String(configuredOrigin).replace(/\/$/, "")}/api/auth/facebook/callback`;
}

export async function beginFacebookLogin(userId, origin) {
    const { appId } = requireMetaConfig();
    const supabase = createSupabaseServiceRole();
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + oauthStateLifetimeMs;
    const redirectUri = facebookCallbackUrl(origin);
    const state = encodeState({ userId, nonce, expiresAt });

    const { error } = await supabase
        .from("social_connections")
        .upsert({
            user_id: userId,
            channel: facebookChannel,
            provider: facebookProvider,
            status: "connecting",
            metadata: { oauth_state_nonce: nonce, oauth_state_expires_at: new Date(expiresAt).toISOString() },
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,channel" });
    if (error) throw error;

    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        state,
        scope: "public_profile,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
        response_type: "code",
    });
    return `https://www.facebook.com/${facebookGraphVersion}/dialog/oauth?${params.toString()}`;
}

export async function completeFacebookLogin({ code, state, origin }) {
    const { appId, appSecret } = requireMetaConfig();
    const payload = decodeState(state);
    const supabase = createSupabaseServiceRole();
    const { data: pending, error: pendingError } = await supabase
        .from("social_connections")
        .select("id, metadata")
        .eq("user_id", payload.userId)
        .eq("channel", facebookChannel)
        .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending || pending.metadata?.oauth_state_nonce !== payload.nonce) {
        throw new Error("The Facebook connection request is no longer active. Please start again.");
    }

    const redirectUri = facebookCallbackUrl(origin);
    const tokenParams = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
    });
    const token = await metaRequest(`https://graph.facebook.com/${facebookGraphVersion}/oauth/access_token?${tokenParams.toString()}`);
    const profileParams = new URLSearchParams({ fields: "id,name", access_token: token.access_token });
    const profile = await metaRequest(`https://graph.facebook.com/${facebookGraphVersion}/me?${profileParams.toString()}`);
    const pageParams = new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", access_token: token.access_token });
    const pages = await metaRequest(`https://graph.facebook.com/${facebookGraphVersion}/me/accounts?${pageParams.toString()}`);
    const page = pages.data?.[0];
    if (!page?.id || !page?.access_token) {
        throw new Error("No manageable Facebook Page was found. Confirm pages_show_list and pages_manage_posts permissions, then reconnect.");
    }
    const tokenExpiresAt = token.expires_in
        ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
        : null;

    const { data: connection, error } = await supabase
        .from("social_connections")
        .update({
            external_account_id: page.id,
            external_account_name: page.name || "Facebook Page",
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt,
            status: "connected",
            metadata: {
                facebook_user_id: profile.id,
                facebook_user_name: profile.name || null,
                facebook_page_id: page.id,
                facebook_page_name: page.name || null,
                connected_pages_count: pages.data?.length || 1,
            },
            updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id)
        .select(safeConnectionFields)
        .single();
    if (error) throw error;

    const instagramAccount = page.instagram_business_account;
    if (instagramAccount?.id) {
        const { error: instagramError } = await supabase
            .from("social_connections")
            .upsert({
                user_id: payload.userId,
                channel: "instagram",
                provider: facebookProvider,
                external_account_id: instagramAccount.id,
                external_account_name: instagramAccount.username ? `@${instagramAccount.username}` : "Instagram Business",
                access_token: page.access_token,
                token_expires_at: tokenExpiresAt,
                status: "connected",
                metadata: {
                    instagram_account_id: instagramAccount.id,
                    instagram_username: instagramAccount.username || null,
                    facebook_page_id: page.id,
                    facebook_page_name: page.name || null,
                },
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,channel" });
        if (instagramError) throw instagramError;
    } else {
        const { error: instagramError } = await supabase
            .from("social_connections")
            .upsert({
                user_id: payload.userId,
                channel: "instagram",
                provider: facebookProvider,
                external_account_id: null,
                external_account_name: "Instagram Business not linked",
                access_token: null,
                token_expires_at: null,
                status: "failed",
                metadata: {
                    reason: "instagram_business_account_not_found",
                    facebook_page_id: page.id,
                    facebook_page_name: page.name || null,
                    next_step: "Link an Instagram professional account to this Facebook Page, then reconnect Meta.",
                },
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,channel" });
        if (instagramError) throw instagramError;
    }
    return connection;
}

export async function markFacebookConnectionFailed(state, message) {
    let payload;
    try {
        payload = decodeState(state);
    } catch {
        return;
    }
    const supabase = createSupabaseServiceRole();
    await supabase
        .from("social_connections")
        .update({
            status: "failed",
            metadata: { reason: message || "facebook_oauth_failed" },
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", payload.userId)
        .eq("channel", facebookChannel);
}

export async function recordPlaceholderConnection(userId, channel) {
    let supabase;
    try {
        supabase = createSupabaseServiceRole();
    } catch (error) {
        return { connection: null, error };
    }

    const { data, error } = await supabase
        .from("social_connections")
        .upsert({
            user_id: userId,
            channel,
            provider: providerForChannel(channel),
            status: "failed",
            metadata: {
                reason: "provider_not_configured",
                next_step: "Configure provider credentials and replace the placeholder route.",
            },
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,channel" })
        .select(safeConnectionFields)
        .single();

    return { connection: data, error };
}
