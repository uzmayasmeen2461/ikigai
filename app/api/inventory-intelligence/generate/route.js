import { NextResponse } from "next/server";
import { recommendationKey, recommendationsForProduct } from "../../../lib/inventoryIntelligence";
import { clientForRequest, loadProductsForUser, requireUser, roleForUser } from "../_shared";

export async function POST(request) {
    try {
        const auth = await requireUser(request);
        if (auth.errorResponse) return auth.errorResponse;

        const role = await roleForUser(auth.user.id);
        if (role === "partner") return NextResponse.json({ error: "Workers can only view assigned client recommendations." }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        const requestedClientId = role === "admin" ? String(body.clientId || "").trim() : "";
        const supabase = await clientForRequest(auth.token, true);
        const products = await loadProductsForUser(supabase, auth.user.id, role, requestedClientId);
        const clientIds = [...new Set(products.map((product) => product.user_id || product.client_id).filter(Boolean))];

        if (!products.length) {
            return NextResponse.json({ created: 0, recommendations: [] });
        }

        const { data: dismissedRows } = await supabase
            .from("inventory_recommendations")
            .select("product_id, recommendation_type")
            .in("client_id", clientIds)
            .in("status", ["dismissed", "completed"]);
        const dismissedKeys = new Set((dismissedRows || []).map((item) => recommendationKey(item.product_id, item.recommendation_type)));

        const recommendations = products
            .flatMap(recommendationsForProduct)
            .filter((item) => item.client_id && !dismissedKeys.has(recommendationKey(item.product_id, item.recommendation_type)));

        await supabase
            .from("inventory_recommendations")
            .delete()
            .in("client_id", clientIds)
            .eq("status", "open");

        if (!recommendations.length) {
            return NextResponse.json({ created: 0, recommendations: [] });
        }

        const { data, error } = await supabase
            .from("inventory_recommendations")
            .insert(recommendations)
            .select("*, products(*)");

        if (error) throw error;
        return NextResponse.json({ created: data?.length || 0, recommendations: data || [] }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not refresh inventory intelligence. Run scripts/orva-inventory-intelligence.sql in Supabase first." }, { status: 500 });
    }
}
