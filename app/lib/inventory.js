import { formatINR } from "./pricing";

export const inventoryStatuses = ["in_stock", "low_stock", "out_of_stock", "hidden"];

export const inventoryStatusLabels = {
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
    hidden: "Hidden",
};

export function toInteger(value, fallback = 0) {
    const number = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(number) ? number : fallback;
}

export function cleanText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeInventoryStatus(stock = 0, requestedStatus = "") {
    if (requestedStatus === "hidden") return "hidden";

    const quantity = Math.max(0, toInteger(stock));
    if (quantity <= 0) return "out_of_stock";
    if (quantity <= 3) return "low_stock";
    return "in_stock";
}

export function productName(product = {}) {
    const source = product || {};
    return source.product_name || source.name || "Product";
}

export function productCode(product = {}) {
    const source = product || {};
    return source.product_code || source.sku || "";
}

export function productStock(product = {}) {
    const source = product || {};
    return toInteger(source.stock ?? source.stock_quantity, 0);
}

export function productNotes(product = {}) {
    const source = product || {};
    return source.notes || source.description || "";
}

export function formatInventoryStatus(status = "in_stock") {
    return inventoryStatusLabels[status] || inventoryStatusLabels.in_stock;
}

export function generateProductCode(name = "Product", index = 1) {
    const prefix = cleanText(name)
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 3)
        .toUpperCase() || "PRD";
    return `${prefix}${String(index).padStart(3, "0")}`;
}

export function buildWhatsAppText(product = {}) {
    const code = productCode(product) || "CODE";
    const lines = [
        `Product Code: ${code}`,
        `Product: ${productName(product)}`,
        `Price: ${formatINR(product.price || 0)}`,
        `Status: ${formatInventoryStatus(product.status)}`,
    ];

    const notes = productNotes(product);
    if (notes) lines.push(`Details: ${notes}`);
    lines.push(`To order, send product code ${code}.`);

    return lines.join("\n");
}

export function buildInstagramCaption(product = {}) {
    const name = productName(product);
    const status = product.status || "in_stock";
    const categoryTags = product.category
        ? String(product.category)
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => `#${part.replace(/[^a-z0-9]/gi, "")}`)
            .filter((tag) => tag.length > 1)
        : [];

    return [
        status === "out_of_stock" ? "Sold out for now" : "New Arrival ✨",
        `${name} ${status === "out_of_stock" ? "is currently out of stock." : "available now."}`,
        `Price: ${formatINR(product.price || 0)}`,
        status === "out_of_stock" ? "DM us to get notified when it is back." : "DM to order.",
        ["#NewArrival", "#Shopping", "#LocalBusiness", ...categoryTags].join(" "),
    ].join("\n");
}

export function buildReelContent(product = {}) {
    const name = productName(product);
    const price = formatINR(product.price || 0);
    const categoryTag = product.category ? `#${String(product.category).replace(/[^a-z0-9]/gi, "")}` : "";
    const hashtags = ["#ShopLocal", "#SmallBusiness", "#NewArrival", "#ORVA", categoryTag]
        .filter(Boolean)
        .join(" ");

    return {
        reel_hook: "New arrival for you ✨",
        reel_caption: [
            `${name} is now available at ${price}.`,
            "Perfect choice for your daily needs.",
            "Message us to order or visit our store today.",
        ].join("\n"),
        reel_hashtags: hashtags,
        reel_cta: "DM to order",
    };
}

export function buildFacebookPageCaption(product = {}) {
    return [
        `${productName(product)} is now available.`,
        `Price: ${formatINR(product.price || 0)}`,
        `Stock: ${formatInventoryStatus(product.status)}`,
        "",
        "Message us to order.",
        "",
        "#ORVA #LocalBusiness #ShopLocal",
    ].join("\n");
}

export function describeProductChange(before = {}, after = {}) {
    const oldStock = productStock(before);
    const newStock = productStock(after);
    const oldPrice = Number(before.price || 0);
    const newPrice = Number(after.price || 0);

    if (!before?.id) return { type: "new_product", label: "New arrival", oldStock, newStock, oldPrice, newPrice };
    if (oldStock !== newStock && newStock === 0) return { type: "out_of_stock", label: "Sold out", oldStock, newStock, oldPrice, newPrice };
    if (oldStock === 0 && newStock > 0) return { type: "back_in_stock", label: "Back in stock", oldStock, newStock, oldPrice, newPrice };
    if (oldStock !== newStock) return { type: "stock_update", label: "Stock update", oldStock, newStock, oldPrice, newPrice };
    if (oldPrice !== newPrice) return { type: "price_update", label: "Price update", oldStock, newStock, oldPrice, newPrice };
    return { type: "product_update", label: "Product update", oldStock, newStock, oldPrice, newPrice };
}

export function buildInstagramUpdateCaption(product = {}, change = {}) {
    const name = productName(product);
    const price = formatINR(product.price || 0);
    const categoryTag = product.category ? `#${String(product.category).replace(/[^a-z0-9]/gi, "")}` : "";
    const tags = ["#ORVA", "#ShopLocal", "#LocalBusiness", categoryTag].filter(Boolean).join(" ");

    if (change.type === "out_of_stock") {
        return [`${name} is sold out for now.`, "Thank you for the love. DM us to get notified when it is back.", tags].join("\n");
    }
    if (change.type === "back_in_stock") {
        return [`Back in stock: ${name}`, `Price: ${price}`, "DM to order before it sells out again.", tags].join("\n");
    }
    if (change.type === "price_update") {
        return [`${name} has an updated price.`, `Now: ${price}`, "Message us to order.", tags].join("\n");
    }
    if (change.type === "stock_update") {
        return [`Stock update for ${name}`, `Available quantity: ${productStock(product)}`, `Price: ${price}`, "DM to order.", tags].join("\n");
    }
    return [`${name} is ready in our catalog.`, `Price: ${price}`, productNotes(product), "DM to order.", tags].filter(Boolean).join("\n");
}

export function buildFacebookPageUpdateCaption(product = {}, change = {}) {
    const name = productName(product);
    const price = formatINR(product.price || 0);

    if (change.type === "out_of_stock") {
        return [`${name} is currently sold out.`, "We will share an update when it is available again.", "", "#ORVA #LocalBusiness #ShopLocal"].join("\n");
    }
    if (change.type === "back_in_stock") {
        return [`${name} is back in stock.`, `Price: ${price}`, "Message us to order.", "", "#ORVA #LocalBusiness #ShopLocal"].join("\n");
    }
    if (change.type === "price_update") {
        return [`${name} price updated.`, `New price: ${price}`, "Message us to order.", "", "#ORVA #LocalBusiness #ShopLocal"].join("\n");
    }
    if (change.type === "stock_update") {
        return [`${name} stock updated.`, `Available stock: ${productStock(product)}`, `Price: ${price}`, "Message us to order.", "", "#ORVA #LocalBusiness #ShopLocal"].join("\n");
    }
    return buildFacebookPageCaption(product);
}

export function productExportRow(product = {}) {
    return {
        product_code: productCode(product),
        product_name: productName(product),
        category: product.category || "",
        price: product.price || 0,
        stock: productStock(product),
        status: formatInventoryStatus(product.status),
        notes: productNotes(product),
    };
}

export function escapeCsv(value = "") {
    const text = String(value ?? "");
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows = []) {
    const headers = ["product_code", "product_name", "category", "price", "stock", "status", "notes"];
    return [
        headers.join(","),
        ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\n");
}

export function sampleInventoryCsv() {
    return [
        "Product Name,Category,Price,Stock,Product Code,Notes",
        "Black Kurti,Kurtis,1299,5,KUR001,New arrival",
        "Brown Handbag,Bags,899,8,BAG001,Trending",
        "Party Gown,Gowns,3499,2,GWN001,Low stock",
        "Pink Kids Frock,Kids Wear,699,0,KID001,Restock needed",
    ].join("\n");
}

export function buildBillWhatsAppText(bill = {}, items = []) {
    const lines = [
        `Bill: ${bill.bill_number || "ORVA bill"}`,
        bill.customer_name ? `Customer: ${bill.customer_name}` : "",
        "",
        ...items.map((item) => `${item.product_name} x ${item.quantity} - ${formatINR(item.line_total || 0)}`),
        "",
        `Total: ${formatINR(bill.total_amount || 0)}`,
        "Thank you for shopping with us.",
    ];

    return lines.filter((line, index) => line || lines[index - 1]).join("\n");
}
