import { NextResponse } from "next/server";
import {
    fetchPackages,
    ensureTrialSubscription,
    findPackageByFlow,
    getClientSubscription,
    getLatestClientApplication,
} from "../../../lib/onboarding";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

function cleanText(value = "") {
    return String(value || "").trim();
}

function normalizeEmail(value = "") {
    return cleanText(value).toLowerCase();
}

function isValidEmail(value = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizeEmail(value));
}

function isValidPhone(value = "") {
    const digits = cleanText(value).replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for ORVA onboarding." }, { status: 503 });
    }

    const supabase = createSupabaseServiceRole();
    const [packages, application, existingSubscription] = await Promise.all([
        fetchPackages(supabase),
        getLatestClientApplication(supabase, user.id),
        getClientSubscription(supabase, user.id),
    ]);
    const subscription = existingSubscription || await ensureTrialSubscription(supabase, user.id, { email: user.email });

    return NextResponse.json({
        packages,
        application,
        subscription,
        active: Boolean(subscription),
    });
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for ORVA onboarding." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const selectedFlow = body.selected_flow === "photo_to_inventory" ? "photo_to_inventory" : "inventory_ready";
    const businessName = cleanText(body.business_name);
    const ownerName = cleanText(body.owner_name);
    const phone = cleanText(body.phone);
    const email = normalizeEmail(body.email || user.email);
    if (!businessName || !ownerName || !phone || !email) {
        return NextResponse.json({ error: "Business name, owner name, phone, and email are required." }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
        return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRole();
    const selectedPackage = await findPackageByFlow(supabase, selectedFlow);
    if (!selectedPackage?.id) {
        return NextResponse.json({ error: "Selected ORVA package is not configured. Run scripts/orva-manual-onboarding.sql." }, { status: 500 });
    }

    const existingChannels = Array.isArray(body.existing_channels) ? body.existing_channels : [];
    const { data, error } = await supabase
        .from("client_applications")
        .insert({
            client_id: user.id,
            business_name: businessName,
            owner_name: ownerName,
            phone,
            email,
            selected_flow: selectedFlow,
            selected_package_id: selectedPackage.id,
            wants_managed_service: Boolean(body.wants_managed_service),
            estimated_product_count: Number(body.estimated_product_count || 0),
            existing_channels: existingChannels,
            notes: cleanText(body.notes),
            status: "submitted",
        })
        .select("*, packages(name, slug, price_amount, billing_cycle, features)")
        .single();

    if (error) return NextResponse.json({ error: error.message || "Could not submit application." }, { status: 500 });
    return NextResponse.json({
        application: data,
        message: "Your ORVA application has been submitted. Admin will review it and activate your workspace after approval.",
    }, { status: 201 });
}
