import { NextResponse } from "next/server";
import { calculateCampaignHealth } from "../../../lib/campaigns";
import { campaignsSetupError, isCampaignSchemaError, loadCampaign, loadProducts, requireCampaignRequest, routeParamId } from "../_shared";

export async function GET(request, context) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const campaignId = await routeParamId(context);
        if (!campaignId) return NextResponse.json({ error: "Campaign id is missing." }, { status: 400 });
        const campaign = await loadCampaign(supabase, user.id, campaignId);
        if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
        const { data: items, error } = await supabase
            .from("campaign_items")
            .select("*")
            .eq("campaign_id", campaign.id)
            .eq("client_id", user.id)
            .neq("status", "removed")
            .order("scheduled_at", { ascending: true });
        if (error) throw error;
        const products = await loadProducts(supabase, user.id, (items || []).map((item) => item.product_id).filter(Boolean));
        const health = calculateCampaignHealth(items || [], products);
        return NextResponse.json({ campaign, items: items || [], health });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not load campaign." }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const campaignId = await routeParamId(context);
        if (!campaignId) return NextResponse.json({ error: "Campaign id is missing." }, { status: 400 });
        const campaign = await loadCampaign(supabase, user.id, campaignId);
        if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

        const { error } = await supabase
            .from("campaigns")
            .delete()
            .eq("id", campaign.id)
            .eq("client_id", user.id);
        if (error) throw error;

        return NextResponse.json({ campaignId: campaign.id, message: "Campaign deleted." });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not delete campaign." }, { status: 500 });
    }
}
