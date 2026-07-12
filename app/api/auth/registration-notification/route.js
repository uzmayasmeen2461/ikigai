import { Resend } from "resend";
import { BRAND } from "../../../../config/branding";

const adminInbox = process.env.IKIGAI_SUPPORT_EMAIL || BRAND.supportEmail;

function clean(value = "") {
    return String(value || "").trim();
}

function normalizeEmail(value = "") {
    return clean(value).toLowerCase();
}

function isValidEmail(value = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizeEmail(value));
}

function normalizeRole(value = "") {
    const role = clean(value).toLowerCase();
    if (role === "worker" || role === "partner") return "worker";
    return "client";
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function roleLabel(role) {
    return role === "worker" ? "Digital Setup Specialist" : "Business Client";
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const email = normalizeEmail(body.email);
        const role = normalizeRole(body.role);
        const userId = clean(body.userId);

        if (!isValidEmail(email)) {
            return Response.json({ error: "Valid email is required." }, { status: 400 });
        }

        if (!process.env.RESEND_API_KEY) {
            return Response.json({ success: true, skipped: true });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const safeEmail = escapeHtml(email);
        const safeRole = escapeHtml(roleLabel(role));
        const safeUserId = escapeHtml(userId || "Not available");
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || BRAND.website || ""}${role === "worker" ? "/partner/tasks" : "/dashboard"}`;

        await resend.emails.send({
            from: `${BRAND.name} <onboarding@resend.dev>`,
            to: adminInbox,
            subject: `New ${BRAND.name} registration - ${roleLabel(role)}`,
            html: `
                <h2>New ${BRAND.name} Registration</h2>
                <p><b>Email:</b> ${safeEmail}</p>
                <p><b>Role:</b> ${safeRole}</p>
                <p><b>User ID:</b> ${safeUserId}</p>
                <p>This person has registered on ${BRAND.name}.</p>
            `,
            text: [
                `New ${BRAND.name} Registration`,
                `Email: ${email}`,
                `Role: ${roleLabel(role)}`,
                `User ID: ${userId || "Not available"}`,
            ].join("\n"),
        });

        await resend.emails.send({
            from: `${BRAND.name} <onboarding@resend.dev>`,
            to: email,
            subject: `Welcome to ${BRAND.name}`,
            html: `
                <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6">
                    <h2 style="margin-bottom:8px">You are registered with ${BRAND.name}.</h2>
                    <p>Thank you for creating your ${safeRole} account.</p>
                    <p>You can now open your ORVA workspace and continue setup.</p>
                    <p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#1b4fd8;color:#ffffff;padding:12px 16px;border-radius:12px;text-decoration:none;font-weight:700">Open ORVA</a></p>
                    <p style="font-size:13px;color:#64748b">For help, contact ${escapeHtml(BRAND.supportEmail)}.</p>
                </div>
            `,
            text: [
                `You are registered with ${BRAND.name}.`,
                "",
                `Thank you for creating your ${roleLabel(role)} account.`,
                "You can now open your ORVA workspace and continue setup.",
                "",
                dashboardUrl,
                "",
                `For help, contact ${BRAND.supportEmail}.`,
            ].join("\n"),
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error?.message || "Could not send registration notification." }, { status: 500 });
    }
}
