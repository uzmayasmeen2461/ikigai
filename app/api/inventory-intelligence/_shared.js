import { NextResponse } from "next/server";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, getUserRole, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";

export async function requireUser(request) {
    const auth = await getAuthenticatedUser(request);
    if (auth.error || !auth.user) {
        return { errorResponse: NextResponse.json({ error: auth.error || "Not authenticated." }, { status: 401 }) };
    }
    return auth;
}

export async function clientForRequest(token, preferService = false) {
    if (preferService && hasSupabaseServiceRoleKey()) return createSupabaseServiceRole();
    return createSupabaseUserClient(token);
}

export async function roleForUser(userId) {
    const role = String(await getUserRole(userId) || "client").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "worker" || role === "partner") return "partner";
    return "client";
}

export async function loadProductsForUser(supabase, userId, role = "client", requestedClientId = "") {
    let query = supabase.from("products").select("*").order("updated_at", { ascending: false });
    if (role === "admin" && requestedClientId) {
        query = query.eq("user_id", requestedClientId);
    } else if (role !== "admin") {
        query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function loadOpenRecommendations(supabase, userId, role = "client", requestedClientId = "") {
    let query = supabase
        .from("inventory_recommendations")
        .select("*, products(*)")
        .eq("status", "open")
        .order("created_at", { ascending: false });

    if (role === "admin" && requestedClientId) {
        query = query.eq("client_id", requestedClientId);
    } else if (role !== "admin") {
        query = query.eq("client_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}
