import { NextResponse } from "next/server";
import { publishDueCampaignItems } from "../../../../lib/campaignAutomation";
import { hourlyScheduleFromNow, isAutoPublishablePlatform } from "../../../../lib/campaigns";
import { requireActiveSubscription } from "../../../../lib/onboarding";
import { nowISTISOString } from "../../../../lib/istDate";
import { campaignsSetupError, isCampaignSchemaError, loadCampaign, requireCampaignRequest, routeParamId } from "../../_shared";

export async function POST(request, context) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const access = await requireActiveSubscription(user.id);
        if (!access.ok) return NextResponse.json({ error: access.error || "Activate your ORVA plan to schedule campaigns." }, { status: access.status || 403 });
        const campaignId = await routeParamId(context);
        if (!campaignId) return NextResponse.json({ error: "Campaign id is missing." }, { status: 400 });
        const campaign = await loadCampaign(supabase, user.id, campaignId);
        if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

        const { data: approvedItems, error: approvedError } = await supabase
            .from("campaign_items")
            .select("*")
            .eq("campaign_id", campaign.id)
            .eq("client_id", user.id)
            .eq("status", "approved")
            .order("scheduled_at", { ascending: true });
        if (approvedError) throw approvedError;

        const publishableItems = (approvedItems || []).filter((item) => isAutoPublishablePlatform(item.content_type));
        const manualOnlyItems = (approvedItems || []).filter((item) => !isAutoPublishablePlatform(item.content_type));

        if (manualOnlyItems.length) {
            await supabase
                .from("campaign_items")
                .update({
                    error_message: "Manual export only. This format is not connected to automatic publishing yet.",
                    updated_at: nowISTISOString(),
                })
                .in("id", manualOnlyItems.map((item) => item.id))
                .eq("client_id", user.id);
        }

        let scheduledItems = [];
        if (campaign.campaign_type === "hourly" && publishableItems.length) {
            const scheduledTimes = hourlyScheduleFromNow(campaign, publishableItems.length);
            const updates = await Promise.all(publishableItems.map((item, index) => supabase
                .from("campaign_items")
                .update({
                    status: "scheduled",
                    scheduled_at: scheduledTimes[index],
                    updated_at: nowISTISOString(),
                })
                .eq("id", item.id)
                .eq("client_id", user.id)
                .select("*")
                .single()));
            const updateError = updates.find((result) => result.error)?.error;
            if (updateError) throw updateError;
            scheduledItems = updates.map((result) => result.data).filter(Boolean);
        } else {
            const { data, error } = await supabase
                .from("campaign_items")
                .update({ status: "scheduled", updated_at: nowISTISOString() })
                .eq("campaign_id", campaign.id)
                .eq("client_id", user.id)
                .eq("status", "approved")
                .in("content_type", ["instagram_post", "facebook_post"])
                .select("*");
            if (error) throw error;
            scheduledItems = data || [];
        }

        const { data: activeCampaign, error: campaignUpdateError } = await supabase
            .from("campaigns")
            .update({ status: "active", updated_at: nowISTISOString() })
            .eq("id", campaign.id)
            .select("*")
            .single();
        if (campaignUpdateError) throw campaignUpdateError;
        const publishResults = await publishDueCampaignItems(supabase, Math.max(1, scheduledItems.length));
        const { data: refreshedItems, error: refreshError } = await supabase
            .from("campaign_items")
            .select("*")
            .eq("campaign_id", campaign.id)
            .eq("client_id", user.id)
            .neq("status", "removed")
            .order("scheduled_at", { ascending: true });
        if (refreshError) throw refreshError;
        const published = publishResults.filter((item) => item.status === "published").length;
        const failed = publishResults.filter((item) => item.status === "failed").length;
        return NextResponse.json({
            campaign: activeCampaign,
            items: refreshedItems || scheduledItems,
            published,
            failed,
            message: published
                ? `${published} due post published now. Remaining publishable posts are scheduled.`
                : manualOnlyItems.length
                    ? "Publishable posts are scheduled. Stories, reels, and status items remain manual export for now."
                    : "Approved posts are scheduled.",
        });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not schedule campaign." }, { status: 500 });
    }
}
