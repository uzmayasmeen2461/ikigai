import {
    buildFacebookPageCaption,
    buildInstagramCaption,
    formatInventoryStatus,
    productCode,
    productName,
    productNotes,
    productStock,
} from "./inventory";
import { formatINR } from "./pricing";
import { nextISTSlotISOString, scheduledISTISOString } from "./istDate";

export const autopilotChannels = ["instagram", "facebook_page", "whatsapp_message"];
export const autopilotStatuses = ["draft", "scheduled", "approved", "published", "failed", "cancelled"];
export const campaignTypes = ["weekly", "hourly_campaign"];

function productImage(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

function addDays(days = 0, istHour = 11) {
    return scheduledISTISOString(days, istHour);
}

function campaignSlotAt(istHour = 10) {
    return nextISTSlotISOString(istHour);
}

function scoreProduct(product = {}) {
    let score = 0;
    if (productName(product) && productName(product) !== "Product") score += 20;
    if (Number(product.price || 0) > 0) score += 20;
    if (productStock(product) > 0) score += 20;
    if (productImage(product)) score += 20;
    if (productNotes(product)) score += 10;
    if (!product.last_promoted_at) score += 10;
    return score;
}

function statusLabel(status = "in_stock") {
    return formatInventoryStatus(status || "in_stock");
}

export function buildAutopilotCaption(product = {}, channel = "instagram", goal = "promote") {
    if (channel === "facebook_page") return buildFacebookPageCaption(product);

    const name = productName(product);
    const price = formatINR(product.price || 0);
    const stock = productStock(product);
    const code = productCode(product);
    const notes = productNotes(product);

    if (goal === "limited_stock" && stock > 0) {
        return [
            `Limited stock alert: ${name}`,
            `Only ${stock} left at ${price}.`,
            notes,
            code ? `Order code: ${code}` : "",
            "Message us to book yours today.",
            "#ShopLocal #LimitedStock #ORVA",
        ].filter(Boolean).join("\n");
    }

    if (goal === "back_in_stock") {
        return [
            `${name} is back in stock ✨`,
            `Price: ${price}`,
            notes,
            "DM to order before it sells out again.",
            "#BackInStock #ShopLocal #ORVA",
        ].filter(Boolean).join("\n");
    }

    if (channel === "whatsapp_message") {
        return [
            `Hi! ${name} is available at ${price}.`,
            code ? `Send product code ${code} to order.` : "Reply here to order.",
            `Status: ${statusLabel(product.status)}`,
        ].join("\n");
    }

    return buildInstagramCaption(product);
}

export function buildAutopilotDrafts(products = []) {
    const active = products
        .filter((product) => product.status !== "hidden")
        .sort((a, b) => scoreProduct(b) - scoreProduct(a));
    const inStock = active.filter((product) => productStock(product) > 0);
    const lowStock = inStock.filter((product) => productStock(product) <= Number(product.low_stock_threshold || 3));
    const ready = inStock.filter((product) => productImage(product) && Number(product.price || 0) > 0);
    const picks = ready.length ? ready : inStock.length ? inStock : active;

    if (!picks.length) return [];

    const main = picks[0];
    const second = picks[1] || main;
    const third = picks[2] || second;
    const low = lowStock[0] || second;
    const rows = [
        draftForProduct(main, "instagram", "post", "Promote best product", "New arrival spotlight", 0, 11),
        draftForProduct(main, "facebook_page", "post", "Reach local customers", "Facebook product post", 0, 18),
        draftForProduct(low, "whatsapp_message", "message", "Send customer reminder", "WhatsApp customer message", 1, 10, "limited_stock"),
        draftForProduct(second, "instagram", "post", "Create offer post", "Weekend offer post", 2, 12),
        draftForProduct(third, "facebook_page", "post", "Bring back attention", "Product rediscovery post", 3, 17),
    ];

    return rows.map((item, index) => ({
        ...item,
        sort_order: index,
    }));
}

export function buildHourlyCampaignDrafts(products = []) {
    const active = products
        .filter((product) => product.status !== "hidden")
        .sort((a, b) => scoreProduct(b) - scoreProduct(a));
    const inStock = active.filter((product) => productStock(product) > 0);
    const ready = inStock.filter((product) => productImage(product) && Number(product.price || 0) > 0);
    const picks = ready.length ? ready : inStock.length ? inStock : active;

    if (!picks.length) return [];

    const channelPlan = [
        "instagram",
        "facebook_page",
        "whatsapp_message",
        "instagram",
        "facebook_page",
        "instagram",
        "instagram",
        "whatsapp_message",
        "facebook_page",
        "instagram",
        "whatsapp_message",
    ];
    const goals = [
        "promote",
        "promote",
        "limited_stock",
        "promote",
        "back_in_stock",
        "promote",
        "limited_stock",
        "promote",
        "promote",
        "promote",
        "limited_stock",
    ];

    return Array.from({ length: 11 }, (_, index) => {
        const hour = 10 + index;
        const product = picks[index % picks.length];
        const channel = channelPlan[index];
        const goal = goals[index];
        const slotLabel = `${String(hour).padStart(2, "0")}:00`;

        return {
            ...draftForProduct(
                product,
                channel,
                channel === "whatsapp_message" ? "message" : "post",
                `Hourly campaign ${slotLabel}`,
                "Hourly campaign",
                0,
                hour,
                goal
            ),
            scheduled_for: campaignSlotAt(hour),
            campaign_type: "hourly_campaign",
            schedule_frequency: "hourly",
            sort_order: index,
        };
    });
}

export function draftForProduct(product = {}, channel, contentType, title, templateName, dayOffset = 0, hour = 11, goal = "promote") {
    const name = productName(product);
    const code = productCode(product);
    return {
        product_id: product.id || null,
        channel,
        content_type: contentType,
        title: `${title}: ${name}`,
        template_name: templateName,
        caption: buildAutopilotCaption(product, channel, goal),
        hashtags: channel === "whatsapp_message" ? "" : "#ORVA #ShopLocal #LocalBusiness",
        offer_text: goal === "limited_stock" ? `Only ${productStock(product)} left` : code ? `Order with code ${code}` : "DM to order",
        scheduled_for: addDays(dayOffset, hour),
        status: "draft",
        campaign_type: "weekly",
        schedule_frequency: "weekly",
        posting_mode: "approval_first",
        automation_paused: false,
        approval_required: true,
        product_snapshot: {
            name,
            code,
            price: product.price || 0,
            stock: productStock(product),
            status: statusLabel(product.status),
            image: productImage(product),
        },
    };
}

export function buildAdDraft(products = []) {
    const product = [...products].sort((a, b) => scoreProduct(b) - scoreProduct(a))[0];
    if (!product) {
        return {
            title: "No ad draft yet",
            objective: "Upload products first",
            copy: "Add products with images and prices to create a simple promotion plan.",
            audience: "Local customers",
            budget: "Start with a small test budget after Meta access is ready.",
        };
    }

    const name = productName(product);
    return {
        title: `Boost ${name}`,
        objective: "Get more messages from nearby buyers",
        copy: `${name} is available at ${formatINR(product.price || 0)}. Message us to order today.`,
        audience: "People near your store who are interested in local shopping",
        budget: "Start with ₹300-₹500 for 2 days, then repeat the best performer.",
        product_id: product.id,
    };
}

export function normalizeAutopilotItem(item = {}) {
    return {
        id: item.id || `draft-${item.sort_order ?? Math.random()}`,
        product_id: item.product_id || null,
        channel: item.channel || "instagram",
        content_type: item.content_type || "post",
        title: item.title || "Growth post",
        template_name: item.template_name || "ORVA plan",
        caption: item.caption || "",
        hashtags: item.hashtags || "",
        offer_text: item.offer_text || "",
        scheduled_for: item.scheduled_for || null,
        status: item.status || "draft",
        approval_required: item.approval_required !== false,
        approved_at: item.approved_at || null,
        published_at: item.published_at || null,
        external_post_id: item.external_post_id || null,
        error_message: item.error_message || null,
        product_snapshot: item.product_snapshot || {},
        campaign_type: item.campaign_type || "weekly",
        schedule_frequency: item.schedule_frequency || "weekly",
        posting_mode: item.posting_mode || "approval_first",
        automation_paused: item.automation_paused === true,
        created_at: item.created_at || null,
    };
}
