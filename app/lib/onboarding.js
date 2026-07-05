import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "./supabaseServer";
import { istTodayISO } from "./istDate";

export const packageSeeds = [
    {
        name: "ORVA Free Trial",
        slug: "free-trial",
        price_amount: 0,
        billing_cycle: "one_time",
        description: "7 days of ORVA access to try inventory upload, previews, and basic publishing.",
        features: [
            "7-day free trial",
            "Inventory upload",
            "Product photo + price flow",
            "Preview Studio",
            "Basic social content",
            "Manual admin approval after trial",
        ],
    },
    {
        name: "ORVA Initial Setup",
        slug: "initial-setup",
        price_amount: 2000,
        billing_cycle: "one_time",
        description: "For businesses starting their first ORVA catalog and product workspace.",
        features: [
            "Initial ORVA setup",
            "Inventory list or photo + price onboarding",
            "AI image-to-product matching",
            "Product list creation",
            "Store and social preview setup",
            "Basic caption generation",
        ],
    },
    {
        name: "ORVA Catalog Management",
        slug: "catalog-management",
        price_amount: 7000,
        billing_cycle: "monthly",
        description: "For businesses that want WhatsApp catalog management and manual social channel work.",
        features: [
            "WhatsApp catalog management",
            "Manual Instagram and Facebook update support",
            "Catalog cleanup",
            "Product updates",
            "Digital setup specialist support",
        ],
    },
    {
        name: "ORVA Advanced Automation",
        slug: "advanced-automation",
        price_amount: 15000,
        billing_cycle: "monthly",
        description: "For businesses that want automated messaging, advanced campaigns, and growth features.",
        features: [
            "Advanced automation features",
            "Automated campaign scheduling",
            "Automated messaging support where available",
            "Priority publishing support",
            "Growth recommendations",
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
    const slug = "initial-setup";
    const packages = await fetchPackages(supabase);
    return packages.find((item) => item.slug === slug) || null;
}

export async function getTrialPackage(supabase) {
    const packages = await fetchPackages(supabase);
    return packages.find((item) => item.slug === "free-trial") || null;
}

export async function getClientSubscription(supabase, clientId) {
    const today = istTodayISO();
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

export async function ensureTrialSubscription(supabase, clientId, values = {}) {
    const activeSubscription = await getClientSubscription(supabase, clientId);
    if (activeSubscription) return activeSubscription;

    const trialPackage = await getTrialPackage(supabase);
    const start = istTodayISO();
    const end = new Date(`${start}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 6);

    const subscriptionValues = {
        client_id: clientId,
        package_id: trialPackage?.id || null,
        application_id: null,
        status: "active",
        start_date: start,
        end_date: end.toISOString().slice(0, 10),
        activated_email: values.email || null,
        activated_phone: values.phone || null,
    };

    let { data, error } = await supabase
        .from("subscriptions")
        .insert(subscriptionValues)
        .select("*, packages(name, slug, price_amount, billing_cycle)")
        .single();

    if (error && /activated_(email|phone)|schema cache|column/i.test(error.message || "")) {
        const { activated_email, activated_phone, ...fallbackValues } = subscriptionValues;
        const fallback = await supabase
            .from("subscriptions")
            .insert(fallbackValues)
            .select("*, packages(name, slug, price_amount, billing_cycle)")
            .single();
        data = fallback.data;
        error = fallback.error;
    }

    if (error) return null;
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
    const subscription = await ensureTrialSubscription(supabase, userId);
    if (!subscription) {
        return {
            ok: false,
            status: 402,
            error: "Your ORVA account is pending admin approval. Publishing and exports unlock after activation.",
        };
    }

    return { ok: true, subscription };
}
