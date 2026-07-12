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

export const reelMusicLibrary = [
    {
        id: "fashion_01",
        name: "Runway Pop",
        style: "trendy",
        mood: "Bright, stylish, upbeat",
        bestFor: "Fashion drops, boutique launches, outfit reels",
        url: "/orva-music/fashion_01.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "fashion_02",
        name: "Boutique Trend",
        style: "trendy",
        mood: "Clean, confident, social-first",
        bestFor: "Clothing collections, accessories, daily product posts",
        url: "/orva-music/fashion_02.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "fashion_03",
        name: "Offer Spotlight",
        style: "trendy",
        mood: "Fast, catchy, promotional",
        bestFor: "Sale reels, new arrivals, limited-time offers",
        url: "/orva-music/fashion_03.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "beauty_01",
        name: "Beauty Glow",
        style: "soft",
        mood: "Smooth, polished, fresh",
        bestFor: "Beauty products, skincare, cosmetics, salon posts",
        url: "/orva-music/beauty_01.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "luxury_01",
        name: "Premium Reveal",
        style: "luxury",
        mood: "Elegant, slow, high-end",
        bestFor: "Jewellery, premium fashion, decor, high-value products",
        url: "/orva-music/luxury_01.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "luxury_02",
        name: "Elegant Showcase",
        style: "luxury",
        mood: "Minimal, refined, premium",
        bestFor: "Luxury product close-ups, clean brand reels",
        url: "/orva-music/luxury_02.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "modern_01",
        name: "Modern Brand Beat",
        style: "trendy",
        mood: "Upbeat, crisp, professional",
        bestFor: "Multi-product reels, service promos, brand intros",
        url: "/orva-music/modern_01.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
    {
        id: "modern_soft_01",
        name: "Soft Product Story",
        style: "soft",
        mood: "Calm, warm, gentle",
        bestFor: "Product explainers, trust-building reels, service brands",
        url: "/orva-music/modern_soft_01.mp3",
        source: "Pixabay Music",
        license: "Commercial social video use allowed",
    },
];

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
