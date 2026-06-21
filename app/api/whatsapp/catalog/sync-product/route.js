import { NextResponse } from "next/server";
import { requireActiveSubscription } from "../../../../lib/onboarding";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { uploadToCloudinary } from "../../../../lib/uploadToCloudinary";
import { syncProductToWhatsAppCatalog } from "../../../../lib/whatsappCatalogSync";

export const runtime = "nodejs";

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

    const contentType = request.headers.get("content-type") || "";
    let productId = "";
    let description = "";
    let imageFile = null;

    if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        productId = String(formData.get("productId") || "");
        description = String(formData.get("caption") || formData.get("copy") || formData.get("description") || "").trim();
        imageFile = formData.get("image");
    } else {
        const body = await request.json().catch(() => ({}));
        productId = body.productId;
        description = String(body.caption || body.copy || body.description || "").trim();
    }

    if (!productId) return NextResponse.json({ error: "Choose a product to sync." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    const { data: product } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
    if (!product || (product.user_id || product.client_id) !== user.id) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    if (imageFile && imageFile.size > 0) {
        const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
        if (!allowedTypes.has(imageFile.type)) {
            return NextResponse.json({ error: "Image must be JPEG, PNG, or WebP." }, { status: 400 });
        }

        if (imageFile.size > 8 * 1024 * 1024) {
            return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 });
        }

        try {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const { url } = await uploadToCloudinary(buffer, {
                tags: [`product-${product.id}`, `user-${user.id}`, "whatsapp-catalog"],
            });
            const now = new Date().toISOString();
            const { error: updateError } = await supabase
                .from("products")
                .update({ cleaned_image_url: url, updated_at: now })
                .eq("id", product.id);

            if (updateError) throw updateError;
            product.cleaned_image_url = url;
            product.updated_at = now;
        } catch (error) {
            return NextResponse.json({ error: error.message || "Image upload failed." }, { status: 502 });
        }
    }

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    try {
        const { data: previousExport } = await supabase
            .from("social_exports")
            .select("id, external_post_id")
            .eq("user_id", user.id)
            .eq("product_id", product.id)
            .eq("channel", "whatsapp_catalog")
            .eq("status", "published")
            .not("external_post_id", "is", null)
            .limit(1)
            .maybeSingle();
        const previousExternalProductId = String(previousExport?.external_post_id || "");
        const canUpdateExistingProduct = /^\d+$/.test(previousExternalProductId);
        const result = await syncProductToWhatsAppCatalog({
            product,
            mockMode,
            method: canUpdateExistingProduct ? "UPDATE" : "CREATE",
            description,
            externalProductId: canUpdateExistingProduct ? previousExternalProductId : "",
        });
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
        return NextResponse.json({
            message: "Product synced to the WhatsApp catalog successfully.",
            export: socialExport,
            catalogId: result.catalogId,
            metaProductId: result.externalProductId,
            verifiedProduct: result.verifiedProduct || null,
            imageUrl: product.cleaned_image_url || product.image_url,
        }, { status: 201 });
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
