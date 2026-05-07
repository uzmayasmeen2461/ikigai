import { NextResponse } from "next/server";
import { buildInvoiceData } from "../../../lib/invoice";
import { calculatePricing } from "../../../lib/pricing";
import { createSupabaseAdmin, getBearerToken, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { BRAND } from "../../../../config/branding";

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const taskId = url.searchParams.get("task_id");
        const orderId = url.searchParams.get("order_id");
        const supabase = createSupabaseAdmin();
        const token = getBearerToken(request);
        let user = null;

        if (token) {
            const auth = await getAuthenticatedUser(request);

            if (auth.error || !auth.user) {
                return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
            }

            user = auth.user;
        }

        let query = supabase
            .from("tasks")
            .select("*")
            .eq("payment_status", "paid");

        if (taskId) {
            query = query.eq("id", taskId).single();
        } else {
            if (!user) {
                return NextResponse.json({ error: "Login is required to load your latest payment." }, { status: 401 });
            }

            query = query.eq("client_id", user.id);
            query = query.order("paid_at", { ascending: false }).limit(1).maybeSingle();
        }

        const { data: task, error } = await query;

        if (error || !task) {
            return NextResponse.json(
                { error: "Could not find a confirmed payment for this account." },
                { status: 404 }
            );
        }

        const canAccessAsUser = user && task.client_id === user.id;
        const canAccessAsGuest = taskId && orderId && task.payment_order_id === orderId;

        if (!canAccessAsUser && !canAccessAsGuest) {
            return NextResponse.json({ error: "Login is required to view this payment." }, { status: 401 });
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
                client_name: task.client_name || user?.email?.split("@")[0] || `${BRAND.name} Client`,
                client_email: task.client_email || user?.email,
                requires_login_for_progress: !canAccessAsUser,
            },
            invoice,
            guest: !canAccessAsUser,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not load payment success details." },
            { status: 500 }
        );
    }
}
