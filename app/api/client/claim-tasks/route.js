import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const email = String(user.email || "").trim().toLowerCase();

        if (!email) {
            return NextResponse.json({ claimed: 0 });
        }

        const supabase = createSupabaseAdmin();
        const { data, error } = await supabase
            .from("tasks")
            .update({ client_id: user.id })
            .is("client_id", null)
            .ilike("client_email", email)
            .select("id");

        if (error) {
            return NextResponse.json(
                { error: error.message || "Could not link guest purchases." },
                { status: 500 }
            );
        }

        return NextResponse.json({ claimed: data?.length || 0 });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not link guest purchases." },
            { status: 500 }
        );
    }
}
