import { NextResponse } from "next/server";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";
import { nowISTISOString } from "../../lib/istDate";

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (!body.basic_video_url) return NextResponse.json({ error: "Create or upload a basic reel first." }, { status: 400 });

    const supabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : createSupabaseUserClient(token);
    const payload = {
        client_id: user.id,
        product_ids: Array.isArray(body.product_ids) ? body.product_ids : [],
        selected_image_urls: Array.isArray(body.selected_image_urls) ? body.selected_image_urls : [],
        basic_video_url: String(body.basic_video_url || ""),
        audio_url: String(body.audio_url || "").trim(),
        audio_track_name: String(body.audio_track_name || "").trim(),
        hook_text: String(body.hook_text || "New arrival for you").trim(),
        cta_text: String(body.cta_text || "DM to order").trim(),
        music_style: String(body.music_style || "soft").trim(),
        status: "basic_generated",
        updated_at: nowISTISOString(),
    };

    const buildQuery = (values) => body.id
        ? supabase.from("reels").update(values).eq("id", body.id).eq("client_id", user.id).select("*").single()
        : supabase.from("reels").insert(values).select("*").single();

    let { data, error } = await buildQuery(payload);
    if (error && String(error.message || "").includes("audio")) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.audio_url;
        delete fallbackPayload.audio_track_name;
        const fallback = await buildQuery(fallbackPayload);
        data = fallback.data;
        error = fallback.error;
    }
    if (error) return NextResponse.json({ error: `${error.message || "Could not save reel."} Run scripts/orva-ai-reel-enhancer.sql in Supabase if needed.` }, { status: 500 });
    return NextResponse.json({ reel: data });
}
