import { NextResponse } from "next/server";
import { createInvoiceNumber, generateInvoicePdf, invoiceUrlForTask } from "../../../lib/invoice";
import { sendInvoiceEmail } from "../../../lib/invoiceEmail";
import { verifyRazorpaySignature } from "../../../lib/razorpay";
import { createSupabaseAdmin, getBearerToken, getAuthenticatedUser } from "../../../lib/supabaseServer";
import { autoAssignPaidTask } from "../../../lib/automation";
import { BRAND } from "../../../../config/branding";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        const token = getBearerToken(request);
        let user = null;

        if (token) {
            const auth = await getAuthenticatedUser(request);

            if (auth.error || !auth.user) {
                return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
            }

            user = auth.user;
        }

        const {
            task_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await request.json();

        if (!task_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
        }

        const supabase = createSupabaseAdmin();
        const { data: task, error: taskError } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", task_id)
            .single();

        if (taskError || !task) {
            return NextResponse.json({ error: "Task not found." }, { status: 404 });
        }

        if (task.client_id && task.client_id !== user?.id) {
            return NextResponse.json({ error: "You can only verify payment for your own task." }, { status: 403 });
        }

        if (task.payment_order_id !== razorpay_order_id) {
            return NextResponse.json({ error: "Payment order does not match this task." }, { status: 400 });
        }

        const verified = verifyRazorpaySignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });

        if (!verified) {
            await supabase
                .from("tasks")
                .update({ payment_status: "failed" })
                .eq("id", task.id);

            await supabase
                .from("payments")
                .update({ status: "failed" })
                .eq("razorpay_order_id", razorpay_order_id);

            return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
        }

        const invoiceNumber = task.invoice_number || createInvoiceNumber(task.id);
        const invoiceUrl = invoiceUrlForTask(task.id);
        const paidAt = new Date().toISOString();

        const updatedTask = {
            ...task,
            payment_status: "paid",
            payment_id: razorpay_payment_id,
            invoice_number: invoiceNumber,
            invoice_url: invoiceUrl,
            client_email: task.client_email || user?.email,
            client_name:
                task.client_name ||
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                task.client_email?.split("@")[0] ||
                user?.email?.split("@")[0] ||
                `${BRAND.name} Client`,
            paid_at: paidAt,
        };

        const { data: savedTask, error: updateError } = await supabase
            .from("tasks")
            .update({
                payment_status: "paid",
                payment_order_id: razorpay_order_id,
                payment_id: razorpay_payment_id,
                invoice_number: invoiceNumber,
                invoice_url: invoiceUrl,
                client_email: updatedTask.client_email,
                client_name: updatedTask.client_name,
                paid_at: paidAt,
            })
            .eq("id", task.id)
            .select("*")
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: updateError.message || "Could not update payment status." },
                { status: 500 }
            );
        }

        let invoiceEmailStatus = "sent";

        try {
            const invoicePdf = generateInvoicePdf(savedTask || updatedTask);
            const emailResult = await sendInvoiceEmail({ task: savedTask || updatedTask, invoicePdf });
            invoiceEmailStatus = emailResult?.skipped ? "skipped" : "sent";
        } catch (invoiceError) {
            invoiceEmailStatus = "failed";
            console.error(`${BRAND.name} invoice/email error`, {
                taskId: task.id,
                invoiceNumber,
                error: invoiceError?.message || invoiceError,
            });
        }

        await supabase
            .from("payments")
            .update({
                razorpay_payment_id,
                invoice_number: invoiceNumber,
                invoice_url: invoiceUrl,
                status: "paid",
            })
            .eq("razorpay_order_id", razorpay_order_id);

        const assignment = await autoAssignPaidTask(supabase, savedTask || updatedTask).catch((assignmentError) => {
            console.error(`${BRAND.name} auto-assignment error`, {
                taskId: task.id,
                error: assignmentError?.message || assignmentError,
            });
            return { assigned: false, error: assignmentError?.message || "Auto-assignment failed." };
        });

        return NextResponse.json({
            success: true,
            message:
                invoiceEmailStatus === "failed"
                    ? "Payment successful. Invoice is available in your dashboard, but email delivery needs review."
                    : "Payment successful. Invoice sent to your email.",
            invoice_email_status: invoiceEmailStatus,
            auto_assignment: assignment,
            task: assignment?.task || savedTask || updatedTask,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not verify payment." },
            { status: 500 }
        );
    }
}
