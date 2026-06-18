import { supabase } from "./supabase";

export function normalizeRole(role) {
    const value = role?.toLowerCase();

    if (value === "admin") return "admin";
    if (value === "worker" || value === "partner") return "partner";

    return "client";
}

export function dashboardForRole(role) {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === "admin") return "/admin/orders";
    if (normalizedRole === "partner") return "/partner/tasks";

    return "/dashboard";
}

function withFallbackTimeout(promise, timeoutMs, fallback) {
    return Promise.race([
        promise,
        new Promise((resolve) => {
            setTimeout(() => resolve(fallback), timeoutMs);
        }),
    ]);
}

export async function getUserRole(userId) {
    if (!userId) return "client";

    try {
        const { data, error } = await withFallbackTimeout(
            supabase
                .from("users")
                .select("role")
                .eq("id", userId)
                .maybeSingle(),
            2000,
            { data: null, error: null }
        );

        if (error) {
            console.warn("Could not load user role.", error.message);
        }

        return normalizeRole(data?.role);
    } catch (error) {
        console.warn("Could not fetch user role.", error?.message || error);
        return "client";
    }
}
