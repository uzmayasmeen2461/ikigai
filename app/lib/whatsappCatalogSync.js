import { buildWhatsAppText, productCode, productName, productStock } from "./inventory";

export const whatsappCatalogPermissionMessage = "WhatsApp catalog sync requires a Meta Commerce catalog linked to your WhatsApp Business Account and a server-side token with catalog_management and business_management permissions.";

function graphVersion() {
    return process.env.META_GRAPH_VERSION || "v22.0";
}

function mockExternalProductId(productId) {
    return `mock-whatsapp-catalog-${String(productId || Date.now()).replace(/[^a-z0-9]/gi, "").slice(-12)}`;
}

export async function syncProductToWhatsAppCatalog({ product, mockMode = false, method = "CREATE", description: descriptionOverride = "" }) {
    if (mockMode) return { externalProductId: mockExternalProductId(product.id), mock: true };

    const catalogId = process.env.WHATSAPP_CATALOG_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!catalogId || !accessToken) throw new Error(`${whatsappCatalogPermissionMessage} Add WHATSAPP_CATALOG_ID and WHATSAPP_ACCESS_TOKEN to the server environment.`);

    const imageUrl = product.cleaned_image_url || product.image_url;
    if (!imageUrl || imageUrl.startsWith("data:")) throw new Error("WhatsApp catalog sync requires a publicly accessible product image URL.");
    const retailerId = productCode(product) || product.id;
    const productUrl = process.env.PRODUCT_STORE_BASE_URL
        ? `${String(process.env.PRODUCT_STORE_BASE_URL).replace(/\/$/, "")}/${encodeURIComponent(retailerId)}`
        : imageUrl;
    const requests = [{
        method,
        retailer_id: retailerId,
        data: {
            name: productName(product),
            description: String(descriptionOverride || "").trim() || buildWhatsAppText(product),
            availability: productStock(product) > 0 ? "in stock" : "out of stock",
            condition: "new",
            price: `${Number(product.price || 0)} INR`,
            url: productUrl,
            image_url: imageUrl,
        },
    }];
    const params = new URLSearchParams({ requests: JSON.stringify(requests), access_token: accessToken });
    const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${catalogId}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        const metaMessage = result.error?.message || "Meta could not sync this catalog product.";
        const objectAccessIssue = /does not exist|missing permissions|does not support this operation/i.test(metaMessage);
        const nextStep = objectAccessIssue
            ? ` Check that WHATSAPP_CATALOG_ID is the Commerce Manager catalog ID, not the WABA or phone number ID, and generate a System User token with catalog_management and business_management access to that catalog. Current catalog ID: ${catalogId}.`
            : "";
        throw new Error(`${whatsappCatalogPermissionMessage} ${metaMessage}${nextStep}`);
    }
    return { externalProductId: retailerId, mock: false, result };
}
