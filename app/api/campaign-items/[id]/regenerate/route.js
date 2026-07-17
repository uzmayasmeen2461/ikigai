import { NextResponse } from "next/server";
import { buildCampaignSchedule, writeCampaignLog } from "../../../../lib/campaigns";
import { nowISTISOString } from "../../../../lib/istDate";
import { campaignsSetupError, isCampaignSchemaError, loadCampaignItem, loadProducts, requireCampaignRequest, routeParamId } from "../../../campaigns/_shared";

function isRealUuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function regenerateStandaloneMarketingItem(item = {}) {
    const title = item.generated_title || "Marketing Post";
    const hashtags = item.generated_hashtags || "#ORVA #LocalBusiness #DigitalGrowth";
    return {
        generated_caption: [
            `${title} is ready to go live.`,
            "Use this post to keep your audience engaged, remind customers what your business offers, and invite them to take the next step.",
            item.generated_cta || "Message us today",
        ].filter(Boolean).join("\n\n"),
        generated_hashtags: hashtags,
        generated_cta: item.generated_cta || "Message us today",
    };
}

export async function POST(request, context) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const itemId = await routeParamId(context);
        if (!itemId) return NextResponse.json({ error: "Campaign item id is missing." }, { status: 400 });
        const item = await loadCampaignItem(supabase, user.id, itemId);
        if (!item) return NextResponse.json({ error: "Campaign item not found." }, { status: 404 });
        let regenerated;
        if (isRealUuid(item.product_id)) {
            const products = await loadProducts(supabase, user.id, [item.product_id]);
            regenerated = buildCampaignSchedule({
                campaign: { ...item.campaigns, selected_platforms: [item.content_type], settings: { posts: 1 } },
                products,
            })[0];
        } else {
            regenerated = regenerateStandaloneMarketingItem(item);
        }
        if (!regenerated) return NextResponse.json({ error: "Could not regenerate this post." }, { status: 400 });
        const { data, error } = await supabase
            .from("campaign_items")
            .update({
                generated_caption: regenerated.generated_caption,
                generated_hashtags: regenerated.generated_hashtags,
                generated_cta: regenerated.generated_cta,
                status: "draft",
                updated_at: nowISTISOString(),
            })
            .eq("id", item.id)
            .eq("client_id", user.id)
            .select("*")
            .single();
        if (error) throw error;
        await writeCampaignLog(supabase, { campaign_item_id: item.id, action: "regenerated", actor_id: user.id });
        return NextResponse.json({ item: data, message: "Post regenerated." });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not regenerate post." }, { status: 500 });
    }
}
