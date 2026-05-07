import { Resend } from "resend";
import { BRAND } from "../../../config/branding";

const resend = new Resend(process.env.RESEND_API_KEY);
const adminInbox = process.env.IKIGAI_SUPPORT_EMAIL || BRAND.supportEmail;

export async function POST(req) {
    try {
        const body = await req.json();
        const type = body.type || "service_request";

        if (type === "appointment_request") {
            const {
                serviceTitle,
                businessName,
                contactNumber,
                email,
                preferredNote,
            } = body;

            if (!businessName || businessName.trim().length < 2) {
                return Response.json({ error: "Business name is required." }, { status: 400 });
            }

            if (!/^[6-9]\d{9}$/.test(String(contactNumber || "").trim())) {
                return Response.json({ error: "Valid contact number is required." }, { status: 400 });
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || "").trim())) {
                return Response.json({ error: "Valid email is required." }, { status: 400 });
            }

            await resend.emails.send({
                from: `${BRAND.name} <onboarding@resend.dev>`,
                to: adminInbox,
                subject: `Appointment Request - ${serviceTitle || `${BRAND.name} Service`}`,
                html: `
                    <h2>New Appointment Request</h2>
                    <p><b>Service:</b> ${serviceTitle || "Not specified"}</p>
                    <p><b>Business name:</b> ${businessName}</p>
                    <p><b>Contact number:</b> ${contactNumber}</p>
                    <p><b>Email:</b> ${email}</p>
                    <p><b>Preferred note:</b> ${preferredNote || "No extra note shared"}</p>
                    <p>Please contact this person and help them complete their requirement.</p>
                `,
            });

            return Response.json({ success: true });
        }

        const { name, business, platform, products, requirement } = body;

        await resend.emails.send({
            from: `${BRAND.name} <onboarding@resend.dev>`,
            to: adminInbox,
            subject: `New ${BRAND.name} Request`,
            html: `
        <h2>New Request</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Business:</b> ${business}</p>
        <p><b>Platform:</b> ${platform}</p>
        <p><b>Products:</b> ${products}</p>
        <p><b>Requirement:</b> ${requirement}</p>
      `,
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: "Failed" }, { status: 500 });
    }
}
