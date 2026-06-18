import { NextResponse } from "next/server";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";

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
        hook_text: String(body.hook_text || "New arrival for you").trim(),
        cta_text: String(body.cta_text || "DM to order").trim(),
        music_style: String(body.music_style || "soft").trim(),
        status: "basic_generated",
        updated_at: new Date().toISOString(),
    };

    const query = body.id
        ? supabase.from("reels").update(payload).eq("id", body.id).eq("client_id", user.id).select("*").single()
        : supabase.from("reels").insert(payload).select("*").single();

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: `${error.message || "Could not save reel."} Run scripts/orva-ai-reel-enhancer.sql in Supabase if needed.` }, { status: 500 });
    return NextResponse.json({ reel: data });
}
