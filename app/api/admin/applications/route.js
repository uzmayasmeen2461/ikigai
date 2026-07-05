import { NextResponse } from "next/server";
import { getUserRole } from "../../../lib/onboarding";
import { sendActivationEmail } from "../../../lib/onboardingEmail";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";
import { nowISTISOString, toISTISOString } from "../../../lib/istDate";

function cleanText(value = "") {
    return String(value || "").trim();
}

async function requireAdmin(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return { response: NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 }) };
    if (!hasSupabaseServiceRoleKey()) {
        return { response: NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required for admin applications." }, { status: 503 }) };
    }

    const supabase = createSupabaseServiceRole();
    const role = await getUserRole(supabase, user.id);
    if (role !== "admin") return { response: NextResponse.json({ error: "Only admin can manage applications." }, { status: 403 }) };
    return { user, supabase };
}

export async function GET(request) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { data, error } = await auth.supabase
        .from("client_applications")
        .select("*, packages(name, slug, price_amount, billing_cycle)")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message || "Could not load applications." }, { status: 500 });
    return NextResponse.json({ applications: data || [] });
}

async function activateApplication(supabase, application) {
    const startDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("application_id", application.id)
        .maybeSingle();

    const subscriptionValues = {
        client_id: application.client_id,
        activated_email: cleanText(application.email).toLowerCase(),
        activated_phone: cleanText(application.phone),
        package_id: application.selected_package_id,
        application_id: application.id,
        status: "active",
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
    };

    const writeSubscription = (values) => existingSubscription?.id
        ? supabase.from("subscriptions").update(values).eq("id", existingSubscription.id)
        : supabase.from("subscriptions").insert(values);

    let { error: subscriptionError } = await writeSubscription(subscriptionValues);
    if (subscriptionError && /activated_(email|phone)|schema cache|column/i.test(subscriptionError.message || "")) {
        const { activated_email, activated_phone, ...fallbackValues } = subscriptionValues;
        const fallbackResult = await writeSubscription(fallbackValues);
        subscriptionError = fallbackResult.error;
    }
    if (subscriptionError) throw subscriptionError;

    const { error: applicationError } = await supabase
        .from("client_applications")
        .update({ status: "activated", updated_at: nowISTISOString() })
        .eq("id", application.id);
    if (applicationError) throw applicationError;
}

export async function PATCH(request) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const applicationId = cleanText(body.application_id);
    const action = cleanText(body.action);
    if (!applicationId || !action) {
        return NextResponse.json({ error: "Choose an application and action." }, { status: 400 });
    }

    const { data: application, error: appError } = await auth.supabase
        .from("client_applications")
        .select("*, packages(id, name, slug, price_amount, billing_cycle)")
        .eq("id", applicationId)
        .maybeSingle();
    if (appError) return NextResponse.json({ error: appError.message || "Could not load application." }, { status: 500 });
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    try {
        let activationEmailStatus = "";

        if (action === "approve") {
            await activateApplication(auth.supabase, application);
            const emailResult = await sendActivationEmail({ application }).catch((error) => {
                console.error("ORVA activation email failed", { applicationId, error });
                return { failed: true };
            });
            activationEmailStatus = emailResult?.skipped
                ? " Activation email skipped because RESEND_API_KEY or client email is missing."
                : emailResult?.failed
                    ? " Account activated, but activation email delivery failed."
                    : " Activation email sent to the client.";
        } else if (action === "reject") {
            await auth.supabase
                .from("client_applications")
                .update({ status: "rejected", notes: [application.notes, cleanText(body.admin_notes)].filter(Boolean).join("\n\nAdmin: "), updated_at: nowISTISOString() })
                .eq("id", applicationId);
        } else if (action === "activate") {
            await activateApplication(auth.supabase, application);
            const emailResult = await sendActivationEmail({ application }).catch((error) => {
                console.error("ORVA activation email failed", { applicationId, error });
                return { failed: true };
            });
            activationEmailStatus = emailResult?.skipped
                ? " Activation email skipped because RESEND_API_KEY or client email is missing."
                : emailResult?.failed
                    ? " Account activated, but activation email delivery failed."
                    : " Activation email sent to the client.";
        } else {
            return NextResponse.json({ error: "Unknown application action." }, { status: 400 });
        }

        const { data: updatedApplication } = await auth.supabase
            .from("client_applications")
            .select("*, packages(name, slug, price_amount, billing_cycle)")
            .eq("id", applicationId)
            .single();

        return NextResponse.json({ application: updatedApplication, message: `Application updated.${activationEmailStatus}` });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not update application." }, { status: 500 });
    }
}
