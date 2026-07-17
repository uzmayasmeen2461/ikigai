import { NextResponse } from "next/server";
import { getUserRole } from "../../../lib/onboarding";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

function startDateForDays(days = 30) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - Math.max(1, Number(days || 30)) + 1);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
}

function dayKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
}

function formatPath(path = "") {
    try {
        const url = new URL(path, "https://orva.digital");
        return url.pathname || "/";
    } catch {
        return path || "/";
    }
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to load website analytics." }, { status: 503 });

    const supabase = createSupabaseServiceRole();
    const role = await getUserRole(supabase, user.id);
    if (role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const days = Number(new URL(request.url).searchParams.get("days") || 30);
    const since = startDateForDays(days);
    const { data, error } = await supabase
        .from("site_visits")
        .select("id, session_id, path, referrer, device_type, browser, visited_at")
        .gte("visited_at", since)
        .order("visited_at", { ascending: false })
        .limit(5000);

    if (error) {
        if (error.code === "42P01" || error.code === "42703") {
            return NextResponse.json({ setupRequired: true, error: "Run scripts/orva-site-analytics.sql in Supabase to enable website analytics." }, { status: 503 });
        }
        return NextResponse.json({ error: error.message || "Could not load website analytics." }, { status: 500 });
    }

    const rows = data || [];
    const uniqueSessions = new Set(rows.map((row) => row.session_id).filter(Boolean));
    const today = dayKey(new Date().toISOString());
    const todayRows = rows.filter((row) => dayKey(row.visited_at) === today);
    const pageCounts = rows.reduce((acc, row) => {
        const key = formatPath(row.path);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const deviceCounts = rows.reduce((acc, row) => {
        const key = row.device_type || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const daily = rows.reduce((acc, row) => {
        const key = dayKey(row.visited_at);
        acc[key] = acc[key] || { date: key, visits: 0, visitors: new Set() };
        acc[key].visits += 1;
        if (row.session_id) acc[key].visitors.add(row.session_id);
        return acc;
    }, {});

    return NextResponse.json({
        summary: {
            days,
            totalVisits: rows.length,
            uniqueVisitors: uniqueSessions.size,
            visitsToday: todayRows.length,
            uniqueVisitorsToday: new Set(todayRows.map((row) => row.session_id).filter(Boolean)).size,
        },
        topPages: Object.entries(pageCounts)
            .map(([path, visits]) => ({ path, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10),
        devices: Object.entries(deviceCounts).map(([device, visits]) => ({ device, visits })).sort((a, b) => b.visits - a.visits),
        daily: Object.values(daily).map((row) => ({ date: row.date, visits: row.visits, visitors: row.visitors.size })).sort((a, b) => a.date.localeCompare(b.date)),
        recent: rows.slice(0, 20),
    });
}
