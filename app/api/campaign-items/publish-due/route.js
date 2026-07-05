import { NextResponse } from "next/server";
import { publishDueCampaignItems } from "../../../lib/campaignAutomation";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function isAuthorizedAutomationRequest(request) {
    const expectedSecrets = [process.env.AUTOMATION_SECRET, process.env.CRON_SECRET].filter(Boolean);
    const secret = request.headers.get("x-automation-secret");
    const authorization = request.headers.get("authorization") || "";
    return expectedSecrets.length && (expectedSecrets.includes(secret) || expectedSecrets.some((value) => authorization === `Bearer ${value}`));
}

async function runPublishDue(request) {
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before publishing campaign items." }, { status: 503 });
    }

    const supabase = createSupabaseServiceRole();
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const automationRequest = isAuthorizedAutomationRequest(request);
    const { user, error: authError } = automationRequest ? { user: null, error: null } : await getAuthenticatedUser(request);
    if (!automationRequest && (authError || !user)) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const results = await publishDueCampaignItems(supabase, {
        limit: Number(body.limit || 10),
        clientId: automationRequest ? body.clientId : user.id,
        campaignId: body.campaignId,
    });

    return NextResponse.json({
        success: true,
        published: results.filter((item) => item.status === "published").length,
        failed: results.filter((item) => item.status === "failed").length,
        results,
    });
}

export async function POST(request) {
    return runPublishDue(request);
}

export async function GET(request) {
    return runPublishDue(request);
}
