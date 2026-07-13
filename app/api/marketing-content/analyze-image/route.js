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
    const fallbackTitle = `Marketing Post ${String(index).padStart(2, "0")}`;
    return {
        title: sanitizeText(value.title).slice(0, 90) || fallbackTitle,
        caption: sanitizeText(value.caption).slice(0, 520) || "",
        cta: sanitizeText(value.cta).slice(0, 80) || "Message us to know more",
        hashtags: sanitizeText(value.hashtags).slice(0, 180) || "#ORVA #LocalBusiness #DigitalGrowth",
    };
}

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);
        if (authError || !user) {
            return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const imageUrl = String(body.image_url || "");
        const index = Number(body.index || 1);
        const context = sanitizeText(body.context || "");

        if (!imageUrl.startsWith("data:image/")) {
            return NextResponse.json({ error: "Upload a valid marketing image first." }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                configured: false,
                ...normalizeResult({}, index),
                warning: "AI image reading is not configured. Add OPENAI_API_KEY to enable image-based marketing captions.",
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
                                    "You help ORVA create high-converting social media captions for small businesses.",
                                    "Read the image visually. Do not use the uploaded filename.",
                                    context ? `Extra context from user: ${context}.` : "",
                                    "Create copy for Instagram/Facebook/WhatsApp marketing posts.",
                                    "If the image is an ORVA feature graphic, explain that feature clearly for business owners.",
                                    "If the image shows a product, service, offer, event, or brand message, describe that specific thing.",
                                    "Do not invent exact discounts, ingredients, claims, brand names, prices, dates, or guarantees unless visible in the image.",
                                    "Avoid generic lines like 'your customers are online'. Make the caption specific to what is visible.",
                                    "Use a confident, simple, sales-friendly tone for Indian local businesses.",
                                    "Return only valid JSON in this exact shape:",
                                    '{"title":"","caption":"","cta":"","hashtags":""}',
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
                { error: errorText || "Could not read this marketing image.", ...normalizeResult({}, index) },
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
            { error: error.message || "Could not read this marketing image." },
            { status: 500 }
        );
    }
}
