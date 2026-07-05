import {
    formatInventoryStatus,
    productCode,
    productName,
    productNotes,
    productStock,
} from "./inventory";
import { formatINR } from "./pricing";

function productImage(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

function hasDescription(product = {}) {
    return Boolean(productNotes(product));
}

function isPromoted(product = {}) {
    return Boolean(product.last_promoted_at || Number(product.promotion_count || 0) > 0);
}

function daysSince(dateValue) {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function readinessScore(product = {}) {
    let score = 0;
    if (productName(product) && productName(product) !== "Product") score += 20;
    if (Number(product.price || 0) > 0) score += 20;
    if (productStock(product) > 0) score += 20;
    if (productImage(product)) score += 20;
    if (hasDescription(product)) score += 10;
    if (!isPromoted(product)) score += 10;
    return score;
}

function scoreReason(product = {}) {
    const reasons = [];
    if (productStock(product) > 3) reasons.push("has enough stock");
    if (productImage(product)) reasons.push("has an image");
    if (Number(product.price || 0) > 0) reasons.push("has a clear price");
    if (!isPromoted(product)) reasons.push("has not been promoted yet");
    if (!reasons.length) return "needs a few product details before promotion";
    return reasons.slice(0, 3).join(", ");
}

export function buildGrowthAssistant(products = []) {
    const activeProducts = products.filter((product) => product.status !== "hidden");
    const inStock = activeProducts.filter((product) => productStock(product) > 0);
    const outOfStock = activeProducts.filter((product) => productStock(product) <= 0);
    const lowStock = inStock.filter((product) => productStock(product) <= Number(product.low_stock_threshold || 3));
    const missingImages = activeProducts.filter((product) => !productImage(product));
    const missingDescriptions = activeProducts.filter((product) => !hasDescription(product));
    const notPromoted = inStock.filter((product) => !isPromoted(product));
    const ignored = inStock.filter((product) => {
        const promotedDaysAgo = daysSince(product.last_promoted_at);
        return promotedDaysAgo !== null && promotedDaysAgo >= 45;
    });
    const readyToPost = inStock
        .filter((product) => productImage(product) && Number(product.price || 0) > 0 && hasDescription(product))
        .sort((a, b) => readinessScore(b) - readinessScore(a));
    const bestToPromote = [...inStock]
        .sort((a, b) => readinessScore(b) - readinessScore(a))
        .slice(0, 5);

    const heroProduct = bestToPromote[0] || inStock[0] || activeProducts[0] || null;

    return {
        summary: {
            totalProducts: activeProducts.length,
            inStock: inStock.length,
            outOfStock: outOfStock.length,
            lowStock: lowStock.length,
            missingImages: missingImages.length,
            readyToPost: readyToPost.length,
            notPromoted: notPromoted.length,
        },
        heroProduct: heroProduct ? enrichProduct(heroProduct) : null,
        bestToPromote: bestToPromote.map(enrichProduct),
        attention: [
            ...lowStock.slice(0, 3).map((product) => ({
                type: "Low stock",
                title: `${productName(product)} is running low`,
                description: `Only ${productStock(product)} left. Promote it as a limited-stock item or restock before posting heavily.`,
                action: "Create limited-stock offer",
                product: enrichProduct(product),
            })),
            ...missingImages.slice(0, 3).map((product) => ({
                type: "Needs image",
                title: `${productName(product)} needs a product photo`,
                description: "Add a clean image before posting it on Instagram, Facebook, or WhatsApp.",
                action: "Upload image",
                product: enrichProduct(product),
            })),
            ...missingDescriptions.slice(0, 3).map((product) => ({
                type: "Needs copy",
                title: `${productName(product)} needs a better description`,
                description: "A short benefit-led description will make posts and catalog previews stronger.",
                action: "Generate description",
                product: enrichProduct(product),
            })),
        ].slice(0, 6),
        campaigns: buildCampaigns({ heroProduct, bestToPromote, lowStock, ignored, outOfStock }),
        weeklyPlan: buildWeeklyPlan(bestToPromote, lowStock, readyToPost, notPromoted),
        offers: buildOffers(bestToPromote, lowStock, ignored),
        messages: buildSalesMessages(heroProduct),
    };
}

function enrichProduct(product = {}) {
    return {
        ...product,
        displayName: productName(product),
        displayCode: productCode(product),
        displayStock: productStock(product),
        displayStatus: formatInventoryStatus(product.status),
        displayPrice: formatINR(product.price || 0),
        displayImage: productImage(product),
        score: readinessScore(product),
        reason: scoreReason(product),
    };
}

function buildCampaigns({ heroProduct, bestToPromote = [], lowStock = [], ignored = [], outOfStock = [] }) {
    const hero = heroProduct ? enrichProduct(heroProduct) : null;
    const second = bestToPromote[1] ? enrichProduct(bestToPromote[1]) : hero;
    const low = lowStock[0] ? enrichProduct(lowStock[0]) : hero;
    const old = ignored[0] ? enrichProduct(ignored[0]) : second;
    const soldOut = outOfStock[0] ? enrichProduct(outOfStock[0]) : null;
    return [
        hero && {
            title: "New Arrival Push",
            bestFor: hero.displayName,
            description: `Post ${hero.displayName} as today’s fresh pick with price, product code, and a clear DM-to-order CTA.`,
            channels: ["Instagram", "Facebook", "WhatsApp"],
        },
        low && {
            title: "Limited Stock Alert",
            bestFor: low.displayName,
            description: `Use urgency: “Only ${low.displayStock} left.” This works well for WhatsApp status and Instagram stories.`,
            channels: ["WhatsApp", "Instagram"],
        },
        old && {
            title: "Rediscovery Post",
            bestFor: old.displayName,
            description: `Bring attention back to ${old.displayName} with a fresh caption, better photo, or short reel.`,
            channels: ["Instagram", "Facebook"],
        },
        soldOut && {
            title: "Restock Interest",
            bestFor: soldOut.displayName,
            description: `Ask customers if they want ${soldOut.displayName} back in stock. This can reveal demand before restocking.`,
            channels: ["WhatsApp", "Instagram"],
        },
    ].filter(Boolean);
}

function buildWeeklyPlan(bestToPromote = [], lowStock = [], readyToPost = [], notPromoted = []) {
    const picks = [...bestToPromote, ...readyToPost, ...notPromoted].filter(Boolean);
    const pick = (index) => enrichProduct(picks[index % Math.max(picks.length, 1)] || {});
    const low = lowStock[0] ? enrichProduct(lowStock[0]) : pick(1);
    return [
        { day: "Monday", theme: "New arrival", task: `Post ${pick(0).displayName || "a ready product"} with price and product code.` },
        { day: "Tuesday", theme: "WhatsApp reminder", task: `Share a simple order message for ${pick(1).displayName || "your best product"}.` },
        { day: "Wednesday", theme: "Reel idea", task: `Create a short reel showing 3 product images and a “DM to order” CTA.` },
        { day: "Thursday", theme: "Limited stock", task: `Promote ${low.displayName || "a low-stock item"} as limited availability.` },
        { day: "Friday", theme: "Offer post", task: `Create a weekend offer around ${pick(2).displayName || "a featured product"}.` },
        { day: "Saturday", theme: "Catalog push", task: "Share your catalog link or WhatsApp product list with customers." },
        { day: "Sunday", theme: "Clean up", task: "Add missing images, descriptions, and prices before next week." },
    ];
}

function buildOffers(bestToPromote = [], lowStock = [], ignored = []) {
    const hero = bestToPromote[0] ? enrichProduct(bestToPromote[0]) : null;
    const low = lowStock[0] ? enrichProduct(lowStock[0]) : hero;
    const old = ignored[0] ? enrichProduct(ignored[0]) : bestToPromote[1] ? enrichProduct(bestToPromote[1]) : hero;
    return [
        hero && `Weekend pick: ${hero.displayName} at ${hero.displayPrice}. DM product code ${hero.displayCode || "now"} to order.`,
        low && `Limited stock: Only ${low.displayStock} ${low.displayName} left. Book yours today.`,
        old && `Fresh spotlight: ${old.displayName} is back in focus this week. Ask us for photos and details.`,
    ].filter(Boolean);
}

function buildSalesMessages(product) {
    const item = product ? enrichProduct(product) : null;
    const name = item?.displayName || "this product";
    const code = item?.displayCode || "the product code";
    const price = item?.displayPrice || "the listed price";
    return {
        inquiryReply: `Hi! Yes, ${name} is available at ${price}. To order, send ${code} and your delivery details.`,
        followUp: `Hi! Just checking if you are still interested in ${name}. I can help you place the order today.`,
        restock: `Good news! ${name} is available again. Reply with ${code} to book yours.`,
        broadcast: `Today’s ORVA pick: ${name} at ${price}. Message us with ${code} to order.`,
    };
}
