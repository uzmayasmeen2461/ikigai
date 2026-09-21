import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { selectInstagramAccountForConnection } from "../../../../lib/socialConnections";

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to the server environment before connecting Instagram." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const accountId = String(body.account_id || "").trim();
    if (!accountId) return NextResponse.json({ error: "Choose an Instagram account to connect." }, { status: 400 });

    try {
        const connection = await selectInstagramAccountForConnection(user.id, accountId);
        return NextResponse.json({ connection });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not connect the selected Instagram account." }, { status: 500 });
    }
}
