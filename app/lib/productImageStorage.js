import { randomUUID } from "node:crypto";
import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "./supabaseServer";

const defaultBucket = "product-images";
const defaultVideoBucket = "product-videos";
export const maxProductVideoBytes = 200 * 1024 * 1024;

function bucketName() {
    return process.env.SUPABASE_PRODUCT_IMAGE_BUCKET || defaultBucket;
}

function videoBucketName() {
    return process.env.SUPABASE_PRODUCT_VIDEO_BUCKET || defaultVideoBucket;
}

function extensionFromMime(mimeType = "") {
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("gif")) return "gif";
    if (mimeType.includes("quicktime")) return "mov";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mp4")) return "mp4";
    return "jpg";
}

function parseDataUrl(value = "", typePrefix = "image") {
    const match = String(value).match(new RegExp(`^data:(${typePrefix}\\/[a-zA-Z0-9.+-]+);base64,(.+)$`));
    if (!match) return null;
    return {
        contentType: match[1],
        buffer: Buffer.from(match[2], "base64"),
    };
}

async function ensureBucket(supabase, bucket) {
    const { data } = await supabase.storage.getBucket(bucket);
    if (data?.id || data?.name) {
        await supabase.storage.updateBucket(bucket, {
            public: true,
            fileSizeLimit: 10 * 1024 * 1024,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
        return;
    }

    const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });

    if (error && !String(error.message || "").toLowerCase().includes("already exists")) {
        throw error;
    }
}

async function ensureVideoBucket(supabase, bucket) {
    const { data } = await supabase.storage.getBucket(bucket);
    if (data?.id || data?.name) {
        await supabase.storage.updateBucket(bucket, {
            public: true,
            fileSizeLimit: maxProductVideoBytes,
            allowedMimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
        });
        return;
    }

    const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: maxProductVideoBytes,
        allowedMimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
    });

    if (error && !String(error.message || "").toLowerCase().includes("already exists")) {
        throw error;
    }
}

export function isInlineImageUrl(value = "") {
    return String(value || "").startsWith("data:image/");
}

export function isInlineVideoUrl(value = "") {
    return String(value || "").startsWith("data:video/");
}

export async function uploadProductImageIfNeeded(imageUrl, { userId, productId = "", label = "product" } = {}) {
    if (!imageUrl || !isInlineImageUrl(imageUrl)) return imageUrl || "";
    if (!hasSupabaseServiceRoleKey()) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to upload product images for Instagram publishing.");
    }

    const parsed = parseDataUrl(imageUrl);
    if (!parsed?.buffer?.length) throw new Error("Could not read the uploaded product image.");
    if (parsed.buffer.length > 10 * 1024 * 1024) throw new Error("Product image is larger than 10MB. Please upload a smaller image.");

    const supabase = createSupabaseServiceRole();
    const bucket = bucketName();
    await ensureBucket(supabase, bucket);

    const safeLabel = String(label || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "product";
    const extension = extensionFromMime(parsed.contentType);
    const path = [
        userId || "public",
        productId || randomUUID(),
        `${safeLabel}-${Date.now()}.${extension}`,
    ].join("/");

    const { error } = await supabase.storage.from(bucket).upload(path, parsed.buffer, {
        contentType: parsed.contentType,
        upsert: true,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

export async function uploadProductVideoIfNeeded(videoUrl, { userId, productId = "", label = "reel" } = {}) {
    if (!videoUrl || !isInlineVideoUrl(videoUrl)) return videoUrl || "";
    if (!hasSupabaseServiceRoleKey()) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to upload product videos for Reel publishing.");
    }

    const parsed = parseDataUrl(videoUrl, "video");
    return uploadProductVideoBuffer(parsed?.buffer, {
        contentType: parsed?.contentType,
        userId,
        productId,
        label,
    });
}

export async function uploadProductVideoBuffer(buffer, { contentType = "video/webm", userId, productId = "", label = "reel" } = {}) {
    if (!hasSupabaseServiceRoleKey()) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to upload product videos for Reel publishing.");
    }
    if (!buffer?.length) throw new Error("Could not read the uploaded product video.");
    if (buffer.length > maxProductVideoBytes) throw new Error("Reel video is larger than 200MB. Please upload a smaller video.");

    const supabase = createSupabaseServiceRole();
    const bucket = videoBucketName();
    await ensureVideoBucket(supabase, bucket);

    const safeLabel = String(label || "reel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "reel";
    const extension = extensionFromMime(contentType);
    const path = [
        userId || "public",
        productId || randomUUID(),
        `${safeLabel}-${Date.now()}.${extension}`,
    ].join("/");

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
        contentType,
        upsert: true,
    });
    if (error) {
        if (String(error.message || "").toLowerCase().includes("exceeded")) {
            throw new Error("The video is larger than the current Supabase bucket limit. Increase the product-videos bucket file size limit to 200MB, then try again.");
        }
        throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

export async function publicProductImageFields(product, { userId, productId = "" } = {}) {
    const next = { ...product };
    if (isInlineImageUrl(next.image_url)) {
        next.image_url = await uploadProductImageIfNeeded(next.image_url, {
            userId,
            productId,
            label: next.product_code || next.sku || next.product_name || next.name,
        });
    }
    if (isInlineImageUrl(next.cleaned_image_url)) {
        next.cleaned_image_url = await uploadProductImageIfNeeded(next.cleaned_image_url, {
            userId,
            productId,
            label: `${next.product_code || next.sku || next.product_name || next.name || "product"}-clean`,
        });
    }
    return next;
}

export async function publicProductMediaFields(product, { userId, productId = "" } = {}) {
    const next = await publicProductImageFields(product, { userId, productId });
    if (isInlineVideoUrl(next.reel_video_url)) {
        next.reel_video_url = await uploadProductVideoIfNeeded(next.reel_video_url, {
            userId,
            productId,
            label: `${next.product_code || next.sku || next.product_name || next.name || "product"}-reel`,
        });
    }
    return next;
}
