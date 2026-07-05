import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../lib/supabaseServer";
import { syncChannels, syncProductToChannel } from "../../lib/sync";
import { nowISTISOString } from "../../lib/istDate";

async function runSync(supabase, userId, products, channels = syncChannels) {
    const logs = [];
    for (const product of products) {
        for (const channel of channels) {
            const result = await syncProductToChannel(product, channel);
            logs.push({
                user_id: userId,
                product_id: product.id,
                channel,
                status: result.ok ? "synced" : "failed",
                external_id: result.external_id || null,
                error_message: result.error_message || null,
                last_synced_at: nowISTISOString(),
            });
        }
    }

    const { data, error } = await supabase.from("sync_logs").insert(logs).select("*");
    if (error) throw error;
    return data || [];
}

export async function GET(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const supabase = createSupabaseUserClient(token);
    const { data, error } = await supabase
        .from("sync_logs")
        .select("*, products(name, product_name, sku, product_code)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(150);

    if (error) return NextResponse.json({ error: error.message || "Could not load sync logs." }, { status: 500 });
    return NextResponse.json({ logs: data || [] });
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const supabase = createSupabaseUserClient(token);
    let query = supabase.from("products").select("*").eq("user_id", user.id);
    if (body.product_id) query = query.eq("id", body.product_id);

    const { data: products, error } = await query;
    if (error) return NextResponse.json({ error: error.message || "Could not load products." }, { status: 500 });
    if (!products?.length) return NextResponse.json({ error: "Add products before running sync." }, { status: 400 });

    try {
        const logs = await runSync(supabase, user.id, products);
        return NextResponse.json({ logs }, { status: 201 });
    } catch (syncError) {
        return NextResponse.json({ error: syncError.message || "Could not sync products." }, { status: 500 });
    }
}

