import { publishProductToFacebookPage } from "./facebookPage";
import { buildFacebookPageCaption, buildInstagramCaption, productName, productNotes, productStock } from "./inventory";
import { publishProductToInstagram } from "./instagramPublishing";
import { requireActiveSubscription } from "./onboarding";
import { publicProductImageFields } from "./productImageStorage";
import { formatINR } from "./pricing";
import { istDateParts, istTodayISO, nowISTISOString, scheduledISTISOString } from "./istDate";

export const campaignTypes = ["hourly", "weekly", "monthly"];
export const campaignGoals = ["best_sellers", "new_arrivals", "clear_old_stock", "festival", "weekend_sale", "brand_awareness", "mixed"];
export const campaignStatuses = ["draft", "generated", "approved", "scheduled", "active", "paused", "completed", "failed"];
export const campaignItemStatuses = ["draft", "approved", "scheduled", "published", "failed", "removed"];

export const platformOptions = [
    { id: "instagram_post", label: "Instagram Post", channel: "instagram", kind: "post" },
    { id: "instagram_story", label: "Instagram Story", channel: "instagram", kind: "story" },
    { id: "instagram_reel", label: "Instagram Reel", channel: "instagram", kind: "reel" },
    { id: "facebook_post", label: "Facebook Page Post", channel: "facebook_page", kind: "post" },
    { id: "facebook_story", label: "Facebook Story", channel: "facebook_page", kind: "story" },
    { id: "facebook_reel", label: "Facebook Reel", channel: "facebook_page", kind: "reel" },
    { id: "whatsapp_status", label: "WhatsApp Status", channel: "whatsapp_status", kind: "status" },
];

export const autoPublishablePlatformIds = ["instagram_post", "facebook_post"];

function isRealUuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function cleanCampaignType(value = "weekly") {
    return campaignTypes.includes(value) ? value : "weekly";
}

export function cleanCampaignGoal(value = "mixed") {
    return campaignGoals.includes(value) ? value : "mixed";
}

export function cleanApprovalMode(value = "ask_before_posting") {
    return value === "auto_post_approved" ? "auto_post_approved" : "ask_before_posting";
}

export function isAutoPublishablePlatform(value) {
    return autoPublishablePlatformIds.includes(value);
}

export function cleanPlatforms(values = [], options = {}) {
    const requested = Array.isArray(values) ? values : [];
    const allowed = new Set(platformOptions
        .filter((item) => !options.publishableOnly || isAutoPublishablePlatform(item.id))
        .map((item) => item.id));
    const cleaned = requested.filter((item) => allowed.has(item));
    return cleaned.length ? cleaned : [...autoPublishablePlatformIds];
}

function productImage(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

function productDescription(product = {}) {
    return product.description || product.notes || "";
}

function productPrice(product = {}) {
    return Number(product.price || 0);
}

function productCategory(product = {}) {
    return String(product.category || "General").trim() || "General";
}

function productScore(product = {}) {
    let score = 0;
    if (productImage(product)) score += 30;
    if (productPrice(product) > 0) score += 20;
    if (productDescription(product)) score += 15;
    if (productStock(product) > 0) score += 15;
    if (!product.last_promoted_at) score += 15;
    score -= Number(product.promotion_count || 0) * 3;
    return score;
}

export function smartSelectProducts(products = [], limit = 12) {
    const visible = products.filter((product) => product.status !== "hidden" && productStock(product) > 0);
    const complete = visible.filter((product) => productImage(product));
    const pool = complete.length ? complete : visible.length ? visible : products;
    const categories = new Set();
    const balanced = [];

    for (const product of [...pool].sort((a, b) => productScore(b) - productScore(a))) {
        const category = productCategory(product);
        if (!categories.has(category) || balanced.length >= Math.max(3, categories.size)) {
            balanced.push(product);
            categories.add(category);
        }
        if (balanced.length >= limit) break;
    }

    if (balanced.length < Math.min(limit, pool.length)) {
        for (const product of [...pool].sort((a, b) => productScore(b) - productScore(a))) {
            if (!balanced.find((item) => item.id === product.id)) balanced.push(product);
            if (balanced.length >= limit) break;
        }
    }

    return balanced;
}

export function campaignDurationDefaults(type = "weekly") {
    if (type === "hourly") return { posts: 8, stories: 0, reels: 1, days: 1 };
    if (type === "monthly") return { posts: 20, stories: 8, reels: 4, days: 30 };
    return { posts: 7, stories: 3, reels: 2, days: 7 };
}

function parseTime(value = "10:00") {
    const [rawHour, rawMinute] = String(value || "10:00").split(":").map((part) => Number.parseInt(part, 10));
    return {
        hour: Number.isFinite(rawHour) ? Math.min(23, Math.max(0, rawHour)) : 10,
        minute: Number.isFinite(rawMinute) ? Math.min(59, Math.max(0, rawMinute)) : 0,
    };
}

function addDaysToDate(dateValue, offset) {
    const [year, month, day] = String(dateValue || "").split("-").map((part) => Number.parseInt(part, 10));
    const date = Number.isFinite(year) ? new Date(Date.UTC(year, month - 1, day + offset)) : new Date();
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function itemCountForCampaign(campaign = {}) {
    const settings = campaign.settings || {};
    if (campaign.campaign_type === "hourly") return Math.max(1, Number(settings.postsPerDay || settings.posts || 8));
    if (campaign.campaign_type === "monthly") return Math.max(1, Number(settings.postsPerMonth || settings.posts || 20));
    return Math.max(1, Number(settings.postsPerWeek || settings.posts || 7));
}

function scheduleForIndex(campaign = {}, index = 0, total = 1) {
    const start = campaign.start_date || new Date().toISOString().slice(0, 10);
    const end = campaign.end_date || start;
    const startTime = parseTime(campaign.posting_window_start || "10:00");
    const endTime = parseTime(campaign.posting_window_end || "20:00");
    const startHour = startTime.hour;
    const endHour = endTime.hour;
    const span = Math.max(1, endHour - startHour + 1);

    if (campaign.campaign_type === "hourly") {
        return hourlyScheduleFromNow(campaign, total)[index] || scheduledISTISOString(0, Math.min(endHour, startHour + index), startTime.minute);
    }

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T00:00:00.000Z`);
    const days = Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
    const dayOffset = Math.min(days - 1, Math.floor((index / Math.max(1, total)) * days));
    const date = addDaysToDate(start, dayOffset);
    const hour = startHour + (index % span);
    return `${date}T${String(hour).padStart(2, "0")}:${String(startTime.minute).padStart(2, "0")}:00.000+05:30`;
}

export function hourlyScheduleFromNow(campaign = {}, count = 1) {
    const startTime = parseTime(campaign.posting_window_start || "10:00");
    const endTime = parseTime(campaign.posting_window_end || "20:00");
    const now = istDateParts();
    const today = istTodayISO();
    const startDate = campaign.start_date || today;
    const startIsTodayOrPast = String(startDate) <= today;
    let dayOffset = startIsTodayOrPast ? 0 : Math.max(0, Math.round((new Date(`${startDate}T00:00:00.000Z`) - new Date(`${today}T00:00:00.000Z`)) / 86400000));
    let hour = startTime.hour;
    let minute = startTime.minute;

    if (dayOffset === 0) {
        const afterWindow = now.hour > endTime.hour || (now.hour === endTime.hour && now.minute > endTime.minute);
        const insideWindow = !afterWindow && (now.hour > startTime.hour || (now.hour === startTime.hour && now.minute >= startTime.minute));
        if (insideWindow) {
            hour = now.hour;
            minute = now.minute;
        } else if (afterWindow) {
            dayOffset = 1;
        }
    }

    return Array.from({ length: Math.max(1, Number(count || 1)) }, (_, index) => {
        const currentHour = hour + index;
        const span = Math.max(1, endTime.hour - startTime.hour + 1);
        const slotIndex = Math.max(0, currentHour - startTime.hour);
        const overflowDays = Math.floor(slotIndex / span);
        const normalizedHour = startTime.hour + (slotIndex % span);
        return scheduledISTISOString(dayOffset + overflowDays, normalizedHour, minute);
    });
}

function contentForType(contentType = "instagram_post", product = {}, goal = "mixed") {
    const name = productName(product);
    const price = formatINR(productPrice(product));
    const notes = productNotes(product);
    const hashtags = ["#ORVA", "#ShopLocal", "#LocalBusiness", product.category ? `#${String(product.category).replace(/[^a-z0-9]/gi, "")}` : ""].filter(Boolean).join(" ");

    if (contentType === "instagram_post") {
        return { caption: buildInstagramCaption(product), hashtags, cta: "DM to order" };
    }
    if (contentType === "instagram_story") {
        return { caption: `New pick for today\n${name}\n${price}\nDM to order`, hashtags: "", cta: "DM to order" };
    }
    if (contentType === "instagram_reel") {
        return { caption: `New arrival alert ✨ ${name} is available now.\nTap to order or message us today.`, hashtags, cta: "DM to order" };
    }
    if (contentType === "facebook_post") {
        return { caption: buildFacebookPageCaption(product), hashtags: "#ORVA #LocalBusiness #ShopLocal", cta: "Message us" };
    }
    if (contentType === "facebook_story" || contentType === "facebook_reel") {
        return { caption: `${name} is available now.\nPrice: ${price}\nContact us to order.`, hashtags: "#ORVA #ShopLocal", cta: "Message us" };
    }
    if (contentType === "whatsapp_status") {
        return { caption: `${name} - ${price}\nAvailable now. Message us to order.`, hashtags: "", cta: "Message to order" };
    }
    return { caption: notes || `${name}\n${price}\nMessage us to order.`, hashtags: "", cta: "Message to order" };
}

export function buildCampaignSchedule({ campaign = {}, products = [] }) {
    const selectedPlatforms = cleanPlatforms(campaign.selected_platforms, { publishableOnly: true });
    const count = itemCountForCampaign(campaign);
    const eligible = smartSelectProducts(products, Math.max(count, 8));
    if (!eligible.length) return [];

    return Array.from({ length: count }, (_, index) => {
        const product = eligible[index % eligible.length];
        const contentType = selectedPlatforms[index % selectedPlatforms.length];
        const platform = platformOptions.find((item) => item.id === contentType) || platformOptions[0];
        const content = contentForType(contentType, product, campaign.goal);
        return {
            client_id: campaign.client_id,
            campaign_id: campaign.id,
            product_id: product.id,
            content_type: contentType,
            platforms: [platform.channel],
            scheduled_at: scheduleForIndex(campaign, index, count),
            status: "draft",
            generated_title: `${platform.label}: ${productName(product)}`,
            generated_caption: content.caption,
            generated_hashtags: content.hashtags,
            generated_cta: content.cta,
            media_url: productImage(product),
        };
    });
}

export function calculateCampaignHealth(items = [], products = []) {
    if (!items.length) return { score: 0, recommendations: ["Generate campaign items first."] };
    const productMap = new Map(products.map((product) => [product.id, product]));
    const selectedProducts = items.map((item) => productMap.get(item.product_id)).filter(Boolean);
    const withImages = selectedProducts.filter((product) => productImage(product)).length;
    const withDescriptions = selectedProducts.filter((product) => productDescription(product)).length;
    const categories = new Set(selectedProducts.map(productCategory));
    const contentTypes = new Set(items.map((item) => item.content_type));
    const repeated = selectedProducts.length - new Set(selectedProducts.map((product) => product.id)).size;
    let score = 35;
    score += Math.round((withImages / Math.max(1, selectedProducts.length)) * 25);
    score += Math.round((withDescriptions / Math.max(1, selectedProducts.length)) * 15);
    score += Math.min(10, categories.size * 3);
    score += Math.min(10, contentTypes.size * 3);
    score -= Math.min(15, repeated * 3);
    score = Math.max(0, Math.min(100, score));

    const recommendations = [];
    const missingImages = selectedProducts.length - withImages;
    const missingDescriptions = selectedProducts.length - withDescriptions;
    if (missingImages) recommendations.push(`${missingImages} products are missing images.`);
    if (missingDescriptions) recommendations.push(`${missingDescriptions} products need better descriptions.`);
    if (categories.size <= 1 && selectedProducts.length > 3) recommendations.push("Add another category for a more balanced campaign.");
    if (repeated > 2) recommendations.push("Some products repeat often. Add more products for variety.");
    if (!recommendations.length) recommendations.push("Your campaign looks ready to post.");
    return { score, recommendations };
}

export async function writeCampaignLog(supabase, values = {}) {
    await supabase.from("campaign_item_logs").insert({
        campaign_item_id: values.campaign_item_id,
        action: values.action,
        actor_id: values.actor_id || null,
        actor_role: values.actor_role || "client",
        note: values.note || "",
    });
}

async function connectionFor(supabase, userId, channel) {
    const lookup = channel === "facebook_page" ? "facebook" : channel;
    const { data } = await supabase
        .from("social_connections")
        .select("external_account_id, access_token, status")
        .eq("user_id", userId)
        .eq("channel", lookup)
        .maybeSingle();
    return data;
}

export async function publishCampaignItem({ supabase, item, userId }) {
    const access = await requireActiveSubscription(userId);
    if (!access.ok) throw new Error(access.error || "Activate your ORVA plan to schedule and publish campaigns.");

    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true" || process.env.SOCIAL_PUBLISH_MOCK_MODE === "true";
    let product;
    if (isRealUuid(item.product_id)) {
        const { data, error } = await supabase.from("products").select("*").eq("id", item.product_id).maybeSingle();
        if (error) throw error;
        if (!data || (data.user_id || data.client_id) !== userId) throw new Error("Product not found.");
        product = data;
    } else {
        if (!item.media_url) throw new Error("This scheduled post is missing an image.");
        product = {
            id: item.id,
            user_id: userId,
            client_id: userId,
            name: item.generated_title || "Marketing Post",
            product_name: item.generated_title || "Marketing Post",
            description: item.generated_caption || "",
            notes: item.generated_caption || "",
            image_url: item.media_url,
            cleaned_image_url: item.media_url,
            price: 0,
            stock: 1,
            status: "in_stock",
        };
    }

    const campaignCaption = [
        item.generated_caption,
        item.generated_cta && !String(item.generated_caption || "").includes(item.generated_cta) ? item.generated_cta : "",
        item.generated_hashtags && !String(item.generated_caption || "").includes(item.generated_hashtags) ? item.generated_hashtags : "",
    ].filter(Boolean).join("\n\n");

    let result;
    if (item.content_type === "instagram_post") {
        const publishProduct = await publicProductImageFields(product, { userId, productId: product.id });
        const connection = await connectionFor(supabase, userId, "instagram");
        if (!mockMode && connection?.status !== "connected") throw new Error("Instagram is not connected. Use manual export or connect Instagram.");
        result = await publishProductToInstagram({ product: publishProduct, connection, mockMode, caption: campaignCaption });
    } else if (item.content_type === "facebook_post") {
        const connection = await connectionFor(supabase, userId, "facebook_page");
        if (!mockMode && connection?.status !== "connected") throw new Error("Facebook Page is not connected. Use manual export or connect Facebook.");
        result = await publishProductToFacebookPage({ product, connection, mockMode, caption: campaignCaption });
    } else if (mockMode) {
        result = { externalPostId: `mock-${item.content_type}-${item.id}`, mock: true };
    } else {
        throw new Error("This format is ready for manual export. Real publishing can be connected in Phase 2.");
    }

    const { data: updated, error: updateError } = await supabase
        .from("campaign_items")
        .update({
            status: "published",
            external_post_id: result.externalPostId || result.externalProductId || null,
            error_message: null,
            updated_at: nowISTISOString(),
        })
        .eq("id", item.id)
        .select("*")
        .single();
    if (updateError) throw updateError;
    await writeCampaignLog(supabase, { campaign_item_id: item.id, action: "published", actor_id: userId });
    return updated;
}
