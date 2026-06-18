import { NextResponse } from "next/server";
import { summarizeRecommendations } from "../../../lib/inventoryIntelligence";
import { clientForRequest, loadOpenRecommendations, loadProductsForUser, requireUser, roleForUser } from "../_shared";

export async function GET(request) {
    try {
        const auth = await requireUser(request);
        if (auth.errorResponse) return auth.errorResponse;

        const role = await roleForUser(auth.user.id);
        const url = new URL(request.url);
        const clientId = url.searchParams.get("clientId") || "";
        const supabase = await clientForRequest(auth.token, role === "admin");
        const products = await loadProductsForUser(supabase, auth.user.id, role, clientId);
        const recommendations = await loadOpenRecommendations(supabase, auth.user.id, role, clientId);

        return NextResponse.json(summarizeRecommendations(products, recommendations));
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not load inventory intelligence summary." }, { status: 500 });
    }
}
