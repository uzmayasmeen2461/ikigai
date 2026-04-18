import { supabase } from "./supabase";

export function normalizeRole(role) {
    const value = role?.toLowerCase();

    if (value === "admin") return "admin";
    if (value === "worker" || value === "partner") return "partner";

    return "client";
}

export function dashboardForRole(role) {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === "admin") return "/admin";
    if (normalizedRole === "partner") return "/worker";

    return "/dashboard";
}

export async function getUserRole(userId) {
    if (!userId) return "client";

    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

    return normalizeRole(data?.role);
}
