import { NextResponse } from "next/server";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../../lib/supabaseServer";
import { nowISTISOString } from "../../../../lib/istDate";

export async function POST(request, { params }) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to update reel status." }, { status: 503 });

    const body = await request.json().catch(() => ({}));
    const supabase = createSupabaseServiceRole();
    const { data, error } = await supabase
        .from("reels")
        .update({
            status: "failed",
            error_message: String(body.error || "Reel enhancement failed.").slice(0, 500),
            updated_at: nowISTISOString(),
        })
        .eq("id", params.id)
        .eq("client_id", user.id)
        .select("*")
        .single();

    if (error) return NextResponse.json({ error: error.message || "Could not mark reel as failed." }, { status: 500 });
    return NextResponse.json({ reel: data });
}
