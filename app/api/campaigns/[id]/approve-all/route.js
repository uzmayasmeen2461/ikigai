import { NextResponse } from "next/server";
import { nowISTISOString } from "../../../../lib/istDate";
import { campaignsSetupError, isCampaignSchemaError, loadCampaign, requireCampaignRequest, routeParamId } from "../../_shared";

export async function POST(request, context) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const campaignId = await routeParamId(context);
        if (!campaignId) return NextResponse.json({ error: "Campaign id is missing." }, { status: 400 });
        const campaign = await loadCampaign(supabase, user.id, campaignId);
        if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
        const { data, error } = await supabase
            .from("campaign_items")
            .update({ status: "approved", updated_at: nowISTISOString() })
            .eq("campaign_id", campaign.id)
            .eq("client_id", user.id)
            .eq("status", "draft")
            .select("*");
        if (error) throw error;
        const { data: approvedCampaign, error: campaignUpdateError } = await supabase
            .from("campaigns")
            .update({ status: "approved", updated_at: nowISTISOString() })
            .eq("id", campaign.id)
            .select("*")
            .single();
        if (campaignUpdateError) throw campaignUpdateError;
        return NextResponse.json({ campaign: approvedCampaign, items: data || [], message: "All draft posts approved." });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not approve campaign." }, { status: 500 });
    }
}
