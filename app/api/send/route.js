import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const body = await req.json();

        const { name, business, platform, products, requirement } = body;

        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: "uzma.yasmeen.ui@gmail.com",
            subject: "New IKIGAI Request",
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