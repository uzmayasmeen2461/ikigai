import { NextResponse } from "next/server";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";
import { connectionChannels } from "../../../lib/socialConnections";

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json();
    const channel = String(body.channel || "").toLowerCase();
    if (!connectionChannels.includes(channel)) return NextResponse.json({ error: "Choose a valid channel." }, { status: 400 });

    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to the server environment before managing social connections." }, { status: 503 });
    }

    const supabase = createSupabaseServiceRole();
    const { data, error } = await supabase
        .from("social_connections")
        .upsert({
            user_id: user.id,
            channel,
            provider: channel === "whatsapp" ? "whatsapp_business" : "meta",
            external_account_id: null,
            external_account_name: null,
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
            status: "not_connected",
            metadata: {},
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,channel" })
        .select("id, channel, provider, external_account_name, status, created_at, updated_at")
        .single();

    if (error) return NextResponse.json({ error: error.message || "Could not disconnect channel." }, { status: 500 });
    return NextResponse.json({ connection: data });
}
