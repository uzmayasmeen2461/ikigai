import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";

function normalizeRole(role) {
    const value = role?.toLowerCase();
    if (value === "worker" || value === "partner") return "partner";
    if (value === "admin") return "admin";
    return "client";
}

function isValidUpiId(value = "") {
    return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(value);
}

function profilePayload(profile = {}) {
    return {
        upi_id: profile.upi_id || "",
    };
}

async function getPartnerProfile(supabase, user) {
    const { data, error } = await supabase
        .from("users")
        .select("id, role, upi_id")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        return { profile: null, error };
    }

    return { profile: data, error: null };
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { profile, error } = await getPartnerProfile(supabase, user);

    if (error) {
        return NextResponse.json({ error: error.message || "Could not load payout details." }, { status: 500 });
    }

    if (!profile) {
        return NextResponse.json(profilePayload(), { status: 200 });
    }

    if (normalizeRole(profile.role) !== "partner") {
        return NextResponse.json({ error: "Only partners can manage payout details." }, { status: 403 });
    }

    return NextResponse.json(profilePayload(profile));
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const upiId = String(body.upi_id || body.upiId || "").trim().toLowerCase();

    if (!isValidUpiId(upiId)) {
        return NextResponse.json({ error: "Enter a valid UPI ID, like name@bank." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { profile, error: profileError } = await getPartnerProfile(supabase, user);

    if (profileError) {
        return NextResponse.json({ error: profileError.message || "Could not check partner profile." }, { status: 500 });
    }

    if (profile && normalizeRole(profile.role) !== "partner") {
        return NextResponse.json({ error: "Only partners can manage payout details." }, { status: 403 });
    }

    const query = profile
        ? supabase
            .from("users")
            .update({ upi_id: upiId })
            .eq("id", user.id)
            .select("upi_id")
            .single()
        : supabase
            .from("users")
            .insert({
                id: user.id,
                role: "partner",
                upi_id: upiId,
            })
            .select("upi_id")
            .single();

    const { data, error } = await query;

    if (error) {
        const missingColumn = error.message?.includes("upi_id");
        return NextResponse.json(
            {
                error: missingColumn
                    ? "Add users.upi_id in Supabase SQL before saving payout details."
                    : error.message || "Could not save payout details.",
            },
            { status: 500 }
        );
    }

    return NextResponse.json(profilePayload(data));
}
