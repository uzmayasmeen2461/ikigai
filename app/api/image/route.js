import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const image = formData.get("image");

        if (!image) {
            return NextResponse.json(
                { error: "Image is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.REMOVEBG_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing REMOVEBG_API_KEY" },
                { status: 500 }
            );
        }

        const removeBgForm = new FormData();
        removeBgForm.append("image_file", image);
        removeBgForm.append("size", "auto");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
                "X-Api-Key": apiKey,
            },
            body: removeBgForm,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: errorText || "Background removal failed" },
                { status: response.status }
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Unexpected error" },
            { status: 500 }
        );
    }
}