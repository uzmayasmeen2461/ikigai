import { buildWhatsAppText, productCode, productName, productStock } from "./inventory";

export const whatsappCatalogPermissionMessage = "WhatsApp catalog sync requires a Meta Commerce catalog linked to your WhatsApp Business Account and a server-side token with catalog_management and business_management permissions.";

function graphVersion() {
    return process.env.META_GRAPH_VERSION || "v22.0";
}

function mockExternalProductId(productId) {
    return `mock-whatsapp-catalog-${String(productId || Date.now()).replace(/[^a-z0-9]/gi, "").slice(-12)}`;
}

function catalogProductUrl(product, imageUrl) {
    const baseUrl = process.env.PRODUCT_STORE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
    if (baseUrl) {
        const productId = product.id || productCode(product) || productName(product);
        return `${String(baseUrl).replace(/\/$/, "")}/catalog-item/${encodeURIComponent(productId)}`;
    }

    return imageUrl;
}

function productPayload(product, { descriptionOverride = "" } = {}) {
    const imageUrl = product.cleaned_image_url || product.image_url;
    const price = Number(product.price || 0);
    const retailerId = String(productCode(product) || product.id || "").trim();

    if (!imageUrl || imageUrl.startsWith("data:")) {
        throw new Error("WhatsApp catalog sync requires a publicly accessible product image URL.");
    }

    if (!retailerId) {
        throw new Error("WhatsApp catalog sync requires a product code or product ID.");
    }

    if (!Number.isFinite(price) || price <= 0) {
        throw new Error("WhatsApp catalog sync requires a product price greater than 0.");
    }

    return {
        retailer_id: retailerId,
        name: productName(product),
        description: String(descriptionOverride || "").trim() || buildWhatsAppText(product),
        availability: productStock(product) > 0 ? "in stock" : "out of stock",
        condition: "new",
        price: String(Math.round(price * 100)),
        currency: "INR",
        url: catalogProductUrl(product, imageUrl),
        image_url: imageUrl,
        brand: "ORVA",
    };
}

function metaErrorMessage(result = {}) {
    const metaMessage = result.error?.message || "Meta could not sync this catalog product.";
    const objectAccessIssue = /does not exist|missing permissions|does not support this operation/i.test(metaMessage);
    const catalogId = process.env.WHATSAPP_CATALOG_ID;
    const nextStep = objectAccessIssue
        ? ` Check that WHATSAPP_CATALOG_ID is the Commerce Manager catalog ID, not the WABA or phone number ID, and use a token with catalog_management and business_management access to that catalog. Current catalog ID: ${catalogId}.`
        : "";
    return `${whatsappCatalogPermissionMessage} ${metaMessage}${nextStep}`;
}

async function graphPost(path, payload, accessToken) {
    const params = new URLSearchParams({ ...payload, access_token: accessToken });
    const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(metaErrorMessage(result));
    }
    return result;
}

export async function syncProductToWhatsAppCatalog({ product, mockMode = false, method = "CREATE", description: descriptionOverride = "", externalProductId = "" }) {
    if (mockMode) return { externalProductId: mockExternalProductId(product.id), mock: true };

    const catalogId = process.env.WHATSAPP_CATALOG_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!catalogId || !accessToken) throw new Error(`${whatsappCatalogPermissionMessage} Add WHATSAPP_CATALOG_ID and WHATSAPP_ACCESS_TOKEN to the server environment.`);

    const payload = productPayload(product, { descriptionOverride });
    const shouldUpdate = method === "UPDATE" && externalProductId && !String(externalProductId).startsWith("mock-");
    const result = shouldUpdate
        ? await graphPost(externalProductId, payload, accessToken)
        : await graphPost(`${catalogId}/products`, payload, accessToken);

    const metaProductId = result.id || result.product_id || (shouldUpdate ? externalProductId : "");
    if (!metaProductId) {
        throw new Error("Meta accepted the WhatsApp catalog request but did not return a product ID, so ORVA did not mark it as synced.");
    }

    return { externalProductId: metaProductId, retailerId: payload.retailer_id, mock: false, result };
}
