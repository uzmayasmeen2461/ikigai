import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserRole } from "../../../lib/onboarding";
import { createSupabaseAuthClient, createSupabaseServiceRole, getBearerToken, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function cleanText(value = "", max = 500) {
    return String(value || "").trim().slice(0, max);
}

function detectDevice(userAgent = "") {
    const value = userAgent.toLowerCase();
    if (/ipad|tablet/.test(value)) return "tablet";
    if (/mobile|iphone|android/.test(value)) return "mobile";
    return "desktop";
}

function detectBrowser(userAgent = "") {
    const value = userAgent.toLowerCase();
    if (value.includes("edg/")) return "Edge";
    if (value.includes("chrome/") && !value.includes("edg/")) return "Chrome";
    if (value.includes("safari/") && !value.includes("chrome/")) return "Safari";
    if (value.includes("firefox/")) return "Firefox";
    return "Other";
}

function requestIp(request) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "";
}

function hashIp(value = "") {
    if (!value) return "";
    return createHash("sha256").update(`${value}:${process.env.ANALYTICS_SALT || "orva"}`).digest("hex");
}

function searchParam(path = "", key = "") {
    try {
        const url = new URL(path, "https://orva.digital");
        return cleanText(url.searchParams.get(key) || "", 120);
    } catch {
        return "";
    }
}

export async function POST(request) {
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const path = cleanText(body.path || "/", 700);
        const userAgent = cleanText(body.userAgent || request.headers.get("user-agent") || "", 1000);
        const supabase = createSupabaseServiceRole();
        const token = getBearerToken(request);
        let user = null;
        let userRole = "";

        if (token) {
            const authClient = createSupabaseAuthClient();
            const { data } = await authClient.auth.getUser(token).catch(() => ({ data: null }));
            user = data?.user || null;
            if (user?.id) userRole = await getUserRole(supabase, user.id).catch(() => "");
        }

        const { error } = await supabase.from("site_visits").insert({
            event_type: cleanText(body.eventType || "page_view", 60),
            session_id: cleanText(body.sessionId || "", 160),
            user_id: user?.id || null,
            user_email: cleanText(user?.email || "", 320),
            user_role: cleanText(userRole, 60),
            path,
            title: cleanText(body.title || "", 180),
            referrer: cleanText(body.referrer || "", 700),
            utm_source: searchParam(path, "utm_source"),
            utm_medium: searchParam(path, "utm_medium"),
            utm_campaign: searchParam(path, "utm_campaign"),
            device_type: detectDevice(userAgent),
            browser: detectBrowser(userAgent),
            app_context: cleanText(body.appContext || "", 60),
            language: cleanText(body.language || "", 40),
            screen_width: Number(body.screen?.width || 0) || null,
            screen_height: Number(body.screen?.height || 0) || null,
            user_agent: userAgent,
            ip_hash: hashIp(requestIp(request)),
        });
        if (error) {
            if (error.code === "42P01" || error.code === "42703") return NextResponse.json({ ok: true, setupRequired: true });
            throw error;
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.warn("ORVA analytics visit skipped", error?.message || error);
        return NextResponse.json({ ok: true });
    }
}
