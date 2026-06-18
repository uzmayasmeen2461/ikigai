import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabaseServer";
import { formatINR } from "../../../lib/pricing";

export const runtime = "nodejs";

function cleanText(value = "", limit = 260) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
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

function fallbackReelCopy({ name = "ORVA Reel", price = "" } = {}) {
    const priceText = price ? ` at ${formatINR(price)}` : "";
    return {
        configured: false,
        hook: "New arrival for you",
        title: cleanText(name, 80) || "ORVA Reel",
        caption: `${cleanText(name, 80) || "This product"} is now available${priceText}.\nMessage us to order today.`,
        hashtags: "#ShopLocal #SmallBusiness #NewArrival #ORVA",
        cta: "DM to order",
    };
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const imageUrl = String(body.image_url || "");
    const name = cleanText(body.name || "ORVA Reel", 80);
    const price = String(body.price || "").trim();
    const currentCaption = cleanText(body.current_caption || "", 500);

    if (!imageUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "Could not read the reel preview frame. Upload a video and try again." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({
            ...fallbackReelCopy({ name, price }),
            warning: "AI video-frame reading is not configured. Add OPENAI_API_KEY to enable reel-specific captions.",
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
                                "You write short reel copy for ORVA, a local-business inventory-to-digital-presence SaaS.",
                                "Analyze this frame from the uploaded reel and write content that matches what is visibly shown.",
                                "Do not claim details that are not visible. Do not mention AI. Keep it suitable for an Indian local business.",
                                "Return only valid JSON in this shape:",
                                '{"title":"","hook":"","caption":"","hashtags":"","cta":""}',
                                "",
                                "Known user-entered context:",
                                `Title/name: ${name || "Not provided"}`,
                                `Price/offer: ${price ? formatINR(price) : "Not provided"}`,
                                currentCaption ? `Existing caption draft to improve: ${currentCaption}` : "",
                            ].filter(Boolean).join("\n"),
                        },
                        { type: "input_image", image_url: imageUrl },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text || "Could not generate reel content.", ...fallbackReelCopy({ name, price }) }, { status: response.status });
    }

    const payload = await response.json();
    const outputText =
        payload.output_text ||
        payload.output
            ?.flatMap((item) => item.content || [])
            ?.map((item) => item.text || "")
            ?.join("\n")
            ?.trim() ||
        "";
    const parsed = parseJsonObject(outputText);
    const fallback = fallbackReelCopy({ name, price });

    return NextResponse.json({
        configured: true,
        title: cleanText(parsed.title, 80) || fallback.title,
        hook: cleanText(parsed.hook, 90) || fallback.hook,
        caption: String(parsed.caption || fallback.caption).trim().slice(0, 700),
        hashtags: cleanText(parsed.hashtags, 180) || fallback.hashtags,
        cta: cleanText(parsed.cta, 40) || fallback.cta,
    });
}
