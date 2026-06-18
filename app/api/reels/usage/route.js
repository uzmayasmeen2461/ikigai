import { NextResponse } from "next/server";
import { enhancedReelLimitForSubscription, getCurrentMonthKey } from "../../../lib/reels";
import { getClientSubscription } from "../../../lib/onboarding";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const supabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : createSupabaseUserClient(token);
    const subscription = await getClientSubscription(supabase, user.id);
    const limit = subscription ? enhancedReelLimitForSubscription(subscription) : 0;
    const month = getCurrentMonthKey();

    const { data } = await supabase
        .from("reel_usage")
        .select("*")
        .eq("client_id", user.id)
        .eq("month", month)
        .maybeSingle();

    const used = Number(data?.enhanced_reels_count || 0);
    return NextResponse.json({
        planName: subscription?.packages?.name || "Pending activation",
        active: Boolean(subscription),
        month,
        enhancedReelsLimit: limit,
        enhancedReelsUsed: used,
        enhancedReelsRemaining: Math.max(0, limit - used),
    });
}
