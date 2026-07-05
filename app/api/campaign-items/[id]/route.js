import { NextResponse } from "next/server";
import { writeCampaignLog } from "../../../lib/campaigns";
import { nowISTISOString } from "../../../lib/istDate";
import { campaignsSetupError, isCampaignSchemaError, loadCampaignItem, requireCampaignRequest, routeParamId } from "../../campaigns/_shared";

const editableFields = new Set(["generated_caption", "generated_hashtags", "generated_cta", "scheduled_at", "status"]);

export async function PATCH(request, context) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const itemId = await routeParamId(context);
        if (!itemId) return NextResponse.json({ error: "Campaign item id is missing." }, { status: 400 });
        const item = await loadCampaignItem(supabase, user.id, itemId);
        if (!item) return NextResponse.json({ error: "Campaign item not found." }, { status: 404 });
        const body = await request.json().catch(() => ({}));
        const updates = { updated_at: nowISTISOString() };
        for (const field of editableFields) {
            if (field in body) updates[field] = body[field];
        }
        const { data, error } = await supabase
            .from("campaign_items")
            .update(updates)
            .eq("id", item.id)
            .eq("client_id", user.id)
            .select("*")
            .single();
        if (error) throw error;
        await writeCampaignLog(supabase, { campaign_item_id: item.id, action: "edited", actor_id: user.id });
        return NextResponse.json({ item: data, message: "Campaign item updated." });
    } catch (error) {
        if (isCampaignSchemaError(error)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not update campaign item." }, { status: 500 });
    }
}
