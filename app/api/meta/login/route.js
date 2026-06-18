import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabaseServer";
import { recordPlaceholderConnection } from "../../../lib/socialConnections";

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const channel = new URL(request.url).searchParams.get("channel") === "instagram" ? "instagram" : "facebook";
    const { connection, error } = await recordPlaceholderConnection(user.id, channel);
    if (error) return NextResponse.json({ error: error.message || "Could not prepare Meta connection." }, { status: 500 });

    return NextResponse.json({
        error: "Meta connection is not configured yet.",
        connection,
    }, { status: 501 });
}

