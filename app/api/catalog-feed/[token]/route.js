import { NextResponse } from "next/server";
import { buildMetaCatalogCsv, normalizeFeedToken, publicBaseUrl } from "../../../lib/catalogFeed";
import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";
import { nowISTISOString } from "../../../lib/istDate";

export async function GET(request, { params }) {
    if (!hasSupabaseServiceRoleKey()) return new NextResponse("Catalog feed is not configured.", { status: 503 });

    const { token } = await params;
    const feedToken = normalizeFeedToken(token);
    const supabase = createSupabaseServiceRole();
    const { data: feed, error: feedError } = await supabase
        .from("catalog_feeds")
        .select("*")
        .eq("feed_token", feedToken)
        .eq("status", "active")
        .maybeSingle();

    if (feedError || !feed) return new NextResponse("Catalog feed not found.", { status: 404 });

    const { data: products, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", feed.client_id)
        .order("updated_at", { ascending: false });

    if (productError) return new NextResponse("Could not load products.", { status: 500 });

    await supabase
        .from("catalog_feeds")
        .update({ last_accessed_at: nowISTISOString(), updated_at: nowISTISOString() })
        .eq("id", feed.id);

    const csv = buildMetaCatalogCsv(products || [], { baseUrl: publicBaseUrl(request), token: feed.feed_token });
    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `inline; filename="orva-catalog-${feed.feed_token.slice(0, 8)}.csv"`,
            "Cache-Control": "no-store",
        },
    });
}
