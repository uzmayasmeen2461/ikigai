import { Resend } from "resend";
import { BRAND } from "../../config/branding";
import { formatINR } from "./pricing";

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

export function buildActivationEmail({ application }) {
    const clientName = escapeHtml(application.owner_name || application.business_name || "there");
    const businessName = escapeHtml(application.business_name || "your business");
    const packageName = escapeHtml(application.packages?.name || "ORVA package");
    const amount = formatINR(application.packages?.price_amount || 0);
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || BRAND.website || ""}/dashboard/upload-inventory`;
    const safeDashboardUrl = escapeHtml(dashboardUrl);
    const supportEmail = escapeHtml(BRAND.supportEmail);

    const html = `
        <div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08)">
                <div style="background:#020617;padding:32px;color:#ffffff">
                    <div style="font-size:26px;font-weight:800;letter-spacing:-0.04em">${BRAND.name}</div>
                    <div style="margin-top:6px;color:#bfdbfe;font-size:13px">${BRAND.tagline}</div>
                    <div style="margin-top:28px;display:inline-block;border:1px solid rgba(255,255,255,0.18);border-radius:999px;padding:8px 12px;color:#dbeafe;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em">
                        Account Activated
                    </div>
                </div>
                <div style="padding:32px">
                    <h1 style="margin:0;font-size:28px;line-height:1.2;letter-spacing:-0.04em;color:#0f172a">Your ORVA account is active, ${clientName}.</h1>
                    <p style="margin:14px 0 0;color:#475569;font-size:15px;line-height:1.7">
                        ${businessName} can now use ORVA to upload products, create previews, generate content, and publish/export through the dashboard.
                    </p>

                    <div style="margin-top:26px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
                        <div style="background:#eff6ff;padding:14px 18px;color:#1d4ed8;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em">Plan Details</div>
                        <div style="padding:18px">
                            <p style="margin:0 0 10px"><strong>Package:</strong> ${packageName}</p>
                            <p style="margin:0"><strong>Yearly amount:</strong> ${amount}</p>
                        </div>
                    </div>

                    <div style="margin-top:26px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px">
                        <h2 style="margin:0;font-size:18px;color:#0f172a">Start here</h2>
                        <ol style="margin:14px 0 0;padding-left:20px;color:#475569;line-height:1.7;font-size:14px">
                            <li>Open your ORVA dashboard.</li>
                            <li>Choose whether you have an inventory list or only product photos.</li>
                            <li>Upload your products and start preparing your digital storefront.</li>
                        </ol>
                    </div>

                    <a href="${safeDashboardUrl}" style="display:inline-block;margin-top:26px;background:#1b4fd8;color:#ffffff;text-decoration:none;font-weight:800;border-radius:14px;padding:14px 18px">
                        Open ORVA Dashboard
                    </a>

                    <p style="margin:26px 0 0;color:#475569;font-size:14px;line-height:1.7">
                        For support, contact <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;font-weight:700">${supportEmail}</a>.
                    </p>
                </div>
                <div style="border-top:1px solid #e2e8f0;padding:18px 32px;color:#94a3b8;font-size:12px;background:#f8fafc">
                    This is a system-generated account activation email from ${BRAND.name}.
                </div>
            </div>
        </div>
    `;

    const text = [
        `Hi ${application.owner_name || application.business_name || "there"},`,
        "",
        `Your ${BRAND.name} account is active.`,
        "",
        `Business: ${application.business_name || "Your business"}`,
        `Package: ${application.packages?.name || "ORVA package"}`,
        `Yearly amount: ${amount}`,
        "",
        "Start here:",
        "1. Open your ORVA dashboard.",
        "2. Choose whether you have an inventory list or only product photos.",
        "3. Upload your products and start preparing your digital storefront.",
        "",
        dashboardUrl,
        "",
        `For support, contact ${BRAND.supportEmail}.`,
        "",
        BRAND.name,
        BRAND.tagline,
    ].join("\n");

    return {
        subject: `Your ${BRAND.name} account is activated`,
        html,
        text,
    };
}

export async function sendActivationEmail({ application }) {
    if (!process.env.RESEND_API_KEY || !application?.email) {
        return { skipped: true };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const email = buildActivationEmail({ application });

    return resend.emails.send({
        from: `${BRAND.name} <onboarding@resend.dev>`,
        to: application.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
    });
}
