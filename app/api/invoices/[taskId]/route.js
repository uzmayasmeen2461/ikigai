import { NextResponse } from "next/server";
import { generateInvoicePdf } from "../../../lib/invoice";
import { createSupabaseAdmin, getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";

export async function GET(request, { params }) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const { taskId } = await params;
        const supabase = createSupabaseAdmin();
        const { data: task, error: taskError } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .single();

        if (taskError || !task) {
            return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
        }

        const role = await getUserRole(user.id);
        const canAccess = role === "admin" || task.client_id === user.id;

        if (!canAccess) {
            return NextResponse.json({ error: "You cannot access this invoice." }, { status: 403 });
        }

        if (task.payment_status !== "paid") {
            return NextResponse.json({ error: "Invoice is available after payment." }, { status: 400 });
        }

        const pdf = generateInvoicePdf(task);

        return new Response(pdf, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${task.invoice_number || "IKIGAI-Invoice"}.pdf"`,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not generate invoice." },
            { status: 500 }
        );
    }
}
