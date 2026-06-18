import { NextResponse } from "next/server";
import { getUserRole } from "../../../lib/onboarding";
import { enhancedReelLimitForSubscription, getCurrentMonthKey } from "../../../lib/reels";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to load reel usage." }, { status: 503 });

    const userSupabase = createSupabaseUserClient(token);
    const role = await getUserRole(userSupabase, user.id);
    if (role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const supabase = createSupabaseServiceRole();
    const month = getCurrentMonthKey();
    const [{ data: usage, error: usageError }, { data: reels, error: reelsError }, { data: subscriptions }] = await Promise.all([
        supabase.from("reel_usage").select("*").eq("month", month).order("updated_at", { ascending: false }),
        supabase.from("reels").select("*").order("updated_at", { ascending: false }).limit(100),
        supabase.from("subscriptions").select("*, packages(name, slug)").eq("status", "active"),
    ]);

    if (usageError || reelsError) return NextResponse.json({ error: usageError?.message || reelsError?.message || "Could not load reel usage." }, { status: 500 });

    const clientIds = [...new Set([...(usage || []).map((row) => row.client_id), ...(reels || []).map((row) => row.client_id)].filter(Boolean))];
    let users = [];
    if (clientIds.length) {
        const { data } = await supabase.from("users").select("id, name, email").in("id", clientIds);
        users = data || [];
    }

    const userMap = Object.fromEntries(users.map((row) => [row.id, row]));
    const subscriptionMap = Object.fromEntries((subscriptions || []).map((row) => [row.client_id, row]));
    const reelMap = (reels || []).reduce((map, reel) => {
        if (!map[reel.client_id]) map[reel.client_id] = [];
        map[reel.client_id].push(reel);
        return map;
    }, {});

    return NextResponse.json({
        month,
        clients: clientIds.map((clientId) => {
            const usageRow = (usage || []).find((row) => row.client_id === clientId) || {};
            const subscription = subscriptionMap[clientId] || {};
            const clientReels = reelMap[clientId] || [];
            return {
                client: userMap[clientId] || { id: clientId, email: "Unknown client" },
                plan: subscription?.packages?.name || "No active plan",
                monthlyLimit: subscription?.id ? enhancedReelLimitForSubscription(subscription) : 0,
                enhancedReelsUsed: Number(usageRow.enhanced_reels_count || 0),
                basicReelsCount: Number(usageRow.basic_reels_count || 0),
                lastGeneratedReel: clientReels[0] || null,
                failedEnhancements: clientReels.filter((reel) => reel.status === "failed"),
            };
        }),
    });
}
