import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function sanitizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function parseJsonObject(text = "") {
    const cleaned = String(text || "")
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) return {};
        try {
            return JSON.parse(match[0]);
        } catch {
            return {};
        }
    }
}

function normalizeResult(value = {}, index = 1) {
    const fallbackTitle = `Product ${String(index).padStart(2, "0")}`;
    return {
        title: sanitizeText(value.title).slice(0, 80) || fallbackTitle,
        description: sanitizeText(value.description).slice(0, 220) || "Review this product description before publishing.",
        category: sanitizeText(value.category).slice(0, 60) || "Photo upload",
    };
}

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);
        if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

        const body = await request.json().catch(() => ({}));
        const imageUrl = String(body.image_url || "");
        const price = String(body.price || "").trim();
        const index = Number(body.index || 1);

        if (!imageUrl.startsWith("data:image/")) {
            return NextResponse.json({ error: "Upload a valid product image first." }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                configured: false,
                ...normalizeResult({}, index),
                warning: "AI image reading is not configured. Add OPENAI_API_KEY to enable image-based product naming.",
            });
        }

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
                                    "You help ORVA create inventory records from product photos for small businesses.",
                                    "Read the image and infer a simple product title, category, and short sales-friendly description.",
                                    "Do not use the uploaded filename.",
                                    "Do not invent brand names, sizes, materials, discounts, or exact claims unless clearly visible.",
                                    price ? `Known price: ${price}. Do not repeat price in description unless useful.` : "",
                                    "Return only valid JSON in this exact shape:",
                                    '{"title":"","category":"","description":""}',
                                ].filter(Boolean).join("\n"),
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
            const errorText = await response.text();
            return NextResponse.json(
                { error: errorText || "Could not read this product image.", ...normalizeResult({}, index) },
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

        return NextResponse.json({
            configured: true,
            ...normalizeResult(parseJsonObject(outputText), index),
        });
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not read this product image." },
            { status: 500 }
        );
    }
}
