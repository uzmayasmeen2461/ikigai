import { NextResponse } from "next/server";
import { buildAdDraft, buildAutopilotDrafts, buildHourlyCampaignDrafts, normalizeAutopilotItem } from "../../lib/growthAutopilot";
import { publishGrowthAutopilotItem } from "../../lib/growthAutopilotPublishing";
import { requireActiveSubscription } from "../../lib/onboarding";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";
import { nowISTISOString } from "../../lib/istDate";

const allowedActions = new Set(["generate", "approve", "schedule", "cancel", "publish", "mark_failed", "pause_automation", "resume_automation"]);

function tableMissing(error) {
    return error?.code === "42P01" || /growth_autopilot_items/i.test(error?.message || "");
}

function schemaMissing(error) {
    return error?.code === "42703" || /campaign_type|schedule_frequency|posting_mode|automation_paused/i.test(error?.message || "");
}

function cleanAction(value = "") {
    return String(value || "").trim().toLowerCase();
}

function cleanId(value = "") {
    return String(value || "").trim();
}

function cleanMode(value = "") {
    return String(value || "weekly").trim() === "hourly_campaign" ? "hourly_campaign" : "weekly";
}

function cleanPostingMode(value = "") {
    return String(value || "approval_first").trim() === "auto_post" ? "auto_post" : "approval_first";
}

function tableSetupError() {
    return "Growth Autopilot storage is not installed yet. Run scripts/orva-growth-autopilot.sql in Supabase.";
}

async function loadProducts(supabase, userId) {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`user_id.eq.${userId},client_id.eq.${userId}`)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

async function loadAutopilotItem(supabase, userId, itemId) {
    const { data, error } = await supabase
        .from("growth_autopilot_items")
        .select("*")
        .eq("id", itemId)
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function GET(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before loading Growth Autopilot." }, { status: 503 });
    }

    const supabase = createSupabaseServiceRole();
    try {
        const products = await loadProducts(supabase, user.id);
        const { data, error } = await supabase
            .from("growth_autopilot_items")
            .select("*")
            .eq("user_id", user.id)
            .neq("status", "cancelled")
            .order("scheduled_for", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false });

        if (error && !tableMissing(error)) throw error;

        const storedItems = data || [];
        const weeklySuggestions = buildAutopilotDrafts(products);
        const hourlySuggestions = buildHourlyCampaignDrafts(products);
        const generatedItems = storedItems.length ? [] : weeklySuggestions;
        return NextResponse.json({
            tableReady: !error,
            warning: error ? tableSetupError() : "",
            productsCount: products.length,
            items: (storedItems.length ? storedItems : generatedItems).map(normalizeAutopilotItem),
            suggestedItems: weeklySuggestions.map(normalizeAutopilotItem),
            hourlySuggestedItems: hourlySuggestions.map(normalizeAutopilotItem),
            adDraft: buildAdDraft(products),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not load Growth Autopilot." }, { status: 500 });
    }
}

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before using Growth Autopilot." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const action = cleanAction(body.action);
    if (!allowedActions.has(action)) return NextResponse.json({ error: "Unsupported autopilot action." }, { status: 400 });

    const supabase = createSupabaseServiceRole();
    try {
        if (action === "generate") {
            const products = await loadProducts(supabase, user.id);
            const mode = cleanMode(body.mode);
            const postingMode = cleanPostingMode(body.postingMode);
            const plan = mode === "hourly_campaign" ? buildHourlyCampaignDrafts(products) : buildAutopilotDrafts(products);
            const createdAt = nowISTISOString();
            const drafts = plan.map((item) => ({
                user_id: user.id,
                product_id: item.product_id,
                channel: item.channel,
                content_type: item.content_type,
                title: item.title,
                template_name: item.template_name,
                caption: item.caption,
                hashtags: item.hashtags,
                offer_text: item.offer_text,
                scheduled_for: item.scheduled_for,
                campaign_type: item.campaign_type || mode,
                schedule_frequency: item.schedule_frequency || (mode === "hourly_campaign" ? "hourly" : "weekly"),
                posting_mode: postingMode,
                automation_paused: false,
                status: postingMode === "auto_post" && item.channel !== "whatsapp_message" ? "scheduled" : "draft",
                approval_required: postingMode !== "auto_post",
                approved_at: postingMode === "auto_post" && item.channel !== "whatsapp_message" ? createdAt : null,
                product_snapshot: item.product_snapshot,
            }));
            if (!drafts.length) return NextResponse.json({ error: "Add products before generating a growth plan." }, { status: 400 });

            const { data, error } = await supabase
                .from("growth_autopilot_items")
                .insert(drafts)
                .select("*");
            if (error) {
                if (tableMissing(error) || schemaMissing(error)) return NextResponse.json({ error: tableSetupError() }, { status: 503 });
                throw error;
            }
            return NextResponse.json({
                message: mode === "hourly_campaign"
                    ? postingMode === "auto_post"
                        ? "Hourly auto-post campaign is scheduled from 10 AM to 8 PM, one post per hour."
                        : "Hourly campaign is ready from 10 AM to 8 PM, one approval-required post per hour."
                    : "This week’s Growth Autopilot plan is ready for review.",
                items: (data || []).map(normalizeAutopilotItem),
            }, { status: 201 });
        }

        if (action === "pause_automation" || action === "resume_automation") {
            const shouldPause = action === "pause_automation";
            const { data, error } = await supabase
                .from("growth_autopilot_items")
                .update({
                    automation_paused: shouldPause,
                    updated_at: nowISTISOString(),
                })
                .eq("user_id", user.id)
                .eq("posting_mode", "auto_post")
                .in("status", ["scheduled", "approved", "draft"])
                .select("*");
            if (error) {
                if (tableMissing(error) || schemaMissing(error)) return NextResponse.json({ error: tableSetupError() }, { status: 503 });
                throw error;
            }
            return NextResponse.json({
                message: shouldPause ? "Automation paused. Scheduled posts are saved but will not publish." : "Automation resumed. Due scheduled posts can publish again.",
                items: (data || []).map(normalizeAutopilotItem),
            });
        }

        const itemId = cleanId(body.itemId || body.id);
        if (!itemId) return NextResponse.json({ error: "Choose an autopilot item." }, { status: 400 });
        const item = await loadAutopilotItem(supabase, user.id, itemId);
        if (!item) return NextResponse.json({ error: "Autopilot item not found." }, { status: 404 });

        if (action === "publish") {
            const access = await requireActiveSubscription(user.id);
            if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status || 403 });
            if (!["approved", "scheduled"].includes(item.status)) {
                return NextResponse.json({ error: "Approve this item before publishing." }, { status: 400 });
            }

            try {
                const updated = await publishGrowthAutopilotItem({ supabase, userId: user.id, item });
                return NextResponse.json({ message: "Autopilot item published successfully.", item: normalizeAutopilotItem(updated) }, { status: 201 });
            } catch (publishError) {
                await supabase
                    .from("growth_autopilot_items")
                    .update({
                        status: "failed",
                        error_message: publishError.message || "Could not publish item.",
                        updated_at: nowISTISOString(),
                    })
                    .eq("id", item.id)
                    .eq("user_id", user.id);
                return NextResponse.json({ error: publishError.message || "Could not publish item." }, { status: 502 });
            }
        }

        const updates = { updated_at: nowISTISOString() };
        if (action === "approve") {
            updates.status = "approved";
            updates.approved_at = nowISTISOString();
        }
        if (action === "schedule") {
            updates.status = "scheduled";
            updates.scheduled_for = body.scheduledFor || item.scheduled_for || nowISTISOString();
            updates.approved_at = item.approved_at || nowISTISOString();
        }
        if (action === "cancel") updates.status = "cancelled";
        if (action === "mark_failed") {
            updates.status = "failed";
            updates.error_message = String(body.error || "Marked failed.").trim();
        }

        const { data, error } = await supabase
            .from("growth_autopilot_items")
            .update(updates)
            .eq("id", item.id)
            .eq("user_id", user.id)
            .select("*")
            .single();
        if (error) throw error;

        return NextResponse.json({ message: "Growth Autopilot updated.", item: normalizeAutopilotItem(data) });
    } catch (error) {
        if (tableMissing(error) || schemaMissing(error)) return NextResponse.json({ error: tableSetupError() }, { status: 503 });
        return NextResponse.json({ error: error.message || "Could not update Growth Autopilot." }, { status: 500 });
    }
}
