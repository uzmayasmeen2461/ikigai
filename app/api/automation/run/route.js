import { NextResponse } from "next/server";
import { autoApproveStaleSubmissions, refreshSlaStatuses } from "../../../lib/automation";
import { publishDueCampaignItems } from "../../../lib/campaignAutomation";
import { publishDueGrowthAutopilotItems } from "../../../lib/growthAutopilotPublishing";
import { createSupabaseAdmin } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

function isAuthorizedAutomationRequest(request) {
    const expectedSecrets = [process.env.AUTOMATION_SECRET, process.env.CRON_SECRET].filter(Boolean);
    if (!expectedSecrets.length) return true;
    const secret = request.headers.get("x-automation-secret");
    const authorization = request.headers.get("authorization") || "";
    return expectedSecrets.includes(secret) || expectedSecrets.some((value) => authorization === `Bearer ${value}`);
}

async function runAutomation(request) {
    if (!isAuthorizedAutomationRequest(request)) {
        return NextResponse.json({ error: "Unauthorized automation run." }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const [slaUpdates, autoApproved, growthAutopilot, campaignItems] = await Promise.all([
        refreshSlaStatuses(supabase),
        autoApproveStaleSubmissions(supabase),
        publishDueGrowthAutopilotItems(supabase),
        publishDueCampaignItems(supabase),
    ]);

    return NextResponse.json({
        success: true,
        sla_updates: slaUpdates.length,
        auto_approved: autoApproved.length,
        growth_autopilot_published: growthAutopilot.filter((item) => item.status === "published").length,
        growth_autopilot_failed: growthAutopilot.filter((item) => item.status === "failed").length,
        campaign_posts_published: campaignItems.filter((item) => item.status === "published").length,
        campaign_posts_failed: campaignItems.filter((item) => item.status === "failed").length,
    });
}

export async function POST(request) {
    return runAutomation(request);
}

export async function GET(request) {
    return runAutomation(request);
}
