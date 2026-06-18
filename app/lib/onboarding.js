import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "./supabaseServer";

export const packageSeeds = [
    {
        name: "ORVA Inventory Ready",
        slug: "inventory-ready",
        price_amount: 5999,
        billing_cycle: "yearly",
        description: "For businesses that already have an inventory list.",
        features: [
            "Upload inventory list",
            "Upload product images",
            "AI image-to-product matching",
            "Product list creation",
            "Instagram post preview",
            "WhatsApp catalog preview",
            "Facebook, Instagram, and WhatsApp export options",
        ],
    },
    {
        name: "ORVA Photo-to-Inventory",
        slug: "photo-to-inventory",
        price_amount: 7999,
        billing_cycle: "yearly",
        description: "For businesses with only product photos and prices.",
        features: [
            "Upload product photos",
            "Add price for each image",
            "AI-generated product title",
            "AI-generated description",
            "Product list creation",
            "Instagram post preview",
            "WhatsApp catalog preview",
            "Facebook, Instagram, and WhatsApp export options",
        ],
    },
    {
        name: "Managed Social Maintenance",
        slug: "managed-social-maintenance",
        price_amount: 4999,
        billing_cycle: "monthly",
        description: "For clients who need digital setup specialist help every month.",
        features: [
            "Product updates",
            "Catalog updates",
            "Social media content support",
            "Specialist-assisted maintenance",
        ],
    },
];

export const onboardingStatusLabels = {
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    activated: "Activated",
    rejected: "Rejected",
};

export function defaultPackages() {
    return packageSeeds.map((item, index) => ({
        id: item.slug,
        is_active: true,
        created_at: new Date(2026, 0, index + 1).toISOString(),
        ...item,
    }));
}

export function amountLabel(amount = 0) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

export async function getUserRole(supabase, userId) {
    const { data } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    const role = String(data?.role || "client").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "partner" || role === "worker") return "partner";
    return "client";
}

export async function fetchPackages(supabase) {
    const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("price_amount", { ascending: true });

    if (error || !data?.length) return defaultPackages();
    return data;
}

export async function findPackageByFlow(supabase, selectedFlow) {
    const slug = selectedFlow === "photo_to_inventory" ? "photo-to-inventory" : "inventory-ready";
    const packages = await fetchPackages(supabase);
    return packages.find((item) => item.slug === slug) || null;
}

export async function getClientSubscription(supabase, clientId) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
        .from("subscriptions")
        .select("*, packages(name, slug, price_amount, billing_cycle)")
        .eq("client_id", clientId)
        .eq("status", "active")
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data || null;
}

export async function getLatestClientApplication(supabase, clientId) {
    const { data } = await supabase
        .from("client_applications")
        .select("*, packages(name, slug, price_amount, billing_cycle, features)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data || null;
}

export async function requireActiveSubscription(userId) {
    if (!hasSupabaseServiceRoleKey()) {
        return { ok: false, error: "ORVA account activation requires SUPABASE_SERVICE_ROLE_KEY on the server." };
    }

    const supabase = createSupabaseServiceRole();
    const subscription = await getClientSubscription(supabase, userId);
    if (!subscription) {
        return {
            ok: false,
            status: 402,
            error: "Your ORVA account is pending admin approval. Publishing and exports unlock after activation.",
        };
    }

    return { ok: true, subscription };
}
