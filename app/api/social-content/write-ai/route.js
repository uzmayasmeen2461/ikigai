import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../../lib/supabaseServer";
import {
    buildFacebookPageCaption,
    buildInstagramCaption,
    buildWhatsAppText,
    formatInventoryStatus,
    productName,
    productNotes,
    productStock,
} from "../../../lib/inventory";
import { formatINR } from "../../../lib/pricing";

const allowedChannels = new Set(["facebook", "facebook_page", "instagram", "whatsapp"]);

function fallbackCopy(product, channel) {
    const name = productName(product);
    const price = formatINR(product.price || 0);
    const status = formatInventoryStatus(product.status);
    const notes = productNotes(product);

    if (channel === "instagram") {
        return [
            status === "Out of stock" ? "Sold out for now" : "Fresh pick for your feed",
            `${name} ${status === "Out of stock" ? "will be back soon." : "is ready to order."}`,
            `Price: ${price}`,
            notes,
            status === "Out of stock" ? "DM us to get notified." : "DM to order.",
            "#ORVA #ShopLocal #LocalBusiness",
        ].filter(Boolean).join("\n");
    }

    if (channel === "whatsapp") return buildWhatsAppText(product);

    return [
        `${name} is ready for your customers.`,
        `Price: ${price}`,
        `Status: ${status}`,
        notes,
        "",
        status === "Out of stock" ? "Message us to get notified when it is back." : "Message us to order.",
        "",
        "#ORVA #LocalBusiness #ShopLocal",
    ].filter((line) => line !== undefined && line !== null).join("\n");
}

function baseCopy(product, channel) {
    if (channel === "instagram") return buildInstagramCaption(product);
    if (channel === "whatsapp") return buildWhatsAppText(product);
    return buildFacebookPageCaption(product);
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || "").trim();
    const channel = String(body.channel || "facebook").trim();
    const currentText = String(body.currentText || "").trim();

    if (!productId) return NextResponse.json({ error: "Choose a product first." }, { status: 400 });
    if (!allowedChannels.has(channel)) return NextResponse.json({ error: "Unsupported channel." }, { status: 400 });

    const supabase = createSupabaseUserClient(token);
    const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message || "Could not load product." }, { status: 500 });
    if (!product || (product.user_id || product.client_id) !== user.id) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({
            configured: false,
            copy: fallbackCopy(product, channel),
            warning: "AI writing is not configured. Add OPENAI_API_KEY to enable live AI generation.",
        });
    }

    const prompt = [
        "You write short, conversion-friendly product copy for ORVA, a local-business inventory-to-digital-presence SaaS.",
        `Channel: ${channel}.`,
        "Write only the final caption/copy. No markdown headings. No explanations.",
        "Keep it clear, human, and suitable for a small Indian local business.",
        "Do not promise discounts or availability that is not in the product data.",
        channel === "instagram" ? "Instagram: include a clean CTA and 3-6 relevant hashtags." : "",
        channel === "facebook" || channel === "facebook_page" ? "Facebook: write a page post with price, stock status, and message-to-order CTA." : "",
        channel === "whatsapp" ? "WhatsApp: write catalog-ready product text with product code, price, status, and order instruction." : "",
        "",
        "Product data:",
        `Name: ${productName(product)}`,
        `Category: ${product.category || "Not set"}`,
        `Code: ${product.product_code || product.sku || "Not set"}`,
        `Price: ${formatINR(product.price || 0)}`,
        `Stock: ${productStock(product)}`,
        `Status: ${formatInventoryStatus(product.status)}`,
        `Notes: ${productNotes(product) || "None"}`,
        currentText ? `Current draft to improve:\n${currentText}` : `Default draft:\n${baseCopy(product, channel)}`,
    ].filter(Boolean).join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
            input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text || "Could not write with AI.", copy: fallbackCopy(product, channel) }, { status: response.status });
    }

    const payload = await response.json();
    const outputText =
        payload.output_text ||
        payload.output
            ?.flatMap((item) => item.content || [])
            ?.map((item) => item.text || "")
            ?.join("\n")
            ?.trim();

    return NextResponse.json({ configured: true, copy: outputText || fallbackCopy(product, channel) });
}
