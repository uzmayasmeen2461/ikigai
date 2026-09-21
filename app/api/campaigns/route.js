import { NextResponse } from "next/server";
import { refreshCampaignCompletion } from "../../lib/campaigns";
import { campaignsSetupError, isCampaignSchemaError, requireCampaignRequest } from "./_shared";

function hasAllPublishedItems(campaign = {}) {
    const visibleItems = (campaign.campaign_items || []).filter((item) => String(item.status || "").trim().toLowerCase() !== "removed");
    const statuses = visibleItems.map((item) => String(item.status || "").trim().toLowerCase());
    const hasPostedItems = statuses.some((status) => ["published", "posted"].includes(status));
    const hasUnfinishedItems = statuses.some((status) => ["draft", "approved", "scheduled"].includes(status));
    return visibleItems.length > 0 && hasPostedItems && !hasUnfinishedItems;
}

export async function GET(request) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const { data, error } = await supabase
            .from("campaigns")
            .select("*, campaign_items(*)")
            .eq("client_id", user.id)
            .order("created_at", { ascending: false });
        if (error) {
            if (isCampaignSchemaError(error)) return NextResponse.json({ campaigns: [], warning: campaignsSetupError() });
            throw error;
        }
        const campaigns = data || [];
        const completedUpdates = await Promise.all(campaigns
            .filter((campaign) => campaign.status !== "completed" && hasAllPublishedItems(campaign))
            .map((campaign) => refreshCampaignCompletion(supabase, campaign.id)));
        const completedById = new Map(completedUpdates.filter(Boolean).map((campaign) => [campaign.id, campaign]));
        return NextResponse.json({
            campaigns: campaigns.map((campaign) => completedById.has(campaign.id)
                ? { ...campaign, ...completedById.get(campaign.id), campaign_items: campaign.campaign_items }
                : campaign),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not load campaigns." }, { status: 500 });
    }
}
