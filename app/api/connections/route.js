import { NextResponse } from "next/server";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";
import { recordWhatsAppCatalogConnection, safeConnectionFields } from "../../lib/socialConnections";

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
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("channel", "facebook")
        .eq("status", "connecting")
        .lt("updated_at", staleFacebookAttempt);

    const { data, error } = await supabase
        .from("social_connections")
        .select(safeConnectionFields)
        .eq("user_id", user.id)
        .order("channel");

    if (error) return NextResponse.json({ error: error.message || "Could not load connections." }, { status: 500 });
    return NextResponse.json({ connections: data || [] });
}
