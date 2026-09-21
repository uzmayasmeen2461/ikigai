import { NextResponse } from "next/server";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";
import { recordWhatsAppCatalogConnection, safeConnectionFields } from "../../lib/socialConnections";
import { nowISTISOString } from "../../lib/istDate";

function publicConnection(connection = {}) {
    const metadata = connection.metadata || {};
    return {
        ...connection,
        status: connection.status === "connecting" ? "not_connected" : connection.status,
        metadata: {
            facebook_page_name: metadata.facebook_page_name || null,
            publishing_access_granted: metadata.publishing_access_granted ?? null,
            publishing_access_message: metadata.publishing_access_message || null,
            connected_pages_count: metadata.connected_pages_count || null,
            instagram_username: metadata.instagram_username || null,
            connected_instagram_accounts_count: metadata.connected_instagram_accounts_count || null,
            managed_pages: Array.isArray(metadata.managed_pages)
                ? metadata.managed_pages.map((page) => ({
                    id: page.id || "",
                    name: page.name || "Facebook Page",
                    selected: Boolean(page.selected),
                    has_instagram_business_account: Boolean(page.has_instagram_business_account),
                })).filter((page) => page.id)
                : [],
            managed_instagram_accounts: Array.isArray(metadata.managed_instagram_accounts)
                ? metadata.managed_instagram_accounts.map((account) => ({
                    id: account.id || "",
                    name: account.name || (account.username ? `@${account.username}` : "Instagram Business"),
                    username: account.username || "",
                    facebook_page_name: account.facebook_page_name || "Facebook Page",
                    selected: Boolean(account.selected),
                })).filter((account) => account.id)
                : [],
        },
    };
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({
            connections: [],
            configuration_error: "Add SUPABASE_SERVICE_ROLE_KEY to the server environment to enable social connections.",
        });
    }

    const supabase = createSupabaseServiceRole();
    await recordWhatsAppCatalogConnection(user.id);
    // Give people time to review Meta's consent screen. The signed OAuth state also expires after 10 minutes.
    const staleFacebookAttempt = new Date(Date.now() - 10 * 60_000).toISOString();
    await supabase
        .from("social_connections")
        .update({
            status: "failed",
            metadata: {
                reason: "facebook_oauth_timeout",
                next_step: "Check the Meta app domain and exact Facebook Login OAuth redirect URI, then retry.",
            },
            updated_at: nowISTISOString(),
        })
        .eq("user_id", user.id)
        .eq("channel", "facebook")
        .eq("status", "connecting")
        .lt("updated_at", staleFacebookAttempt);
    await supabase
        .from("social_connections")
        .update({
            status: "failed",
            metadata: {
                reason: "instagram_oauth_timeout",
                next_step: "Check the exact Instagram Business Login OAuth redirect URI, then retry.",
            },
            updated_at: nowISTISOString(),
        })
        .eq("user_id", user.id)
        .eq("channel", "instagram")
        .eq("status", "connecting")
        .lt("updated_at", staleFacebookAttempt);

    const { data, error } = await supabase
        .from("social_connections")
        .select(`${safeConnectionFields}, metadata`)
        .eq("user_id", user.id)
        .order("channel");

    if (error) return NextResponse.json({ error: error.message || "Could not load connections." }, { status: 500 });
    return NextResponse.json({ connections: (data || []).map(publicConnection) });
}
