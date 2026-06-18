import { escapeCsv, generateProductCode, productCode, productName, productNotes, productStock } from "./inventory";
import { formatINR } from "./pricing";

export const productStudioSteps = [
    "Upload Products",
    "Add Images",
    "Match Images",
    "Review Products",
    "Generate Content",
    "Export Kit",
];

export function normalizeFileStem(filename = "") {
    return String(filename)
        .split("/")
        .pop()
        .replace(/\.[^.]+$/, "")
        .trim()
        .toUpperCase();
}

export function productReadyForExport(product = {}) {
    return Boolean(productName(product) && Number(product.price || 0) > 0 && (product.cleaned_image_url || product.image_url));
}

export function missingProductFields(product = {}) {
    const missing = [];
    if (!productName(product)) missing.push("product name");
    if (!Number(product.price || 0)) missing.push("price");
    if (!(product.cleaned_image_url || product.image_url)) missing.push("image");
    return missing;
}

export function generateProductContent(product = {}) {
    const name = productName(product);
    const code = productCode(product) || generateProductCode(name, 1);
    const category = product.category || "Local Business";
    const notes = productNotes(product);
    const price = formatINR(product.price || 0);
    const stock = productStock(product);
    const availability = stock <= 0 ? "currently out of stock" : stock <= 3 ? "limited stock" : "available now";
    const categoryTag = String(category).replace(/[^a-z0-9]/gi, "");

    return {
        whatsapp_title: `${name} - ${price}`,
        whatsapp_description: [
            `${name} is ${availability}.`,
            notes ? `Details: ${notes}` : "",
            `Product Code: ${code}`,
            `To order, send product code ${code}.`,
        ].filter(Boolean).join("\n"),
        instagram_caption: [
            stock <= 0 ? "Back soon" : "New arrival",
            `${name} ${stock <= 0 ? "will be restocked soon." : "is ready for orders."}`,
            `Price: ${price}`,
            stock <= 3 && stock > 0 ? "Limited pieces available." : "DM to order.",
        ].join("\n"),
        instagram_hashtags: ["#ORVA", "#ShopLocal", "#LocalBusiness", "#NewArrival", categoryTag ? `#${categoryTag}` : ""]
            .filter(Boolean)
            .join(" "),
        facebook_title: `${name} | ${price}`,
        facebook_description: [
            `${name} for sale.`,
            `Price: ${price}`,
            category ? `Category: ${category}` : "",
            notes ? `Details: ${notes}` : "",
            `Message with product code ${code} to order.`,
        ].filter(Boolean).join("\n"),
        facebook_category: category,
    };
}

export function productContentRow(product = {}, output = {}) {
    const generated = { ...generateProductContent(product), ...output };
    return {
        product_code: productCode(product),
        product_name: productName(product),
        price: product.price || 0,
        whatsapp_title: generated.whatsapp_title,
        whatsapp_description: generated.whatsapp_description,
        instagram_caption: generated.instagram_caption,
        instagram_hashtags: generated.instagram_hashtags,
        facebook_title: generated.facebook_title,
        facebook_description: generated.facebook_description,
        facebook_category: generated.facebook_category,
    };
}

export function rowsToCsv(rows = []) {
    const headers = Object.keys(rows[0] || {});
    if (!headers.length) return "";

    return [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\n");
}

export function whatsappCatalogCsv(products = [], outputs = {}) {
    return rowsToCsv(products.map((product) => {
        const output = outputs[product.id] || generateProductContent(product);
        return {
            product_code: productCode(product),
            title: output.whatsapp_title,
            description: output.whatsapp_description,
            price: product.price || 0,
            stock: productStock(product),
            image: product.cleaned_image_url || product.image_url || "",
        };
    }));
}

export function productCopyPaste(products = [], outputs = {}, channel = "whatsapp") {
    return products.map((product) => {
        const output = outputs[product.id] || generateProductContent(product);
        if (channel === "instagram") {
            return `${productName(product)}\n\n${output.instagram_caption}\n\n${output.instagram_hashtags}`;
        }
        if (channel === "facebook") {
            return `${output.facebook_title}\n\n${output.facebook_description}`;
        }
        return `${output.whatsapp_title}\n\n${output.whatsapp_description}`;
    }).join("\n\n---\n\n");
}

export function instagramContentPlanCsv(products = [], outputs = {}) {
    return rowsToCsv(products.map((product, index) => {
        const output = outputs[product.id] || generateProductContent(product);
        return {
            day: index + 1,
            product_code: productCode(product),
            product_name: productName(product),
            caption: output.instagram_caption,
            hashtags: output.instagram_hashtags,
            image: product.cleaned_image_url || product.image_url || "",
        };
    }));
}

export function facebookMarketplaceCsv(products = [], outputs = {}) {
    return rowsToCsv(products.map((product) => {
        const output = outputs[product.id] || generateProductContent(product);
        return {
            title: output.facebook_title,
            price: product.price || 0,
            category: output.facebook_category,
            description: output.facebook_description,
            product_code: productCode(product),
            image: product.cleaned_image_url || product.image_url || "",
        };
    }));
}

export function productStudioGuide() {
    return [
        "ORVA Product Marketing Kit",
        "",
        "1. Review each product image, name, and price before uploading anywhere.",
        "2. Use the WhatsApp catalog CSV for WhatsApp Business catalog setup.",
        "3. Use Instagram captions and content plan for post planning.",
        "4. Use Facebook Marketplace CSV and copy-paste text for manual listing.",
        "5. ORVA does not auto-post to Meta platforms yet. Upload manually after review.",
    ].join("\n");
}
