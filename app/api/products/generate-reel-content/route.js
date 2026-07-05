import { NextResponse } from "next/server";
import { buildReelContent } from "../../../lib/inventory";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";
import { nowISTISOString } from "../../../lib/istDate";

function clientIdFor(product = {}) {
    return product.user_id || product.client_id;
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const productId = body.productId;
    if (!productId) return NextResponse.json({ error: "Choose a product first." }, { status: 400 });

    const supabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : createSupabaseUserClient(token);
    const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message || "Could not load product." }, { status: 500 });
    if (!product || clientIdFor(product) !== user.id) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const generated = buildReelContent(product);
    const patch = {
        ...generated,
        reel_status: "draft",
        updated_at: nowISTISOString(),
    };

    const { data: updated, error: updateError } = await supabase
        .from("products")
        .update(patch)
        .eq("id", product.id)
        .select("*")
        .single();

    if (updateError) return NextResponse.json({ error: updateError.message || "Could not save reel content." }, { status: 500 });

    return NextResponse.json({
        product: updated,
        reel: generated,
        message: "Reel content generated.",
    });
}
