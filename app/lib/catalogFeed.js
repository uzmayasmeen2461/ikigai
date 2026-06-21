import { randomUUID } from "node:crypto";
import { productCode, productName, productStock } from "./inventory";

export function normalizeFeedToken(value = "") {
    return String(value || "").replace(/\.csv$/i, "").trim();
}

export function createFeedToken() {
    return randomUUID().replace(/-/g, "");
}

export function publicBaseUrl(request) {
    const configured = process.env.PRODUCT_STORE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (configured) return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`;
    if (request?.url) {
        const url = new URL(request.url);
        return url.origin;
    }
    return "https://orva.digital";
}

function csvEscape(value = "") {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function metaAvailability(product = {}) {
    const stock = productStock(product);
    const status = String(product.status || "").toLowerCase();
    if (stock <= 0 || status === "out_of_stock" || status === "hidden") return "out of stock";
    return "in stock";
}

function metaDescription(product = {}) {
    return String(product.description || product.notes || `${productName(product)} is available from ORVA catalog.`).trim();
}

function productImageUrl(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

function feedLocality() {
    const address = process.env.WHATSAPP_CATALOG_AVAILABILITY_ADDRESS || process.env.ORVA_BUSINESS_ADDRESS || "Hyderabad, Telangana, India";
    const radius = process.env.WHATSAPP_CATALOG_AVAILABILITY_RADIUS || "50000";
    const latitude = process.env.WHATSAPP_CATALOG_AVAILABILITY_LATITUDE || "17.3850";
    const longitude = process.env.WHATSAPP_CATALOG_AVAILABILITY_LONGITUDE || "78.4867";
    const postalCodes = process.env.WHATSAPP_CATALOG_AVAILABILITY_POSTAL_CODES || "500001";
    return {
        address,
        availability_circle_radius: radius,
        availability_circle_origin: `${latitude},${longitude}`,
        availability_postal_codes: postalCodes,
    };
}

export function productLink(baseUrl, token, product) {
    return `${baseUrl}/catalog/${encodeURIComponent(token)}/${encodeURIComponent(product.id)}`;
}

export function buildMetaCatalogCsv(products = [], { baseUrl, token } = {}) {
    const locality = feedLocality();
    const headers = [
        "id",
        "title",
        "description",
        "availability",
        "condition",
        "price",
        "link",
        "image_link",
        "brand",
        "availability_circle_origin",
        "availability_circle_radius",
        "availability_postal_codes",
        "address",
    ];

    const rows = products
        .filter((product) => productName(product) && Number(product.price || 0) > 0 && productImageUrl(product))
        .map((product) => {
            const code = productCode(product) || product.id;
            return [
                code,
                productName(product),
                metaDescription(product),
                metaAvailability(product),
                "new",
                `${Number(product.price || 0).toFixed(2)} INR`,
                productLink(baseUrl, token, product),
                productImageUrl(product),
                "ORVA",
                locality.availability_circle_origin,
                locality.availability_circle_radius,
                locality.availability_postal_codes,
                locality.address,
            ].map(csvEscape).join(",");
        });

    return [headers.join(","), ...rows].join("\n");
}

export function catalogFeedSummary(products = []) {
    const totalProducts = products.length;
    const exportableProducts = products.filter((product) => productName(product) && Number(product.price || 0) > 0 && productImageUrl(product)).length;
    const missingImages = products.filter((product) => !productImageUrl(product)).length;
    const missingPrice = products.filter((product) => !Number(product.price || 0)).length;
    return { totalProducts, exportableProducts, missingImages, missingPrice };
}
