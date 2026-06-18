import { NextResponse } from "next/server";
import { isWhatsAppServiceType } from "../../../lib/whatsappCatalog";
import { createSupabaseAdmin, getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

async function validateInternalTaskAccess({ role, taskId, userId }) {
    if (role === "admin") return null;
    if (!["partner", "worker"].includes(role)) {
        return "Only internal users can clean catalog images.";
    }
    if (!taskId) {
        return "Open this tool from an assigned paid WhatsApp task.";
    }

    const supabase = createSupabaseAdmin();
    const { data: task, error } = await supabase
        .from("tasks")
        .select("id, worker_id, payment_status, status, service_type, title")
        .eq("id", taskId)
        .maybeSingle();

    if (
        error ||
        !task ||
        task.worker_id !== userId ||
        task.payment_status !== "paid" ||
        ["completed", "cancelled"].includes(task.status || "assigned") ||
        !isWhatsAppServiceType(`${task.service_type || ""} ${task.title || ""}`)
    ) {
        return "This tool is available only for paid WhatsApp tasks assigned to you.";
    }

    return null;
}

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        if (!process.env.REMOVEBG_API_KEY) {
            return NextResponse.json({ error: "Missing REMOVEBG_API_KEY." }, { status: 500 });
        }

        const formData = await request.formData();
        const role = await getUserRole(user.id);
        const accessError = await validateInternalTaskAccess({
            role,
            taskId: sanitizeText(formData.get("taskId")),
            userId: user.id,
        });

        if (accessError) {
            return NextResponse.json({ error: accessError }, { status: 403 });
        }

        const image = formData.get("image");

        if (!(image instanceof File)) {
            return NextResponse.json({ error: "Image file is required." }, { status: 400 });
        }

        if (!image.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are supported." }, { status: 400 });
        }

        if (image.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Image is too large. Please keep files under 5MB." }, { status: 400 });
        }

        const removeBgForm = new FormData();
        removeBgForm.append("image_file", image, image.name || "catalog-crop.png");
        removeBgForm.append("size", "auto");
        removeBgForm.append("format", "png");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
                "X-Api-Key": process.env.REMOVEBG_API_KEY,
            },
            body: removeBgForm,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: errorText || "Background removal failed." },
                { status: response.status }
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        return new Response(arrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not remove the image background." },
            { status: 500 }
        );
    }
}
