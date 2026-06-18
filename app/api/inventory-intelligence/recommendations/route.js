import { NextResponse } from "next/server";
import { groupRecommendations } from "../../../lib/inventoryIntelligence";
import { clientForRequest, loadOpenRecommendations, requireUser, roleForUser } from "../_shared";

export async function GET(request) {
    try {
        const auth = await requireUser(request);
        if (auth.errorResponse) return auth.errorResponse;

        const role = await roleForUser(auth.user.id);
        const url = new URL(request.url);
        const clientId = url.searchParams.get("clientId") || "";
        const supabase = await clientForRequest(auth.token, role === "admin");
        const recommendations = await loadOpenRecommendations(supabase, auth.user.id, role, clientId);

        return NextResponse.json({
            recommendations,
            groups: groupRecommendations(recommendations),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not load inventory recommendations." }, { status: 500 });
    }
}
