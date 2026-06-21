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

function productPrice(product) {
    return Number(product.price || 0);
}

function productImageUrl(product) {
    return product.cleaned_image_url || product.image_url;
}

function productAvailability(product) {
    return productStock(product) > 0 ? "in stock" : "out of stock";
}

function baseProductData(product, { descriptionOverride = "" } = {}) {
    const imageUrl = productImageUrl(product);
    const price = productPrice(product);
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
        imageUrl,
        price,
        retailerId,
        name: productName(product),
        description: String(descriptionOverride || "").trim() || buildWhatsAppText(product),
        availability: productAvailability(product),
        productUrl: catalogProductUrl(product, imageUrl),
    };
}

function productPayload(product, { descriptionOverride = "" } = {}) {
    const { imageUrl, price, retailerId, name, description, availability, productUrl } = baseProductData(product, { descriptionOverride });

    return {
        retailer_id: retailerId,
        name,
        description,
        availability,
        condition: "new",
        price: Math.round(price * 100),
        currency: "INR",
        url: productUrl,
        image_url: imageUrl,
        brand: "ORVA",
    };
}

function commerceStyleProductPayload(product, { descriptionOverride = "" } = {}) {
    const { imageUrl, price, retailerId, name, description, availability, productUrl } = baseProductData(product, { descriptionOverride });
    return {
        retailer_id: retailerId,
        name,
        description,
        availability,
        condition: "new",
        price: Math.round(price * 100),
        currency: "INR",
        link: productUrl,
        image_link: imageUrl,
        brand: "ORVA",
    };
}

function detailedMetaError(result = {}) {
    const error = result.error || {};
    const details = [
        error.error_user_msg,
        error.error_data?.details,
        error.error_subcode ? `subcode ${error.error_subcode}` : "",
        error.fbtrace_id ? `fbtrace ${error.fbtrace_id}` : "",
    ].filter(Boolean);
    return details.length ? ` Details: ${details.join(" | ")}` : "";
}

function metaErrorMessage(result = {}) {
    const metaMessage = result.error?.message || "Meta could not sync this catalog product.";
    const objectAccessIssue = /does not exist|missing permissions|does not support this operation/i.test(metaMessage);
    const catalogId = process.env.WHATSAPP_CATALOG_ID;
    const nextStep = objectAccessIssue
        ? ` Check that WHATSAPP_CATALOG_ID is the Commerce Manager catalog ID, not the WABA or phone number ID, and use a token with catalog_management and business_management access to that catalog. Current catalog ID: ${catalogId}.`
        : "";
    return `${whatsappCatalogPermissionMessage} ${metaMessage}${detailedMetaError(result)}${nextStep}`;
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

async function graphGet(path, accessToken) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}${separator}access_token=${encodeURIComponent(accessToken)}`, {
        method: "GET",
        cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(metaErrorMessage(result));
    }
    return result;
}

async function verifyCatalogProduct({ catalogId, accessToken, metaProductId, retailerId }) {
    const fields = "id,retailer_id,name,availability,price";
    let directProduct = null;
    try {
        directProduct = await graphGet(`${metaProductId}?fields=${encodeURIComponent(fields)}`, accessToken);
    } catch {
        directProduct = null;
    }

    const listResult = await graphGet(`${catalogId}/products?fields=${encodeURIComponent(fields)}&limit=100`, accessToken);
    const list = Array.isArray(listResult.data) ? listResult.data : [];
    const matchedProduct = list.find((item) => String(item.id) === String(metaProductId) || String(item.retailer_id || "") === String(retailerId));

    if (!directProduct?.id && !matchedProduct?.id) {
        throw new Error(`Meta returned product ID ${metaProductId}, but it was not readable in catalog ${catalogId}. Check that WHATSAPP_CATALOG_ID points to the same Commerce catalog you are viewing and that the token has catalog access.`);
    }

    return matchedProduct || directProduct;
}

export async function syncProductToWhatsAppCatalog({ product, mockMode = false, method = "CREATE", description: descriptionOverride = "", externalProductId = "" }) {
    if (mockMode) return { externalProductId: mockExternalProductId(product.id), mock: true, catalogId: "mock" };

    const catalogId = process.env.WHATSAPP_CATALOG_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!catalogId || !accessToken) throw new Error(`${whatsappCatalogPermissionMessage} Add WHATSAPP_CATALOG_ID and WHATSAPP_ACCESS_TOKEN to the server environment.`);

    const payload = productPayload(product, { descriptionOverride });
    const shouldUpdate = method === "UPDATE" && externalProductId && !String(externalProductId).startsWith("mock-");
    let result;
    let payloadUsed = payload;
    try {
        result = shouldUpdate
            ? await graphPost(externalProductId, payload, accessToken)
            : await graphPost(`${catalogId}/products`, payload, accessToken);
    } catch (error) {
        if (!/Invalid parameter/i.test(error.message || "")) throw error;
        const fallbackPayload = commerceStyleProductPayload(product, { descriptionOverride });
        payloadUsed = fallbackPayload;
        result = shouldUpdate
            ? await graphPost(externalProductId, fallbackPayload, accessToken)
            : await graphPost(`${catalogId}/products`, fallbackPayload, accessToken);
    }

    const metaProductId = result.id || result.product_id || (shouldUpdate ? externalProductId : "");
    if (!metaProductId) {
        throw new Error("Meta accepted the WhatsApp catalog request but did not return a product ID, so ORVA did not mark it as synced.");
    }

    const verifiedProduct = await verifyCatalogProduct({
        catalogId,
        accessToken,
        metaProductId,
        retailerId: payloadUsed.retailer_id,
    });

    return { externalProductId: metaProductId, retailerId: payloadUsed.retailer_id, catalogId, mock: false, result, verifiedProduct };
}
