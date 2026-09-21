import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceRole } from "./supabaseServer";
import { nowISTISOString, toISTISOString } from "./istDate";

export const connectionChannels = ["whatsapp", "instagram", "facebook"];
export const safeConnectionFields = "id, channel, provider, external_account_name, status, created_at, updated_at";
const facebookChannel = "facebook";
const facebookProvider = "meta";
const facebookGraphVersion = process.env.META_GRAPH_VERSION || "v22.0";
const instagramChannel = "instagram";
const instagramProvider = "instagram";
const instagramGraphVersion = process.env.INSTAGRAM_GRAPH_VERSION || facebookGraphVersion;
const oauthStateLifetimeMs = 10 * 60 * 1000;
const instagramScopes = "instagram_business_basic,instagram_business_content_publish";

export function providerForChannel(channel) {
    if (channel === "whatsapp") return "whatsapp_business";
    return channel === instagramChannel ? instagramProvider : facebookProvider;
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
            updated_at: nowISTISOString(),
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

function requireFacebookLoginConfig() {
    const config = requireMetaConfig();
    const configurationId = process.env.META_FACEBOOK_CONFIG_ID;
    if (!configurationId) {
        throw new Error("Facebook Login for Business is not configured. Add META_FACEBOOK_CONFIG_ID to the server environment.");
    }
    return { ...config, configurationId };
}

function requireInstagramConfig() {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (!appId || !appSecret) {
        throw new Error("Instagram Business Login is not configured. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to the server environment.");
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

function encodeInstagramState(payload) {
    const { appSecret } = requireInstagramConfig();
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(encoded).digest("base64url");
    return `${encoded}.${signature}`;
}

function decodeInstagramState(state) {
    const { appSecret } = requireInstagramConfig();
    const [encoded, signature] = String(state || "").split(".");
    if (!encoded || !signature) throw new Error("The Instagram connection request is invalid.");
    const expected = createHmac("sha256", appSecret).update(encoded).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        throw new Error("The Instagram connection request could not be verified.");
    }
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.userId || !payload.nonce || Number(payload.expiresAt) < Date.now()) {
        throw new Error("The Instagram connection request has expired. Please try again.");
    }
    return payload;
}

async function metaRequest(url, options = {}) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Meta could not complete the connection.");
    }
    return result;
}

async function metaCollection(url, maxPages = 10) {
    const items = [];
    let nextUrl = url;
    let pageCount = 0;
    while (nextUrl && pageCount < maxPages) {
        const result = await metaRequest(nextUrl);
        if (Array.isArray(result.data)) items.push(...result.data);
        nextUrl = result.paging?.next || "";
        pageCount += 1;
    }
    return items;
}

function sanitizeManagedPages(pages = [], selectedPageId = "") {
    return pages.map((managedPage) => ({
        id: managedPage.id,
        name: managedPage.name || "Facebook Page",
        selected: managedPage.id === selectedPageId,
        has_instagram_business_account: Boolean(managedPage.instagram_business_account?.id),
    })).filter((managedPage) => managedPage.id);
}

function sanitizeManagedInstagramAccounts(pages = [], selectedAccountId = "") {
    return pages
        .map((page) => ({
            id: page.instagram_business_account?.id,
            username: page.instagram_business_account?.username || "",
            name: page.instagram_business_account?.username ? `@${page.instagram_business_account.username}` : "Instagram Business",
            facebook_page_id: page.id,
            facebook_page_name: page.name || "Facebook Page",
            selected: page.instagram_business_account?.id === selectedAccountId,
        }))
        .filter((account) => account.id);
}

async function connectSelectedFacebookPage({ supabase, userId, connectionId, profile = {}, pages = [], selectedPageId, tokenExpiresAt }) {
    const page = pages.find((managedPage) => managedPage.id === selectedPageId);
    if (!page?.id) {
        throw new Error("Choose a valid Facebook Page to connect.");
    }

    const managedPages = sanitizeManagedPages(pages, page.id);
    const hasPageAccessToken = Boolean(page.access_token);
    const { data: connection, error } = await supabase
        .from("social_connections")
        .update({
            external_account_id: page.id,
            external_account_name: page.name || "Facebook Page",
            access_token: page.access_token || null,
            token_expires_at: tokenExpiresAt || null,
            status: "connected",
            metadata: {
                facebook_user_id: profile.id || null,
                facebook_user_name: profile.name || null,
                facebook_page_id: page.id,
                facebook_page_name: page.name || null,
                publishing_access_granted: hasPageAccessToken,
                publishing_access_message: hasPageAccessToken
                    ? null
                    : "Facebook Page was selected, but Meta did not return a Page access token. Publishing requires pages_manage_posts and pages_read_engagement approval.",
                connected_pages_count: managedPages.length || 1,
                managed_pages: managedPages,
            },
            updated_at: nowISTISOString(),
        })
        .eq("id", connectionId)
        .eq("user_id", userId)
        .select(safeConnectionFields)
        .single();
    if (error) throw error;

    return connection;
}

async function connectSelectedInstagramAccount({ supabase, userId, connectionId, profile = {}, pages = [], selectedAccountId, tokenExpiresAt }) {
    const page = pages.find((managedPage) => managedPage.instagram_business_account?.id === selectedAccountId);
    const instagramAccount = page?.instagram_business_account;
    if (!page?.access_token || !instagramAccount?.id) {
        throw new Error("Choose a valid Instagram Business account to connect.");
    }

    const accounts = sanitizeManagedInstagramAccounts(pages, instagramAccount.id);
    const { data: connection, error } = await supabase
        .from("social_connections")
        .update({
            external_account_id: instagramAccount.id,
            external_account_name: instagramAccount.username ? `@${instagramAccount.username}` : "Instagram Business",
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt || null,
            status: "connected",
            metadata: {
                facebook_user_id: profile.id || null,
                facebook_user_name: profile.name || null,
                instagram_account_id: instagramAccount.id,
                instagram_username: instagramAccount.username || null,
                facebook_page_id: page.id,
                facebook_page_name: page.name || null,
                connected_instagram_accounts_count: accounts.length || 1,
                managed_instagram_accounts: accounts,
            },
            updated_at: nowISTISOString(),
        })
        .eq("id", connectionId)
        .eq("user_id", userId)
        .select(safeConnectionFields)
        .single();
    if (error) throw error;
    return connection;
}

export function facebookCallbackUrl(origin) {
    // This exact redirect URI must be added in Meta Developer Dashboard under Facebook Login settings.
    if (process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI) return process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
    return `${String(configuredOrigin).replace(/\/$/, "")}/api/auth/facebook/callback`;
}

export function instagramCallbackUrl(origin) {
    if (process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI) return process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
    return `${String(configuredOrigin).replace(/\/$/, "")}/api/auth/instagram/callback`;
}

export async function beginFacebookLogin(userId, origin) {
    const { appId, configurationId } = requireFacebookLoginConfig();
    const supabase = createSupabaseServiceRole();
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + oauthStateLifetimeMs;
    const redirectUri = facebookCallbackUrl(origin);
    const state = encodeState({ userId, nonce, expiresAt, channel: facebookChannel });

    const { error } = await supabase
        .from("social_connections")
        .upsert({
            user_id: userId,
            channel: facebookChannel,
            provider: facebookProvider,
            status: "connecting",
            metadata: { oauth_state_nonce: nonce, oauth_state_expires_at: toISTISOString(new Date(expiresAt)) },
            updated_at: nowISTISOString(),
        }, { onConflict: "user_id,channel" });
    if (error) throw error;

    const params = new URLSearchParams({
        client_id: appId,
        config_id: configurationId,
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        auth_type: "rerequest",
    });
    return `https://www.facebook.com/${facebookGraphVersion}/dialog/oauth?${params.toString()}`;
}

export async function beginInstagramLogin(userId, origin) {
    const { appId } = requireInstagramConfig();
    const supabase = createSupabaseServiceRole();
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + oauthStateLifetimeMs;
    const redirectUri = instagramCallbackUrl(origin);
    const state = encodeInstagramState({ userId, nonce, expiresAt, channel: instagramChannel });

    const { error } = await supabase
        .from("social_connections")
        .upsert({
            user_id: userId,
            channel: instagramChannel,
            provider: instagramProvider,
            status: "connecting",
            metadata: { oauth_state_nonce: nonce, oauth_state_expires_at: toISTISOString(new Date(expiresAt)) },
            updated_at: nowISTISOString(),
        }, { onConflict: "user_id,channel" });
    if (error) throw error;

    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: instagramScopes,
        state,
        enable_fb_login: "0",
        force_authentication: "1",
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
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
    const longTokenParams = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: token.access_token,
    });
    const longToken = await metaRequest(`https://graph.facebook.com/${facebookGraphVersion}/oauth/access_token?${longTokenParams.toString()}`);
    const accessToken = longToken.access_token || token.access_token;
    const profileParams = new URLSearchParams({ fields: "id,name", access_token: accessToken });
    const profile = await metaRequest(`https://graph.facebook.com/${facebookGraphVersion}/me?${profileParams.toString()}`);
    const pageParams = new URLSearchParams({
        fields: "id,name,access_token",
        limit: "100",
        access_token: accessToken,
    });
    const managedPages = await metaCollection(`https://graph.facebook.com/${facebookGraphVersion}/me/accounts?${pageParams.toString()}`);
    if (!managedPages.some((page) => page?.id)) {
        throw new Error("No Facebook Page was returned by Meta. Confirm this Facebook account has full control/admin access to the Page in Business Settings, then remove ORVA from Facebook Business Integrations and reconnect.");
    }
    const expiresIn = Number(longToken.expires_in || token.expires_in || 0);
    const tokenExpiresAt = expiresIn
        ? toISTISOString(new Date(Date.now() + expiresIn * 1000))
        : null;

    const publicPages = sanitizeManagedPages(managedPages);
    const { data: connection, error } = await supabase
        .from("social_connections")
        .update({
            external_account_id: null,
            external_account_name: null,
            access_token: null,
            token_expires_at: tokenExpiresAt,
            status: "page_selection_required",
            metadata: {
                facebook_user_id: profile.id,
                facebook_user_name: profile.name || null,
                connected_pages_count: publicPages.length,
                managed_pages: publicPages,
                pending_pages: managedPages,
                pending_token_expires_at: tokenExpiresAt,
            },
            updated_at: nowISTISOString(),
        })
        .eq("id", pending.id)
        .select(safeConnectionFields)
        .single();
    if (error) throw error;
    return connection;
}

export async function completeInstagramLogin({ code, state, origin }) {
    const { appId, appSecret } = requireInstagramConfig();
    const payload = decodeInstagramState(state);
    const supabase = createSupabaseServiceRole();
    const { data: pending, error: pendingError } = await supabase
        .from("social_connections")
        .select("id, metadata")
        .eq("user_id", payload.userId)
        .eq("channel", instagramChannel)
        .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending || pending.metadata?.oauth_state_nonce !== payload.nonce) {
        throw new Error("The Instagram connection request is no longer active. Please start again.");
    }

    const redirectUri = instagramCallbackUrl(origin);
    const shortTokenParams = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: String(code || "").replace(/#_$/, ""),
    });
    const shortToken = await metaRequest("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: shortTokenParams.toString(),
    });
    if (!shortToken.access_token) throw new Error("Instagram did not return an access token.");

    const longTokenParams = new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: shortToken.access_token,
    });
    const longToken = await metaRequest(`https://graph.instagram.com/access_token?${longTokenParams.toString()}`);
    const accessToken = longToken.access_token || shortToken.access_token;
    const profileParams = new URLSearchParams({
        fields: "id,user_id,username,account_type,media_count",
        access_token: accessToken,
    });
    const profile = await metaRequest(`https://graph.instagram.com/${instagramGraphVersion}/me?${profileParams.toString()}`);
    const accountId = profile.user_id || profile.id || shortToken.user_id;
    if (!accountId) throw new Error("Instagram did not return a professional account ID.");

    const expiresIn = Number(longToken.expires_in || shortToken.expires_in || 0);
    const tokenExpiresAt = expiresIn
        ? toISTISOString(new Date(Date.now() + expiresIn * 1000))
        : null;
    const { data: connection, error } = await supabase
        .from("social_connections")
        .update({
            provider: instagramProvider,
            external_account_id: String(accountId),
            external_account_name: profile.username ? `@${profile.username}` : "Instagram Professional",
            access_token: accessToken,
            token_expires_at: tokenExpiresAt,
            status: "connected",
            metadata: {
                instagram_account_id: String(accountId),
                instagram_scoped_id: profile.id || null,
                instagram_username: profile.username || null,
                instagram_account_type: profile.account_type || null,
                instagram_media_count: profile.media_count ?? null,
                publishing_access_granted: true,
                oauth_provider: "instagram_business_login",
            },
            updated_at: nowISTISOString(),
        })
        .eq("id", pending.id)
        .eq("user_id", payload.userId)
        .select(safeConnectionFields)
        .single();
    if (error) throw error;
    return connection;
}

export async function selectFacebookPageForConnection(userId, pageId) {
    const supabase = createSupabaseServiceRole();
    const { data: pending, error: pendingError } = await supabase
        .from("social_connections")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("channel", facebookChannel)
        .eq("status", "page_selection_required")
        .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending) throw new Error("Connect Facebook first, then choose a Page.");

    const pendingPages = Array.isArray(pending.metadata?.pending_pages) ? pending.metadata.pending_pages : [];
    return connectSelectedFacebookPage({
        supabase,
        userId,
        connectionId: pending.id,
        profile: {
            id: pending.metadata?.facebook_user_id,
            name: pending.metadata?.facebook_user_name,
        },
        pages: pendingPages,
        selectedPageId: pageId,
        tokenExpiresAt: pending.metadata?.pending_token_expires_at || null,
    });
}

export async function selectInstagramAccountForConnection(userId, accountId) {
    const supabase = createSupabaseServiceRole();
    const { data: pending, error: pendingError } = await supabase
        .from("social_connections")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("channel", "instagram")
        .eq("status", "account_selection_required")
        .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending) throw new Error("Connect Instagram first, then choose an account.");

    const pendingPages = Array.isArray(pending.metadata?.pending_pages) ? pending.metadata.pending_pages : [];
    return connectSelectedInstagramAccount({
        supabase,
        userId,
        connectionId: pending.id,
        profile: {
            id: pending.metadata?.facebook_user_id,
            name: pending.metadata?.facebook_user_name,
        },
        pages: pendingPages,
        selectedAccountId: accountId,
        tokenExpiresAt: pending.metadata?.pending_token_expires_at || null,
    });
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
            updated_at: nowISTISOString(),
        })
        .eq("user_id", payload.userId)
        .eq("channel", facebookChannel);
}

export async function markInstagramConnectionFailed(state, message) {
    let payload;
    try {
        payload = decodeInstagramState(state);
    } catch {
        return;
    }
    const supabase = createSupabaseServiceRole();
    await supabase
        .from("social_connections")
        .update({
            status: "failed",
            metadata: { reason: message || "instagram_oauth_failed" },
            updated_at: nowISTISOString(),
        })
        .eq("user_id", payload.userId)
        .eq("channel", instagramChannel);
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
            updated_at: nowISTISOString(),
        }, { onConflict: "user_id,channel" })
        .select(safeConnectionFields)
        .single();

    return { connection: data, error };
}
