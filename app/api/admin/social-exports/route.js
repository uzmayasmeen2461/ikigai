import { NextResponse } from "next/server";
import { getUserRole } from "../../../lib/onboarding";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to load admin exports." }, { status: 503 });

    const userSupabase = createSupabaseUserClient(token);
    const role = await getUserRole(userSupabase, user.id);
    if (role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const supabase = createSupabaseServiceRole();
    const { data, error } = await supabase
        .from("social_exports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message || "Could not load social exports." }, { status: 500 });

    const productIds = [...new Set((data || []).map((item) => item.product_id).filter(Boolean))];
    let productMap = {};
    if (productIds.length) {
        const { data: products } = await supabase
            .from("products")
            .select("id, name, product_name, sku, product_code")
            .in("id", productIds);
        productMap = Object.fromEntries((products || []).map((product) => [product.id, product]));
    }

    return NextResponse.json({
        exports: (data || []).map((item) => ({ ...item, products: productMap[item.product_id] || null })),
    });
}
