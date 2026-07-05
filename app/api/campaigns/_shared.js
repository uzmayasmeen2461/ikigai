import { NextResponse } from "next/server";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";

export function campaignsSetupError() {
    return "AI Marketing Autopilot storage is not installed yet. Run scripts/orva-campaigns.sql in Supabase.";
}

export function isCampaignSchemaError(error) {
    return error?.code === "42P01" || error?.code === "42703" || /campaigns|campaign_items|campaign_item_logs/i.test(error?.message || "");
}

export async function routeParamId(context, key = "id") {
    const params = await context?.params;
    const value = params?.[key];
    return value && value !== "undefined" ? value : null;
}

export async function requireCampaignRequest(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return { errorResponse: NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 }) };
    }
    if (!hasSupabaseServiceRoleKey()) {
        return { errorResponse: NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before using AI Marketing Autopilot." }, { status: 503 }) };
    }
    return { user, supabase: createSupabaseServiceRole() };
}

export async function loadCampaign(supabase, userId, campaignId) {
    const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .eq("client_id", userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function loadProducts(supabase, userId, productIds = []) {
    let query = supabase
        .from("products")
        .select("*")
        .or(`user_id.eq.${userId},client_id.eq.${userId}`)
        .order("created_at", { ascending: false });
    if (Array.isArray(productIds) && productIds.length) query = query.in("id", productIds);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function loadCampaignItem(supabase, userId, itemId) {
    const { data, error } = await supabase
        .from("campaign_items")
        .select("*, campaigns!inner(*)")
        .eq("id", itemId)
        .eq("client_id", userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}
