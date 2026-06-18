import { productName, productNotes, productStock, toInteger } from "./inventory";

export const recommendationPriorityGroups = [
    { key: "high", title: "Needs urgent attention" },
    { key: "medium", title: "Improve these products" },
    { key: "low", title: "Ready for promotion" },
];

export const recommendationLabels = {
    low_stock: { issue: "Low stock", action: "Create Offer Post" },
    not_promoted: { issue: "Not promoted", action: "Create Instagram Post" },
    missing_image: { issue: "Needs image", action: "Upload Image" },
    missing_description: { issue: "Needs description", action: "Generate Description" },
    ready_to_promote: { issue: "Ready to post", action: "Open Preview Studio" },
    dead_stock: { issue: "Ignored product", action: "Create Offer Post" },
    price_missing: { issue: "Price missing", action: "Add Price" },
};

export function productImage(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

export function productPrice(product = {}) {
    return Number(product.price ?? product.price_amount ?? 0);
}

export function productDescription(product = {}) {
    return product.description || product.notes || product.whatsapp_ready_text || product.instagram_caption || "";
}

export function productOwnerId(product = {}) {
    return product.user_id || product.client_id || "";
}

export function daysSince(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;
    return Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
}

export function recommendationKey(productId, type) {
    return `${productId || "none"}:${type}`;
}

export function buildRecommendation(product, type, priority, title, description, actionLabel) {
    return {
        client_id: productOwnerId(product),
        product_id: product.id,
        recommendation_type: type,
        priority,
        title,
        description,
        action_label: actionLabel || recommendationLabels[type]?.action || "Review product",
        status: "open",
    };
}

export function recommendationsForProduct(product = {}) {
    const name = productName(product);
    const stock = productStock(product);
    const threshold = Math.max(0, toInteger(product.low_stock_threshold, 5));
    const image = productImage(product);
    const description = productDescription(product);
    const price = productPrice(product);
    const promotedDaysAgo = daysSince(product.last_promoted_at);
    const recommendations = [];

    if (stock <= threshold) {
        recommendations.push(buildRecommendation(
            product,
            "low_stock",
            "high",
            "Low stock product",
            `${name} is running low. Consider restocking or promoting before stock finishes.`,
            "Create Offer Post",
        ));
    }

    if (!image) {
        recommendations.push(buildRecommendation(
            product,
            "missing_image",
            "high",
            "Product image missing",
            `${name} needs an image before it can be published professionally.`,
            "Upload Image",
        ));
    }

    if (!price) {
        recommendations.push(buildRecommendation(
            product,
            "price_missing",
            "high",
            "Price missing",
            `${name} needs a price before customers can order confidently.`,
            "Add Price",
        ));
    }

    if (!description) {
        recommendations.push(buildRecommendation(
            product,
            "missing_description",
            "medium",
            "Description missing",
            `Generate a better product description for ${name}.`,
            "Generate Description",
        ));
    }

    if (!product.last_promoted_at) {
        recommendations.push(buildRecommendation(
            product,
            "not_promoted",
            "medium",
            "Product not promoted yet",
            `${name} has not been promoted on social media.`,
            "Create Instagram Post",
        ));
    } else if (promotedDaysAgo !== null && promotedDaysAgo > 60) {
        recommendations.push(buildRecommendation(
            product,
            "dead_stock",
            "medium",
            "Product ignored for a long time",
            `${name} has not been promoted in over 60 days. Create an offer or reel.`,
            "Create Offer Post",
        ));
    }

    if (image && price && name && description) {
        recommendations.push(buildRecommendation(
            product,
            "ready_to_promote",
            "low",
            "Ready to promote",
            `${name} is ready for Instagram, WhatsApp, and store preview promotion.`,
            "Open Preview Studio",
        ));
    }

    return recommendations;
}

export function summarizeRecommendations(products = [], recommendations = []) {
    const open = recommendations.filter((item) => item.status !== "dismissed" && item.status !== "completed");
    return {
        totalProducts: products.length,
        lowStockCount: open.filter((item) => item.recommendation_type === "low_stock").length,
        notPromotedCount: open.filter((item) => item.recommendation_type === "not_promoted" || item.recommendation_type === "dead_stock").length,
        missingImagesCount: open.filter((item) => item.recommendation_type === "missing_image").length,
        missingDescriptionsCount: open.filter((item) => item.recommendation_type === "missing_description").length,
        readyToPromoteCount: open.filter((item) => item.recommendation_type === "ready_to_promote").length,
        highPriorityCount: open.filter((item) => item.priority === "high").length,
    };
}

export function groupRecommendations(recommendations = []) {
    return recommendationPriorityGroups.reduce((groups, group) => {
        groups[group.key] = recommendations.filter((item) => item.priority === group.key);
        return groups;
    }, {});
}
