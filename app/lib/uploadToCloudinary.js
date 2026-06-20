import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export function hasCloudinaryUploadConfig() {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
    );
}

export async function uploadToCloudinary(source, options = {}) {
    if (!hasCloudinaryUploadConfig()) {
        throw new Error("Cloudinary upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
    }

    const uploadSource = Buffer.isBuffer(source)
        ? `data:image/jpeg;base64,${source.toString("base64")}`
        : source;

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            uploadSource,
            {
                folder: "whatsapp_catalog",
                resource_type: "image",
                transformation: [
                    { width: 1200, height: 1200, crop: "limit" },
                    { quality: "auto:good" },
                    { fetch_format: "jpg" },
                ],
                ...options,
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    return;
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );
    });
}
