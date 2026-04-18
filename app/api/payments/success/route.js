import { NextResponse } from "next/server";
import { buildInvoiceData } from "../../../lib/invoice";
import { calculatePricing } from "../../../lib/pricing";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";

export async function GET(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const taskId = url.searchParams.get("task_id");
        const supabase = createSupabaseAdmin();

        let query = supabase
            .from("tasks")
            .select("*")
            .eq("client_id", user.id)
            .eq("payment_status", "paid");

        if (taskId) {
            query = query.eq("id", taskId).single();
        } else {
            query = query.order("paid_at", { ascending: false }).limit(1).maybeSingle();
        }

        const { data: task, error } = await query;

        if (error || !task) {
            return NextResponse.json(
                { error: "Could not find a confirmed payment for this account." },
                { status: 404 }
            );
        }

        const fallbackPricing = calculatePricing(task.service_type);
        const invoice = buildInvoiceData(task);

        return NextResponse.json({
            task: {
                id: task.id,
                title: task.title,
                description: task.description,
                service_type: task.service_type,
                status: task.status || "pending",
                payment_status: task.payment_status,
                base_amount: task.base_amount || fallbackPricing.base_amount,
                gst_percent: task.gst_percent || fallbackPricing.gst_percent,
                gst_amount: task.gst_amount || fallbackPricing.gst_amount,
                platform_fee: task.platform_fee || fallbackPricing.platform_fee,
                total_amount: task.total_amount || fallbackPricing.total_amount,
                invoice_number: task.invoice_number,
                invoice_url: task.invoice_url || `/api/invoices/${task.id}`,
                payment_id: task.payment_id,
                payment_order_id: task.payment_order_id,
                paid_at: task.paid_at,
                client_name: task.client_name || user.email?.split("@")[0] || "IKIGAI Client",
                client_email: task.client_email || user.email,
            },
            invoice,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not load payment success details." },
            { status: 500 }
        );
    }
}
