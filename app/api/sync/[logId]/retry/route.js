import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../../../lib/supabaseServer";
import { syncProductToChannel } from "../../../../lib/sync";

export async function POST(request, { params }) {
    const { logId } = await params;
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const supabase = createSupabaseUserClient(token);
    const { data: log } = await supabase.from("sync_logs").select("*").eq("id", logId).eq("user_id", user.id).maybeSingle();
    if (!log) return NextResponse.json({ error: "Sync log not found." }, { status: 404 });

    const { data: product } = await supabase.from("products").select("*").eq("id", log.product_id).eq("user_id", user.id).maybeSingle();
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const result = await syncProductToChannel(product, log.channel);
    const { data, error } = await supabase
        .from("sync_logs")
        .update({
            status: result.ok ? "synced" : "failed",
            external_id: result.external_id || null,
            error_message: result.error_message || null,
            last_synced_at: new Date().toISOString(),
        })
        .eq("id", log.id)
        .select("*")
        .single();

    if (error) return NextResponse.json({ error: error.message || "Could not retry sync." }, { status: 500 });
    return NextResponse.json({ log: data });
}

