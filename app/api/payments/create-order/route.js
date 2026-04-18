import { NextResponse } from "next/server";
import { calculatePricing, amountToPaise } from "../../../lib/pricing";
import { createRazorpayOrder } from "../../../lib/razorpay";
import {
    createSupabaseAdmin,
    getAuthenticatedUser,
    getUserRole,
} from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function cleanText(value = "") {
    return String(value || "").trim();
}

function taskDescriptionFromRequirement(requirement = {}, serviceTitle = "IKIGAI service") {
    return [
        cleanText(requirement.description) || cleanText(requirement.notes),
        `Service requested: ${serviceTitle}`,
        `Business name: ${cleanText(requirement.businessName) || "Not provided"}`,
        `Contact number: ${cleanText(requirement.contactNumber) || "Not provided"}`,
        `Number of products/items: ${cleanText(requirement.productCount) || "Not specified"}`,
        `Documents/assets: ${cleanText(requirement.assetsNote) || "To be shared later"}`,
        `Instructions: ${cleanText(requirement.notes) || "No extra instructions"}`,
    ]
        .filter(Boolean)
        .join("\n");
}

function validateRequirement(requirement = {}) {
    const businessName = cleanText(requirement.businessName);
    const contactNumber = cleanText(requirement.contactNumber);
    const email = cleanText(requirement.email);
    const title = cleanText(requirement.title);
    const description = cleanText(requirement.description || requirement.notes);

    if (businessName.length < 2) return "Business name is required.";
    if (!/^[6-9]\d{9}$/.test(contactNumber)) return "Valid 10-digit Indian phone number is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Valid client email is required.";
    if (title.length < 3) return "Task title is required.";
    if (description.length < 10) return "Requirement details must be at least 10 characters.";

    return "";
}

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const role = await getUserRole(user.id);

        if (role !== "client") {
            return NextResponse.json({ error: "Only clients can start service payments." }, { status: 403 });
        }

        const payload = await request.json();
        const supabase = createSupabaseAdmin();
        let task = null;

        if (payload.task_id) {
            const { data, error: taskError } = await supabase
                .from("tasks")
                .select("*")
                .eq("id", payload.task_id)
                .single();

            if (taskError || !data) {
                return NextResponse.json({ error: "Task not found." }, { status: 404 });
            }

            if (data.client_id !== user.id) {
                return NextResponse.json({ error: "You can only pay for your own task." }, { status: 403 });
            }

            task = data;
        } else {
            const serviceType = cleanText(payload.service_type || payload.serviceType || "whatsapp");
            const pricing = calculatePricing(serviceType);
            const requirement = payload.requirement || {};
            const requirementError = validateRequirement(requirement);

            if (requirementError) {
                return NextResponse.json({ error: requirementError }, { status: 400 });
            }

            const clientName =
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "IKIGAI Client";
            const taskTitle = cleanText(requirement.title) || pricing.service_label;

            const { data: createdTask, error: createError } = await supabase
                .from("tasks")
                .insert([
                    {
                        title: taskTitle,
                        description: taskDescriptionFromRequirement(requirement, pricing.service_label),
                        service_type: serviceType,
                        client_id: user.id,
                        base_amount: pricing.base_amount,
                        gst_percent: pricing.gst_percent,
                        gst_amount: pricing.gst_amount,
                        platform_fee: pricing.platform_fee,
                        total_amount: pricing.total_amount,
                        payment_status: "pending",
                        status: "pending",
                        client_email: cleanText(requirement.email) || user.email,
                        client_name: clientName,
                        client_business_name: cleanText(requirement.businessName),
                        client_phone: cleanText(requirement.contactNumber),
                        products_count: requirement.productCount ? Number(requirement.productCount) : null,
                        requirement_notes: cleanText(requirement.notes || requirement.description),
                        assets_note: cleanText(requirement.assetsNote),
                    },
                ])
                .select("*")
                .single();

            if (createError || !createdTask) {
                return NextResponse.json(
                    { error: createError?.message || "Could not create your service request." },
                    { status: 500 }
                );
            }

            task = createdTask;
        }

        if (task.payment_status === "paid") {
            return NextResponse.json({ error: "This task is already paid." }, { status: 400 });
        }

        const pricing = calculatePricing(task.service_type);
        const clientName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            task.client_name ||
            user.email?.split("@")[0] ||
            "IKIGAI Client";

        const order = await createRazorpayOrder({
            amount: amountToPaise(pricing.total_amount),
            receipt: `task_${task.id}`,
            notes: {
                task_id: String(task.id),
                service_type: task.service_type,
                client_id: user.id,
                mode: "test",
            },
        });

        const { data: savedTask, error: updateError } = await supabase
            .from("tasks")
            .update({
                base_amount: pricing.base_amount,
                gst_percent: pricing.gst_percent,
                gst_amount: pricing.gst_amount,
                platform_fee: pricing.platform_fee,
                total_amount: pricing.total_amount,
                payment_status: "pending",
                payment_order_id: order.id,
                client_email: task.client_email || user.email,
                client_name: clientName,
            })
            .eq("id", task.id)
            .select("*")
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: updateError.message || "Could not save payment order." },
                { status: 500 }
            );
        }

        await supabase.from("payments").insert([
            {
                task_id: String(task.id),
                razorpay_order_id: order.id,
                base_amount: pricing.base_amount,
                amount: pricing.base_amount,
                gst_amount: pricing.gst_amount,
                platform_fee: pricing.platform_fee,
                total_amount: pricing.total_amount,
                status: "pending",
            },
        ]);

        return NextResponse.json({
            order,
            task_id: task.id,
            task: savedTask || task,
            pricing,
            razorpay_key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
            client: {
                name: clientName,
                email: task.client_email || user.email,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not create payment order." },
            { status: 500 }
        );
    }
}
