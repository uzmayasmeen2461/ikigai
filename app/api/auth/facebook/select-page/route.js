import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { selectFacebookPageForConnection } from "../../../../lib/socialConnections";

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to the server environment before connecting Facebook." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const pageId = String(body.page_id || "").trim();
    if (!pageId) return NextResponse.json({ error: "Choose a Facebook Page to connect." }, { status: 400 });

    try {
        const connection = await selectFacebookPageForConnection(user.id, pageId);
        return NextResponse.json({ connection });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not connect the selected Facebook Page." }, { status: 500 });
    }
}
