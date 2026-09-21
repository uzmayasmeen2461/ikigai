import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { beginFacebookLogin } from "../../../../lib/socialConnections";

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY to the server environment before connecting Facebook." }, { status: 503 });
    }

    try {
        const authorizationUrl = await beginFacebookLogin(user.id, new URL(request.url).origin);
        return NextResponse.json({ authorization_url: authorizationUrl });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not start Facebook Login." }, { status: 500 });
    }
}
