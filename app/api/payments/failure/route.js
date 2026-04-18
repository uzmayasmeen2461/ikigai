import { NextResponse } from "next/server";
import { createSupabaseAdmin, getAuthenticatedUser } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const { task_id, razorpay_order_id, reason } = await request.json();

        if (!task_id) {
            return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
        }

        const supabase = createSupabaseAdmin();
        const { data: task, error: taskError } = await supabase
            .from("tasks")
            .select("id, client_id, payment_status, payment_order_id")
            .eq("id", task_id)
            .single();

        if (taskError || !task) {
            return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        if (task.client_id !== user.id) {
            return NextResponse.json({ error: "You can only update your own payment." }, { status: 403 });
        }

        if (task.payment_status === "paid") {
            return NextResponse.json({ success: true, status: "paid" });
        }

        const orderId = razorpay_order_id || task.payment_order_id;

        await supabase
            .from("tasks")
            .update({ payment_status: "failed" })
            .eq("id", task.id);

        if (orderId) {
            await supabase
                .from("payments")
                .update({
                    status: "failed",
                    failure_reason: reason || "Payment failed or was cancelled.",
                })
                .eq("razorpay_order_id", orderId);
        }

        return NextResponse.json({ success: true, status: "failed" });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not record payment failure." },
            { status: 500 }
        );
    }
}
