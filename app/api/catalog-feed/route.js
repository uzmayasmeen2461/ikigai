import { NextResponse } from "next/server";
import { catalogFeedSummary, createFeedToken, publicBaseUrl } from "../../lib/catalogFeed";
import { createSupabaseServiceRole, createSupabaseUserClient, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to create catalog feed URLs." }, { status: 503 });

    const supabase = createSupabaseServiceRole();
    const userSupabase = createSupabaseUserClient(token);
    const { data: existing, error: existingError } = await supabase
        .from("catalog_feeds")
        .select("*")
        .eq("client_id", user.id)
        .maybeSingle();

    if (existingError) return NextResponse.json({ error: `${existingError.message || "Could not load catalog feed."} Run scripts/orva-catalog-feed.sql in Supabase.` }, { status: 500 });

    let feed = existing;
    if (!feed) {
        const { data, error } = await supabase
            .from("catalog_feeds")
            .insert({
                client_id: user.id,
                feed_token: createFeedToken(),
                status: "active",
            })
            .select("*")
            .single();

        if (error) return NextResponse.json({ error: `${error.message || "Could not create catalog feed."} Run scripts/orva-catalog-feed.sql in Supabase.` }, { status: 500 });
        feed = data;
    }

    const { data: products } = await userSupabase
        .from("products")
        .select("*")
        .eq("user_id", user.id);

    const baseUrl = publicBaseUrl(request);
    return NextResponse.json({
        feed,
        feed_url: `${baseUrl}/api/catalog-feed/${feed.feed_token}.csv`,
        summary: catalogFeedSummary(products || []),
        instructions: [
            "Open Meta Commerce Manager.",
            "Choose the client catalog.",
            "Add items using Data File.",
            "Choose Use a URL or Google Sheets.",
            "Paste this ORVA feed URL.",
            "Set a daily update schedule.",
        ],
    });
}
