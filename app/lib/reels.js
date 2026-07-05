export const reelTemplates = [
    {
        id: "premium-sale",
        name: "Premium Sale",
        description: "Bold offer-led reel with price and urgency.",
        bestFor: "Boutiques, grocery, seasonal sales",
        styleLabel: "Sale energy",
        filter: "bright",
        hookText: "Today only offer",
        ctaText: "Message us to order",
        musicStyle: "trendy",
    },
    {
        id: "new-arrival",
        name: "New Arrival",
        description: "Clean reveal for fresh products and collections.",
        bestFor: "Fashion, accessories, gift stores",
        styleLabel: "Fresh launch",
        filter: "crisp",
        hookText: "New arrival for you",
        ctaText: "DM to order",
        musicStyle: "soft",
    },
    {
        id: "best-sellers",
        name: "Best Sellers",
        description: "Fast product highlights for popular items.",
        bestFor: "High-moving local products",
        styleLabel: "Top picks",
        filter: "crisp",
        hookText: "Customer favourites",
        ctaText: "Ask for availability",
        musicStyle: "trendy",
    },
    {
        id: "festival-offer",
        name: "Festival Offer",
        description: "Warm festive styling for offers and bundles.",
        bestFor: "Festive sales, hampers, apparel",
        styleLabel: "Festive promo",
        filter: "warm",
        hookText: "Festival picks are here",
        ctaText: "Book yours today",
        musicStyle: "festive",
    },
    {
        id: "luxury-showcase",
        name: "Luxury Product Showcase",
        description: "Slow premium reveal with elegant overlay.",
        bestFor: "Jewellery, premium fashion, decor",
        styleLabel: "Luxury reveal",
        filter: "luxury",
        hookText: "A premium pick for you",
        ctaText: "Message us for details",
        musicStyle: "luxury",
    },
];

export const reelMusicStyles = ["soft", "trendy", "luxury", "festive", "no_music"];

export const reelPlanLimits = {
    starter: 5,
    "inventory-ready": 5,
    "photo-to-inventory": 5,
    growth: 20,
    managed: 50,
    "managed-social-maintenance": 50,
};

import { istNow } from "./istDate";

export function getCurrentMonthKey(date = istNow()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizeTemplateName(value) {
    const clean = String(value || "").trim().toLowerCase();
    return reelTemplates.find((template) => template.id === clean || template.name.toLowerCase() === clean) || reelTemplates[0];
}

export function enhancedReelLimitForSubscription(subscription = {}) {
    const slug = String(subscription?.packages?.slug || subscription?.package_slug || subscription?.slug || "").toLowerCase();
    const name = String(subscription?.packages?.name || subscription?.package_name || "").toLowerCase();
    if (slug.includes("managed") || name.includes("managed")) return reelPlanLimits.managed;
    if (slug.includes("growth") || name.includes("growth")) return reelPlanLimits.growth;
    return reelPlanLimits[slug] || reelPlanLimits.starter;
}

export function titleForReel(reel = {}) {
    return reel.name || reel.title || reel.hook_text || "ORVA Reel";
}
