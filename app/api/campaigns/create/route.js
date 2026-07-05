import { NextResponse } from "next/server";
import { campaignDurationDefaults, cleanApprovalMode, cleanCampaignGoal, cleanCampaignType, cleanPlatforms } from "../../../lib/campaigns";
import { nowISTISOString } from "../../../lib/istDate";
import { campaignsSetupError, isCampaignSchemaError, requireCampaignRequest } from "../_shared";

function defaultEndDate(startDate, type) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const duration = campaignDurationDefaults(type).days;
    start.setUTCDate(start.getUTCDate() + duration - 1);
    return start.toISOString().slice(0, 10);
}

export async function POST(request) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const body = await request.json().catch(() => ({}));
        const campaignType = cleanCampaignType(body.campaignType);
        const approvalMode = cleanApprovalMode(body.approvalMode);
        const startDate = body.startDate || nowISTISOString().slice(0, 10);
        const endDate = body.endDate || defaultEndDate(startDate, campaignType);
        const defaults = campaignDurationDefaults(campaignType);

        const payload = {
            client_id: user.id,
            name: String(body.name || "ORVA Marketing Campaign").trim(),
            campaign_type: campaignType,
            goal: cleanCampaignGoal(body.goal),
            status: "draft",
            start_date: startDate,
            end_date: endDate,
            posting_window_start: body.postingWindowStart || "10:00",
            posting_window_end: body.postingWindowEnd || "20:00",
            approval_mode: approvalMode,
            selected_platforms: cleanPlatforms(body.selectedPlatforms, { publishableOnly: true }),
            settings: { ...defaults, ...(body.settings || {}) },
        };

        const { data, error } = await supabase.from("campaigns").insert(payload).select("*").single();
        if (error) {
            if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
            throw error;
        }
        return NextResponse.json({ campaign: data, message: "Campaign created." }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not create campaign." }, { status: 500 });
    }
}
