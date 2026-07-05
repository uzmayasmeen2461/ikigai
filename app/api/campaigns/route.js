import { NextResponse } from "next/server";
import { campaignsSetupError, isCampaignSchemaError, requireCampaignRequest } from "./_shared";

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
        return NextResponse.json({ campaigns: data || [] });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not load campaigns." }, { status: 500 });
    }
}
