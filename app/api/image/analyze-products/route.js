import { NextResponse } from "next/server";
import { getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 7 * 1024 * 1024;

function sanitizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeProducts(value) {
    const items = Array.isArray(value) ? value : [];

    return items
        .map((item) => ({
            title: sanitizeText(item?.title).slice(0, 80),
            description: sanitizeText(item?.description || item?.short_description).slice(0, 180),
            category: sanitizeText(item?.category || "General").slice(0, 60),
        }))
        .filter((item) => item.title || item.description || item.category)
        .slice(0, 12);
}

function parseJsonArray(text = "") {
    const cleaned = String(text || "")
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (!match) return [];
        try {
            return JSON.parse(match[0]);
        } catch {
            return [];
        }
    }
}

function fallbackProduct(businessCategory = "General") {
    const category = sanitizeText(businessCategory) || "General";

    return {
        title: "",
        description: "",
        category,
    };
}

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const role = await getUserRole(user.id);
        if (!["admin", "partner", "worker"].includes(role)) {
            return NextResponse.json({ error: "Only internal users can analyze catalog images." }, { status: 403 });
        }

        const formData = await request.formData();
        const image = formData.get("image");
        const businessCategory = sanitizeText(formData.get("businessCategory") || "General");

        if (!(image instanceof File)) {
            return NextResponse.json({ error: "Image file is required." }, { status: 400 });
        }

        if (!image.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are supported." }, { status: 400 });
        }

        if (image.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Image is too large. Please keep files under 7MB." }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                configured: false,
                warning: "AI image study is not configured. Add OPENAI_API_KEY to .env.local and restart the server.",
                products: [fallbackProduct(businessCategory)],
            });
        }

        const imageBuffer = Buffer.from(await image.arrayBuffer());
        const imageUrl = `data:${image.type};base64,${imageBuffer.toString("base64")}`;

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "input_text",
                                text: [
                                    "You are helping a shop owner create WhatsApp catalog items.",
                                    `Business/category hint: ${businessCategory}.`,
                                    "From the image, identify visible products.",
                                    "For each product, generate title, description, and category.",
                                    "Descriptions must be WhatsApp friendly and max 2 short lines.",
                                    "Return only valid JSON in this exact shape:",
                                    '[{"title":"","description":"","category":""}]',
                                    "Do not include prices unless they are clearly visible in the image.",
                                ].join("\n"),
                            },
                            {
                                type: "input_image",
                                image_url: imageUrl,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json(
                { error: text || "Could not analyze this product image." },
                { status: response.status }
            );
        }

        const payload = await response.json();
        const outputText =
            payload.output_text ||
            payload.output
                ?.flatMap((item) => item.content || [])
                ?.map((item) => item.text || "")
                ?.join("\n") ||
            "";

        const products = normalizeProducts(parseJsonArray(outputText));

        return NextResponse.json({ products });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not analyze this product image." },
            { status: 500 }
        );
    }
}
