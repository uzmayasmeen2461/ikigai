import { NextResponse } from "next/server";
import { requireActiveSubscription } from "../../../../lib/onboarding";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { syncProductToWhatsAppCatalog } from "../../../../lib/whatsappCatalogSync";

async function saveExport(supabase, values) {
    const { data, error } = await supabase.from("social_exports").insert(values).select("*").single();
    if (error) throw error;
    return data;
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before syncing a WhatsApp catalog." }, { status: 503 });
    const access = await requireActiveSubscription(user.id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status || 403 });

    const body = await request.json().catch(() => ({}));
    const { productId } = body;
    const description = String(body.caption || body.copy || body.description || "").trim();
    if (!productId) return NextResponse.json({ error: "Choose a product to sync." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    const { data: product } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
    if (!product || (product.user_id || product.client_id) !== user.id) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    try {
        const { data: previousExport } = await supabase
            .from("social_exports")
            .select("id")
            .eq("user_id", user.id)
            .eq("product_id", product.id)
            .eq("channel", "whatsapp_catalog")
            .eq("status", "published")
            .limit(1)
            .maybeSingle();
        const result = await syncProductToWhatsAppCatalog({ product, mockMode, method: previousExport ? "UPDATE" : "CREATE", description });
        const socialExport = await saveExport(supabase, {
            user_id: user.id,
            product_id: product.id,
            channel: "whatsapp_catalog",
            status: "published",
            external_post_id: result.externalProductId,
            error_message: null,
        });
        await supabase
            .from("products")
            .update({
                last_promoted_at: new Date().toISOString(),
                promotion_count: Number(product.promotion_count || 0) + 1,
                updated_at: new Date().toISOString(),
            })
            .eq("id", product.id);
        return NextResponse.json({ message: "Product synced to the WhatsApp catalog successfully.", export: socialExport }, { status: 201 });
    } catch (error) {
        try {
            await saveExport(supabase, {
                user_id: user.id,
                product_id: product.id,
                channel: "whatsapp_catalog",
                status: "failed",
                external_post_id: null,
                error_message: error.message,
            });
        } catch {}
        return NextResponse.json({ error: error.message || "Could not sync the WhatsApp catalog." }, { status: 502 });
    }
}
