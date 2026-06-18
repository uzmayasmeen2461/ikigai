import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getRole(supabase, userId) {
    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

    const role = data?.role?.toLowerCase();
    if (role === "admin") return "admin";
    if (role === "worker" || role === "partner") return "partner";
    return "client";
}

export async function GET(request, { params }) {
    const { billId } = await params;
    if (!uuidPattern.test(billId || "")) {
        return NextResponse.json({ error: "Invalid bill id." }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const role = await getRole(supabase, user.id);
    if (role === "partner") {
        return NextResponse.json({ error: "Partners cannot access billing." }, { status: 403 });
    }

    const { data: bill, error } = await supabase
        .from("bills")
        .select("*")
        .eq("id", billId)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message || "Could not load bill." }, { status: 500 });
    }

    if (!bill) {
        return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }

    if (role !== "admin" && bill.client_id !== user.id) {
        return NextResponse.json({ error: "You cannot access this bill." }, { status: 403 });
    }

    const { data: items } = await supabase
        .from("bill_items")
        .select("*")
        .eq("bill_id", bill.id);

    return NextResponse.json({ bill: { ...bill, items: items || [] } });
}
