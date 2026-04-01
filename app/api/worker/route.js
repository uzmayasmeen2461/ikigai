import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const body = await req.json();

        // Server-side validation
        if (!body.name || body.name.length < 3) {
            return Response.json({ error: "Invalid name" }, { status: 400 });
        }

        if (!/^[6-9]\d{9}$/.test(body.phone)) {
            return Response.json({ error: "Invalid phone" }, { status: 400 });
        }

        if (!body.skills || body.skills.length < 3) {
            return Response.json({ error: "Invalid skills" }, { status: 400 });
        }

        await resend.emails.send({
            from: "IKIGAI <onboarding@resend.dev>",
            to: "uzma.yasmeen.ui@gmail.com",
            subject: "New Worker Application",
            html: `
        <h2>New Worker</h2>
        <p><b>Name:</b> ${body.name}</p>
        <p><b>Phone:</b> ${body.phone}</p>
        <p><b>Skills:</b> ${body.skills}</p>
        <p><b>Availability:</b> ${body.availability}</p>
      `,
        });

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: "Failed" }, { status: 500 });
    }
}