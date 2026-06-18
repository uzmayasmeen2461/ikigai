import { Resend } from "resend";
import { BRAND } from "../../../config/branding";

const resend = new Resend(process.env.RESEND_API_KEY);
const adminInbox = process.env.IKIGAI_SUPPORT_EMAIL || BRAND.supportEmail;

function cleanText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function isValidEmail(value = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function isValidUpiId(value = "") {
    return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(value);
}

export async function POST(req) {
    try {
        const body = await req.json();
        const name = cleanText(body.name);
        const phone = cleanText(body.phone);
        const email = cleanText(body.email).toLowerCase();
        const skills = cleanText(body.skills);
        const availability = cleanText(body.availability);
        const upiId = cleanText(body.upiId).toLowerCase();

        // Server-side validation
        if (!name || name.length < 3) {
            return Response.json({ error: "Invalid name" }, { status: 400 });
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            return Response.json({ error: "Invalid phone" }, { status: 400 });
        }

        if (!isValidEmail(email)) {
            return Response.json({ error: "Invalid email" }, { status: 400 });
        }

        if (!skills || skills.length < 3) {
            return Response.json({ error: "Invalid skills" }, { status: 400 });
        }

        if (!isValidUpiId(upiId)) {
            return Response.json({ error: "Invalid UPI ID" }, { status: 400 });
        }

        await resend.emails.send({
            from: `${BRAND.name} <onboarding@resend.dev>`,
            to: adminInbox,
            subject: `New ${BRAND.name} Partner Application`,
            html: `
        <h2>New Partner Application</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Skills:</b> ${skills}</p>
        <p><b>Availability:</b> ${availability}</p>
        <p><b>UPI ID:</b> ${upiId}</p>
      `,
        });

        await resend.emails.send({
            from: `${BRAND.name} <onboarding@resend.dev>`,
            to: email,
            subject: `Your ${BRAND.name} partner application has been received`,
            html: `
        <h2>Your ${BRAND.name} partner application has been received.</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to become an ${BRAND.name} partner. Our team will review your details and contact you if your profile matches current task requirements.</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Skills:</b> ${skills}</p>
        <p><b>Availability:</b> ${availability || "Not specified"}</p>
        <p><b>UPI ID:</b> ${upiId}</p>
        <p>For support, contact ${BRAND.supportEmail}.</p>
      `,
            text: [
                `Your ${BRAND.name} partner application has been received.`,
                `Hi ${name},`,
                `Thank you for applying to become an ${BRAND.name} partner. Our team will review your details and contact you if your profile matches current task requirements.`,
                `Phone: ${phone}`,
                `Skills: ${skills}`,
                `Availability: ${availability || "Not specified"}`,
                `UPI ID: ${upiId}`,
                `Support: ${BRAND.supportEmail}`,
            ].join("\n\n"),
        });

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: "Failed" }, { status: 500 });
    }
}
