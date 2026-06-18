import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function dataUrlToFile(dataUrl = "") {
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return null;
    const [, type, base64] = match;
    return {
        type,
        buffer: Buffer.from(base64, "base64"),
    };
}

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);
        if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const image = dataUrlToFile(body.image_url);
        if (!image) return NextResponse.json({ error: "Upload a valid image before enhancing." }, { status: 400 });

        if (!process.env.REMOVEBG_API_KEY) {
            return NextResponse.json({
                configured: false,
                error: "AI background cleanup is not configured. Add REMOVEBG_API_KEY to enable server-side image enhancement.",
            }, { status: 503 });
        }

        const formData = new FormData();
        formData.append("image_file", new Blob([image.buffer], { type: image.type }), "orva-product.png");
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
            const errorText = await response.text();
            return NextResponse.json({ error: errorText || "Could not enhance this image." }, { status: response.status });
        }

        const output = Buffer.from(await response.arrayBuffer());
        return NextResponse.json({
            configured: true,
            image_url: `data:image/png;base64,${output.toString("base64")}`,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not enhance this image." }, { status: 500 });
    }
}
