import { NextResponse } from "next/server";
import { getClientSubscription, requireActiveSubscription } from "../../../lib/onboarding";
import { enhancedReelLimitForSubscription, getCurrentMonthKey, normalizeTemplateName, reelMusicStyles } from "../../../lib/reels";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

function cleanBoolean(value, fallback = true) {
    if (typeof value === "boolean") return value;
    return fallback;
}

async function getOrCreateUsage(supabase, clientId, month) {
    const { data } = await supabase
        .from("reel_usage")
        .select("*")
        .eq("client_id", clientId)
        .eq("month", month)
        .maybeSingle();

    if (data) return data;

    const { data: created, error } = await supabase
        .from("reel_usage")
        .insert({
            client_id: clientId,
            month,
            basic_reels_count: 0,
            enhanced_reels_count: 0,
        })
        .select("*")
        .single();

    if (error) throw error;
    return created;
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to enhance reels." }, { status: 503 });

    const subscriptionCheck = await requireActiveSubscription(user.id);
    if (!subscriptionCheck.ok) {
        return NextResponse.json({ error: subscriptionCheck.error }, { status: subscriptionCheck.status || 402 });
    }

    const body = await request.json().catch(() => ({}));
    const reelId = String(body.reelId || "").trim();
    if (!reelId) return NextResponse.json({ error: "Choose a reel before enhancing." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    const { data: reel, error: reelError } = await supabase
        .from("reels")
        .select("*")
        .eq("id", reelId)
        .eq("client_id", user.id)
        .maybeSingle();

    if (reelError) return NextResponse.json({ error: reelError.message || "Could not load reel." }, { status: 500 });
    if (!reel) return NextResponse.json({ error: "Reel not found." }, { status: 404 });
    if (!reel.basic_video_url) return NextResponse.json({ error: "Generate a basic reel before enhancing." }, { status: 400 });

    const subscription = subscriptionCheck.subscription || await getClientSubscription(supabase, user.id);
    const limit = enhancedReelLimitForSubscription(subscription);
    const month = getCurrentMonthKey();
    const usage = await getOrCreateUsage(supabase, user.id, month);
    const used = Number(usage.enhanced_reels_count || 0);
    if (used >= limit) {
        return NextResponse.json({
            error: "You have used your enhanced reel credits for this month. Upgrade your plan or request extra reels.",
        }, { status: 402 });
    }

    const template = normalizeTemplateName(body.templateName);
    const musicStyle = reelMusicStyles.includes(body.musicStyle) ? body.musicStyle : template.musicStyle;
    const enhancedVideoUrl = String(body.enhancedVideoUrl || "").trim() || (process.env.REEL_RENDER_MOCK_MODE === "true" || process.env.NEXT_PUBLIC_META_MOCK_MODE === "true" ? reel.basic_video_url : "");
    if (!enhancedVideoUrl) {
        return NextResponse.json({
            error: "Premium reel rendering is browser-based in this MVP. Generate the enhanced video in Reel Studio, then save it.",
        }, { status: 400 });
    }

    await supabase
        .from("reels")
        .update({
            status: "enhancing",
            error_message: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", reel.id)
        .eq("client_id", user.id);

    const patch = {
        enhanced_video_url: enhancedVideoUrl,
        template_name: template.name,
        hook_text: String(body.hookText || template.hookText).trim(),
        cta_text: String(body.ctaText || template.ctaText).trim(),
        music_style: musicStyle,
        status: "enhanced",
        error_message: null,
        updated_at: new Date().toISOString(),
        metadata: {
            showPriceOverlay: cleanBoolean(body.showPriceOverlay, true),
            showOfferBadge: cleanBoolean(body.showOfferBadge, true),
            showWatermark: cleanBoolean(body.showWatermark, true),
            renderer: "browser-template",
        },
    };

    const { data: updated, error: updateError } = await supabase
        .from("reels")
        .update(patch)
        .eq("id", reel.id)
        .eq("client_id", user.id)
        .select("*")
        .single();

    if (updateError) return NextResponse.json({ error: updateError.message || "Could not save enhanced reel." }, { status: 500 });

    await supabase
        .from("reel_usage")
        .update({
            enhanced_reels_count: used + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", usage.id);

    return NextResponse.json({
        reel: updated,
        usage: {
            month,
            enhancedReelsLimit: limit,
            enhancedReelsUsed: used + 1,
            enhancedReelsRemaining: Math.max(0, limit - used - 1),
        },
        message: "Premium reel generated.",
    });
}
