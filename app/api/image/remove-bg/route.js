import { NextResponse } from "next/server";
import { getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const role = await getUserRole(user.id);
        if (!["admin", "partner", "worker"].includes(role)) {
            return NextResponse.json({ error: "Only internal users can clean catalog images." }, { status: 403 });
        }

        if (!process.env.REMOVEBG_API_KEY) {
            return NextResponse.json({ error: "Missing REMOVEBG_API_KEY." }, { status: 500 });
        }

        const formData = await request.formData();
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
