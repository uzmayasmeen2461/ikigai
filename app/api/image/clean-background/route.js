import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isWhatsAppServiceType } from "../../../lib/whatsappCatalog";
import { createSupabaseAdmin, getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

class BackgroundCleanupError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = "BackgroundCleanupError";
        this.provider = options.provider || "";
        this.code = options.code || "";
        this.status = options.status || 500;
    }
}

function parseProviderError(text = "", provider = "provider", status = 500) {
    try {
        const parsed = JSON.parse(text);
        const firstError = parsed?.errors?.[0];
        const code = firstError?.code || parsed?.code || "";
        const title = firstError?.title || parsed?.error || `${provider} request failed.`;

        if (
            code === "unknown_foreground" ||
            String(title).toLowerCase().includes("could not identify foreground")
        ) {
            return new BackgroundCleanupError(
                "Background cleanup could not isolate the product clearly. Try a tighter crop so one product fills most of the frame, then try again.",
                { provider, code, status }
            );
        }

        return new BackgroundCleanupError(String(title), { provider, code, status });
    } catch {
        return new BackgroundCleanupError(`${provider} request failed. Please try again with a tighter crop.`, {
            provider,
            status,
        });
    }
}

function hasCloudinaryConfig() {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
    );
}

async function cleanWithRemoveBg(file) {
    const formData = new FormData();
    formData.append("image_file", file, file.name || "product-image.png");
    formData.append("size", "auto");
    formData.append("format", "png");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
            "X-Api-Key": process.env.REMOVEBG_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        throw parseProviderError(await response.text(), "remove.bg", response.status);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
        provider: "removebg",
        contentType: response.headers.get("content-type") || "image/png",
        buffer: Buffer.from(arrayBuffer),
    };
}

async function cleanWithPhotoRoom(file) {
    const formData = new FormData();
    formData.append("image_file", file, file.name || "product-image.png");
    formData.append("format", "png");
    formData.append("size", "full");

    const response = await fetch("https://sdk.photoroom.com/v1/segment", {
        method: "POST",
        headers: {
            "x-api-key": process.env.PHOTOROOM_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        throw parseProviderError(await response.text(), "PhotoRoom", response.status);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
        provider: "photoroom",
        contentType: response.headers.get("content-type") || "image/png",
        buffer: Buffer.from(arrayBuffer),
    };
}

function cloudinarySignature(params) {
    const sorted = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    return crypto
        .createHash("sha1")
        .update(`${sorted}${process.env.CLOUDINARY_API_SECRET}`)
        .digest("hex");
}

function cloudinaryDeliveryUrl(publicId) {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/e_background_removal/${publicId}.png`;
}

async function cleanWithCloudinary(file) {
    if (!hasCloudinaryConfig()) {
        throw new BackgroundCleanupError("Cloudinary fallback is not configured yet.", {
            provider: "cloudinary",
            status: 500,
        });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const uploadParams = {
        folder: "ikigaidigital/whatsapp-catalog",
        public_id: `catalog-${timestamp}-${crypto.randomUUID().slice(0, 8)}`,
        timestamp,
    };
    const signature = cloudinarySignature(uploadParams);
    const formData = new FormData();

    formData.append("file", file, file.name || "product-image.png");
    formData.append("api_key", process.env.CLOUDINARY_API_KEY);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", uploadParams.folder);
    formData.append("public_id", uploadParams.public_id);
    formData.append("signature", signature);

    const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!uploadResponse.ok) {
        throw parseProviderError(await uploadResponse.text(), "Cloudinary", uploadResponse.status);
    }

    const uploaded = await uploadResponse.json();
    const cleanedUrl = cloudinaryDeliveryUrl(uploaded.public_id);

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const deliveryResponse = await fetch(cleanedUrl);
        if (deliveryResponse.ok) {
            return {
                provider: "cloudinary",
                cleanedImageUrl: cleanedUrl,
                originalImageUrl: uploaded.secure_url,
            };
        }

        if (deliveryResponse.status !== 423) {
            throw new BackgroundCleanupError("Cloudinary could not finish background cleanup for this crop.", {
                provider: "cloudinary",
                status: deliveryResponse.status,
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }

    return {
        provider: "cloudinary",
        cleanedImageUrl: cleanedUrl,
        originalImageUrl: uploaded.secure_url,
    };
}

function asDataUrl(buffer, contentType) {
    return `data:${contentType};base64,${buffer.toString("base64")}`;
}

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

        const provider = String(formData.get("provider") || "removebg").toLowerCase();
        const imageFile = formData.get("image");

        if (!(imageFile instanceof File)) {
            return NextResponse.json({ error: "Image file is required." }, { status: 400 });
        }

        let result;

        if (provider === "removebg") {
            result = await cleanWithRemoveBg(imageFile);
        } else if (provider === "photoroom") {
            result = await cleanWithPhotoRoom(imageFile);
        } else if (provider === "cloudinary") {
            result = await cleanWithCloudinary(imageFile);
        } else if (provider === "auto") {
            let primaryError;
            try {
                result = await cleanWithRemoveBg(imageFile);
            } catch (error) {
                primaryError = error;

                if (hasCloudinaryConfig()) {
                    try {
                        result = await cleanWithCloudinary(imageFile);
                    } catch {
                        throw primaryError;
                    }
                } else {
                    throw primaryError;
                }
            }
        } else {
            return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
        }

        if (result.buffer) {
            return NextResponse.json({
                provider: result.provider,
                cleanedImageUrl: asDataUrl(result.buffer, result.contentType),
                originalImageUrl: null,
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        const status =
            error instanceof BackgroundCleanupError
                ? error.status || 500
                : 500;

        return NextResponse.json(
            { error: error.message || "Could not clean image background." },
            { status }
        );
    }
}
