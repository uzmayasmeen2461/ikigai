import { NextResponse } from "next/server";
import { cleanPlatforms, platformOptions } from "../../../lib/campaigns";
import { publishDueCampaignItems } from "../../../lib/campaignAutomation";
import { nowISTISOString } from "../../../lib/istDate";
import { uploadProductImageIfNeeded } from "../../../lib/productImageStorage";
import { campaignsSetupError, isCampaignSchemaError, requireCampaignRequest } from "../../campaigns/_shared";

function datetimeLocalToIST(value = "") {
    const text = String(value || "").trim();
    if (!text) return null;
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(text)) return text;
    return `${text.length === 16 ? `${text}:00` : text}.000+05:30`;
}

function dateOnly(value = "") {
    const text = String(value || "");
    return text ? text.slice(0, 10) : nowISTISOString().slice(0, 10);
}

function postCaption(post = {}) {
    return [
        post.caption,
        post.cta,
        post.link ? `Link: ${post.link}` : "",
        post.hashtags,
    ].filter(Boolean).join("\n\n");
}

function platformChannel(contentType = "instagram_post") {
    return platformOptions.find((item) => item.id === contentType)?.channel || "instagram";
}

export async function POST(request) {
    const auth = await requireCampaignRequest(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, supabase } = auth;

    try {
        const body = await request.json().catch(() => ({}));
        const posts = Array.isArray(body.posts) ? body.posts.filter((post) => post?.imageUrl && post?.caption) : [];
        if (!posts.length) {
            return NextResponse.json({ error: "Add at least one marketing image with a caption before saving to Growth Autopilot." }, { status: 400 });
        }

        const selectedPlatforms = cleanPlatforms(body.selectedPlatforms, { publishableOnly: true });
        const scheduledValues = posts.map((post) => datetimeLocalToIST(post.scheduledFor)).filter(Boolean);
        const hasScheduledPosts = scheduledValues.length > 0;
        const startDate = scheduledValues.length ? dateOnly(scheduledValues[0]) : nowISTISOString().slice(0, 10);
        const endDate = scheduledValues.length ? dateOnly(scheduledValues[scheduledValues.length - 1]) : startDate;

        const { data: campaign, error: campaignError } = await supabase
            .from("campaigns")
            .insert({
                client_id: user.id,
                name: String(body.name || "Marketing Image Posts").trim(),
                campaign_type: "weekly",
                goal: "brand_awareness",
                status: hasScheduledPosts ? "active" : "generated",
                start_date: startDate,
                end_date: endDate,
                posting_window_start: "10:00",
                posting_window_end: "20:00",
                approval_mode: "ask_before_posting",
                selected_platforms: selectedPlatforms,
                settings: {
                    source: "marketing_content_upload",
                    postCount: posts.length,
                    note: "Standalone marketing images saved from Content Images.",
                },
            })
            .select("*")
            .single();

        if (campaignError) {
            if (isCampaignSchemaError(campaignError)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
            throw campaignError;
        }

        const campaignItems = [];
        for (let index = 0; index < posts.length; index += 1) {
            const post = posts[index];
            const contentType = selectedPlatforms[index % selectedPlatforms.length] || "instagram_post";
            const publicImageUrl = await uploadProductImageIfNeeded(post.imageUrl, {
                userId: user.id,
                productId: `marketing-${campaign.id}`,
                label: post.title || `marketing-post-${index + 1}`,
            });
            const scheduledAt = datetimeLocalToIST(post.scheduledFor);
            campaignItems.push({
                campaign_id: campaign.id,
                client_id: user.id,
                product_id: null,
                content_type: contentType,
                platforms: [platformChannel(contentType)],
                scheduled_at: scheduledAt,
                status: scheduledAt ? "scheduled" : "draft",
                generated_title: post.title || `Marketing Post ${index + 1}`,
                generated_caption: postCaption(post),
                generated_hashtags: post.hashtags || "",
                generated_cta: post.cta || "",
                media_url: publicImageUrl,
            });
        }

        const { data: items, error: itemsError } = await supabase
            .from("campaign_items")
            .insert(campaignItems)
            .select("*");
        if (itemsError) {
            if (isCampaignSchemaError(itemsError)) return NextResponse.json({ error: campaignsSetupError() }, { status: 503 });
            throw itemsError;
        }

        const publishResults = hasScheduledPosts
            ? await publishDueCampaignItems(supabase, {
                campaignId: campaign.id,
                clientId: user.id,
                limit: Math.max(1, campaignItems.length),
            })
            : [];
        const published = publishResults.filter((item) => item.status === "published").length;
        const failed = publishResults.filter((item) => item.status === "failed").length;

        return NextResponse.json({
            campaign,
            items: items || [],
            published,
            failed,
            message: hasScheduledPosts
                ? published
                    ? `${published} due marketing post${published === 1 ? "" : "s"} published now. Remaining posts are active in Growth Autopilot.`
                    : "Marketing images saved to the active campaign queue in Growth Autopilot."
                : "Marketing images saved as draft posts in Growth Autopilot.",
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not save marketing posts to Growth Autopilot." }, { status: 500 });
    }
}
