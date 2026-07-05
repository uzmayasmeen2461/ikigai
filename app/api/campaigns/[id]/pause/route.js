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
        const { data, error } = await supabase.from("campaigns").update({ status: "paused", updated_at: nowISTISOString() }).eq("id", campaign.id).select("*").single();
        if (error) throw error;
        return NextResponse.json({ campaign: data, message: "Campaign paused." });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not pause campaign." }, { status: 500 });
    }
}
