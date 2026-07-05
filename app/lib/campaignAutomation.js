import { publishCampaignItem } from "./campaigns";
import { nowISTISOString } from "./istDate";

export async function publishDueCampaignItems(supabase, options = 10) {
    const normalizedOptions = typeof options === "number" ? { limit: options } : (options || {});
    const limit = Math.max(1, Number(normalizedOptions.limit || 10));
    let query = supabase
        .from("campaign_items")
        .select("*, campaigns!inner(*)")
        .eq("status", "scheduled")
        .lte("scheduled_at", nowISTISOString())
        .in("campaigns.status", ["active", "scheduled"])
        .order("scheduled_at", { ascending: true });

    if (normalizedOptions.clientId) query = query.eq("client_id", normalizedOptions.clientId);
    if (normalizedOptions.campaignId) query = query.eq("campaign_id", normalizedOptions.campaignId);

    const { data: items, error } = await query.limit(limit);

    if (error) {
        if (error.code === "42P01" || error.code === "42703") return [];
        throw error;
    }

    const results = [];
    for (const item of items || []) {
        try {
            const updated = await publishCampaignItem({ supabase, item, userId: item.client_id });
            results.push({ id: item.id, status: "published", item: updated });
        } catch (publishError) {
            await supabase
                .from("campaign_items")
                .update({
                    status: "failed",
                    error_message: publishError.message || "Could not publish campaign item.",
                    updated_at: nowISTISOString(),
                })
                .eq("id", item.id);
            results.push({ id: item.id, status: "failed", error: publishError.message || "Could not publish campaign item." });
        }
    }
    return results;
}
