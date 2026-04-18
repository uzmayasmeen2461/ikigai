import { Resend } from "resend";
import { buildInvoiceData } from "./invoice";
import { formatINR } from "./pricing";

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

export function buildPaymentConfirmationEmail({ task }) {
    const invoice = buildInvoiceData(task);
    const clientName = escapeHtml(invoice.client.name);
    const serviceName = escapeHtml(invoice.item.serviceName);
    const taskTitle = escapeHtml(invoice.item.taskTitle);
    const totalPaid = formatINR(invoice.amounts.totalAmount);
    const invoiceNumber = escapeHtml(invoice.invoice.number);
    const supportEmail = escapeHtml(invoice.supplier.email);

    const html = `
        <div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08)">
                <div style="background:#020617;padding:32px;color:#ffffff">
                    <div style="font-size:26px;font-weight:800;letter-spacing:-0.04em">IKIGAI</div>
                    <div style="margin-top:6px;color:#bfdbfe;font-size:13px">Connecting Purpose with Productivity</div>
                    <div style="margin-top:28px;display:inline-block;border:1px solid rgba(255,255,255,0.18);border-radius:999px;padding:8px 12px;color:#dbeafe;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em">
                        Payment Confirmed
                    </div>
                </div>
                <div style="padding:32px">
                    <h1 style="margin:0;font-size:28px;line-height:1.2;letter-spacing:-0.04em;color:#0f172a">Thank you, ${clientName}.</h1>
                    <p style="margin:14px 0 0;color:#475569;font-size:15px;line-height:1.7">
                        Your payment has been received and verified successfully. Your IKIGAI task is now ready for managed execution.
                    </p>

                    <div style="margin-top:26px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
                        <div style="background:#eff6ff;padding:14px 18px;color:#1d4ed8;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em">Payment Summary</div>
                        <div style="padding:18px">
                            <p style="margin:0 0 10px"><strong>Service:</strong> ${serviceName}</p>
                            <p style="margin:0 0 10px"><strong>Task:</strong> ${taskTitle}</p>
                            <p style="margin:0 0 10px"><strong>Total paid:</strong> ${totalPaid}</p>
                            <p style="margin:0"><strong>Invoice number:</strong> ${invoiceNumber}</p>
                        </div>
                    </div>

                    <div style="margin-top:26px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px">
                        <h2 style="margin:0;font-size:18px;color:#0f172a">What happens next?</h2>
                        <ol style="margin:14px 0 0;padding-left:20px;color:#475569;line-height:1.7;font-size:14px">
                            <li>IKIGAI will review your task details.</li>
                            <li>Assignment will begin shortly through the managed workflow.</li>
                            <li>You can track progress and latest updates in your dashboard.</li>
                        </ol>
                    </div>

                    <p style="margin:26px 0 0;color:#475569;font-size:14px;line-height:1.7">
                        Your invoice PDF is attached to this email. For support, contact
                        <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;font-weight:700">${supportEmail}</a>.
                    </p>
                </div>
                <div style="border-top:1px solid #e2e8f0;padding:18px 32px;color:#94a3b8;font-size:12px;background:#f8fafc">
                    This is a system-generated payment confirmation from IKIGAI.
                </div>
            </div>
        </div>
    `;

    const text = [
        `Hi ${invoice.client.name},`,
        "",
        "Your IKIGAI payment has been received and verified successfully.",
        "",
        `Service: ${invoice.item.serviceName}`,
        `Task: ${invoice.item.taskTitle}`,
        `Total paid: ${totalPaid}`,
        `Invoice number: ${invoice.invoice.number}`,
        "",
        "What happens next:",
        "1. IKIGAI will review your task details.",
        "2. Assignment will begin shortly through the managed workflow.",
        "3. You can track progress and latest updates in your dashboard.",
        "",
        `Your invoice PDF is attached. For support, contact ${invoice.supplier.email}.`,
        "",
        "IKIGAI",
        "Connecting Purpose with Productivity",
    ].join("\n");

    return {
        subject: "Payment Confirmation & Invoice – IKIGAI",
        html,
        text,
        invoice,
    };
}

export async function sendInvoiceEmail({ task, invoicePdf }) {
    if (!process.env.RESEND_API_KEY || !task.client_email) {
        return { skipped: true };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const email = buildPaymentConfirmationEmail({ task });

    return resend.emails.send({
        from: "IKIGAI <onboarding@resend.dev>",
        to: task.client_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: [
            {
                filename: `${task.invoice_number || email.invoice.invoice.number}.pdf`,
                content: invoicePdf.toString("base64"),
            },
        ],
    });
}
