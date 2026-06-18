import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabaseServer";
import { recordWhatsAppCatalogConnection } from "../../../lib/socialConnections";

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const { connection, error, configurationError } = await recordWhatsAppCatalogConnection(user.id);
    if (error) return NextResponse.json({ error: error.message || "Could not prepare WhatsApp connection." }, { status: 500 });

    if (configurationError) {
        return NextResponse.json({
            error: configurationError,
            connection,
        }, { status: 503 });
    }

    return NextResponse.json({
        connection,
        message: "WhatsApp Catalog connected.",
    });
}
