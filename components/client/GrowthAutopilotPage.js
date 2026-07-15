"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarDays,
    Camera,
    CheckCircle2,
    Clock3,
    Grid2X2,
    Loader2,
    PauseCircle,
    PlayCircle,
    RefreshCcw,
    Search,
    Share2,
    Sparkles,
    Trash2,
    Wand2,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { formatINR } from "../../app/lib/pricing";
import { formatStableDateTime } from "../../app/lib/stableDate";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const campaignTypes = [
    { id: "hourly", title: "Hourly Campaign", text: "Start now and publish one post per hour during business hours.", best: "Flash sales and launch days", icon: Clock3, recommended: true },
    { id: "weekly", title: "Weekly Campaign", text: "Build a full week of posts and promotions from your inventory.", best: "Regular social presence", icon: CalendarDays },
    { id: "monthly", title: "Monthly Campaign", text: "Prepare a full month of content from your inventory.", best: "Managed clients and planned promotions", icon: Grid2X2 },
];

const goals = [
    ["mixed", "Mixed Campaign"],
    ["new_arrivals", "New Arrivals"],
    ["clear_old_stock", "Clear Old Stock"],
    ["festival", "Festival Offers"],
    ["weekend_sale", "Weekend Sale"],
    ["brand_awareness", "Brand Awareness"],
    ["best_sellers", "Promote Best Sellers"],
];

const platforms = [
    { id: "instagram_post", label: "Instagram Post", badge: "Connected", icon: Camera },
    { id: "facebook_post", label: "Facebook Page Post", badge: "Connected", icon: Share2 },
];

const statusClass = {
    draft: "badge-gray",
    approved: "badge-blue",
    scheduled: "badge-warn",
    published: "badge-green",
    failed: "badge-red",
    removed: "badge-gray",
};

const campaignStateCopy = {
    active: {
        badge: "Active",
        title: "This campaign is active",
        text: "ORVA will publish approved scheduled posts when they are due. You can pause it anytime.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    paused: {
        badge: "Paused",
        title: "This campaign is paused",
        text: "Scheduled posts are on hold until you resume the campaign.",
        tone: "border-amber-200 bg-amber-50 text-amber-900",
    },
    approved: {
        badge: "Approved",
        title: "Campaign approved",
        text: "Schedule the approved posts when you are ready to start publishing.",
        tone: "border-blue-200 bg-blue-50 text-blue-900",
    },
    generated: {
        badge: "Needs review",
        title: "Review your campaign",
        text: "Approve the posts you like, then schedule the campaign.",
        tone: "border-slate-200 bg-slate-50 text-slate-900",
    },
};

function useToken() {
    return useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);
}

async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: "The server returned an invalid response." };
    }
}

function productName(product = {}) {
    return product.product_name || product.name || "Product";
}

function productImage(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

function productStock(product = {}) {
    return Number(product.stock ?? product.stock_quantity ?? 0);
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function currentTimeHHMM() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function addDaysISO(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function sortedCampaignItems(items = []) {
    return (items || [])
        .filter((item) => item.status !== "removed")
        .sort((a, b) => String(a.scheduled_at || a.created_at || "").localeCompare(String(b.scheduled_at || b.created_at || "")));
}

function chooseDefaultCampaign(campaigns = []) {
    return campaigns.find((item) => item.status === "active")
        || campaigns.find((item) => item.status === "scheduled")
        || campaigns[0]
        || null;
}

export function GrowthAutopilotPage() {
    const getToken = useToken();
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const [products, setProducts] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [campaign, setCampaign] = useState(null);
    const [items, setItems] = useState([]);
    const [health, setHealth] = useState({ score: 0, recommendations: [] });
    const [step, setStep] = useState(1);
    const [viewMode, setViewMode] = useState("calendar");
    const [selectionMode, setSelectionMode] = useState("manual");
    const [query, setQuery] = useState("");
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [previewItem, setPreviewItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [form, setForm] = useState({
        campaignType: "hourly",
        name: "Today Growth Sprint",
        startDate: todayISO(),
        endDate: todayISO(),
        postingWindowStart: currentTimeHHMM(),
        postingWindowEnd: "20:00",
        goal: "mixed",
        approvalMode: "auto_post_approved",
        selectedPlatforms: ["instagram_post", "facebook_post"],
        settings: { postsPerWeek: 7, storiesPerWeek: 3, reelsPerWeek: 2, postsPerDay: 8, postsPerMonth: 20, storiesPerMonth: 8, reelsPerMonth: 4 },
    });

    const load = useCallback(async () => {
        setLoading(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const [inventoryResponse, campaignsResponse] = await Promise.all([
            fetch("/api/inventory", { headers: { Authorization: `Bearer ${token}` } }),
            fetch("/api/campaigns", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const inventory = await readJson(inventoryResponse);
        const campaignList = await readJson(campaignsResponse);
        if (!inventoryResponse.ok) setMessage({ type: "error", text: inventory.error || "Could not load products." });
        if (!campaignsResponse.ok) setMessage({ type: "error", text: campaignList.error || "Could not load campaigns." });
        setProducts(inventory.products || []);
        setCampaigns(campaignList.campaigns || []);
        const selected = chooseDefaultCampaign(campaignList.campaigns || []);
        if (selected) {
            setCampaign(selected);
            setItems(sortedCampaignItems(selected.campaign_items || []));
            setHealth({ score: selected.health_score || 0, recommendations: [] });
            setStep(4);
            setViewMode(selected.campaign_type === "hourly" ? "list" : "calendar");
        }
        setLoading(false);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const stats = useMemo(() => {
        const all = items || [];
        return [
            { label: "Drafts", value: all.filter((item) => item.status === "draft").length, icon: Sparkles, accent: "bg-slate-500" },
            { label: "Scheduled", value: all.filter((item) => item.status === "scheduled").length, icon: CalendarDays, accent: "bg-amber-500" },
            { label: "Approved", value: all.filter((item) => item.status === "approved").length, icon: CheckCircle2, accent: "bg-blue-500" },
            { label: "Published", value: all.filter((item) => item.status === "published").length, icon: CheckCircle2, accent: "bg-emerald-500" },
        ];
    }, [items]);

    const filteredProducts = useMemo(() => {
        const text = query.toLowerCase();
        return products.filter((product) => {
            if (!text) return true;
            return [productName(product), product.category, product.product_code, product.sku].join(" ").toLowerCase().includes(text);
        });
    }, [products, query]);

    const groupedItems = useMemo(() => {
        return items.reduce((acc, item) => {
            const key = String(item.scheduled_at || "").slice(0, 10) || "Unscheduled";
            acc[key] = acc[key] || [];
            acc[key].push(item);
            return acc;
        }, {});
    }, [items]);

    function updateForm(patch) {
        setForm((current) => ({ ...current, ...patch }));
    }

    function toggleProduct(productId) {
        setSelectedProductIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
    }

    function togglePlatform(platformId) {
        setForm((current) => {
            const exists = current.selectedPlatforms.includes(platformId);
            const selectedPlatforms = exists ? current.selectedPlatforms.filter((id) => id !== platformId) : [...current.selectedPlatforms, platformId];
            return { ...current, selectedPlatforms: selectedPlatforms.length ? selectedPlatforms : current.selectedPlatforms };
        });
    }

    const api = useCallback(async (path, options = {}) => {
        const token = await getToken();
        const response = await fetch(path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.error || "Request failed.");
        return result;
    }, [getToken]);

    async function generateCampaign() {
        setWorking("generate");
        setMessage({ type: "", text: "" });
        try {
            const created = await api("/api/campaigns/create", {
                method: "POST",
                body: JSON.stringify(form),
            });
            const generated = await api("/api/campaigns/generate", {
                method: "POST",
                body: JSON.stringify({
                    campaignId: created.campaign.id,
                    productIds: selectionMode === "manual" ? selectedProductIds : [],
                    smartSelection: selectionMode === "smart" ? { mode: "balanced_mix" } : null,
                }),
            });
            setCampaign(generated.campaign);
            setItems(generated.items || []);
            setHealth(generated.health || { score: 0, recommendations: [] });
            setStep(4);
            setViewMode(form.campaignType === "hourly" ? "list" : "calendar");
            setMessage({ type: "success", text: generated.message || "Campaign generated." });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setWorking("");
        }
    }

    const loadCampaign = useCallback(async (campaignId, options = {}) => {
        if (!campaignId) {
            setMessage({ type: "error", text: "Campaign id is missing. Refresh the page and try again." });
            return;
        }
        if (!options.silent) setWorking(`load:${campaignId}`);
        try {
            const result = await api(`/api/campaigns/${encodeURIComponent(campaignId)}`);
            setCampaign(result.campaign);
            setDeleteConfirm(false);
            setItems(sortedCampaignItems(result.items || []));
            setHealth(result.health || { score: result.campaign?.health_score || 0, recommendations: [] });
            setStep(4);
            setViewMode(result.campaign?.campaign_type === "hourly" ? "list" : "calendar");
        } catch (error) {
            if (!options.silent) setMessage({ type: "error", text: error.message });
        } finally {
            if (!options.silent) setWorking("");
        }
    }, [api]);

    async function itemAction(item, action, patch = {}) {
        setWorking(`${action}:${item.id}`);
        try {
            let result;
            if (action === "approve") result = await api(`/api/campaign-items/${item.id}/approve`, { method: "POST", body: "{}" });
            if (action === "regenerate") result = await api(`/api/campaign-items/${item.id}/regenerate`, { method: "POST", body: "{}" });
            if (action === "edit") result = await api(`/api/campaign-items/${item.id}`, { method: "PATCH", body: JSON.stringify(patch) });
            if (result?.item) {
                setItems((current) => current.map((row) => row.id === result.item.id ? result.item : row));
                setPreviewItem(result.item);
            }
            setMessage({ type: "success", text: result?.message || "Updated." });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setWorking("");
        }
    }

    async function campaignAction(action) {
        if (!campaign?.id) {
            setMessage({ type: "error", text: "Campaign id is missing. Refresh the page and try again." });
            return;
        }
        if (action === "delete" && !deleteConfirm) {
            setDeleteConfirm(true);
            setMessage({ type: "info", text: "Click Confirm Delete to remove this campaign and its scheduled posts." });
            return;
        }
        setWorking(action);
        try {
            const campaignId = encodeURIComponent(campaign.id);
            const path = action === "delete"
                ? `/api/campaigns/${campaignId}`
                : action === "approveAll"
                ? `/api/campaigns/${campaignId}/approve-all`
                : action === "schedule"
                    ? `/api/campaigns/${campaignId}/schedule-approved`
                    : action === "pause"
                        ? `/api/campaigns/${campaignId}/pause`
                        : `/api/campaigns/${campaignId}/resume`;
            const result = await api(path, action === "delete" ? { method: "DELETE" } : { method: "POST", body: "{}" });
            if (action === "delete") {
                const remaining = campaigns.filter((row) => row.id !== campaign.id);
                const nextCampaign = chooseDefaultCampaign(remaining);
                setCampaigns(remaining);
                setCampaign(nextCampaign);
                setItems(sortedCampaignItems(nextCampaign?.campaign_items || []));
                setHealth({ score: nextCampaign?.health_score || 0, recommendations: [] });
                setDeleteConfirm(false);
                if (!nextCampaign) setStep(1);
                setMessage({ type: "success", text: result.message || "Campaign deleted." });
                return;
            }
            if (result.items) setItems((current) => current.map((item) => result.items.find((row) => row.id === item.id) || item));
            if (result.campaign) setCampaign(result.campaign);
            if (action === "approveAll") setItems((current) => current.map((item) => item.status === "draft" ? { ...item, status: "approved" } : item));
            if (action === "schedule") setItems((current) => current.map((item) => item.status === "approved" ? { ...item, status: "scheduled" } : item));
            setDeleteConfirm(false);
            setMessage({ type: "success", text: result.message || "Campaign updated." });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setWorking("");
        }
    }

    async function startCampaignNow() {
        if (!campaign?.id) {
            setMessage({ type: "error", text: "Campaign id is missing. Refresh the page and try again." });
            return;
        }
        setWorking("startNow");
        try {
            const campaignId = encodeURIComponent(campaign.id);
            await api(`/api/campaigns/${campaignId}/approve-all`, { method: "POST", body: "{}" });
            const result = await api(`/api/campaigns/${campaignId}/schedule-approved`, { method: "POST", body: "{}" });
            if (result.campaign) setCampaign(result.campaign);
            if (result.items) setItems(sortedCampaignItems(result.items));
            setViewMode("list");
            setDeleteConfirm(false);
            setMessage({ type: result.failed ? "error" : "success", text: result.message || "Campaign started. Due posts will publish now." });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setWorking("");
        }
    }

    const publishDuePosts = useCallback(async (campaignId, options = {}) => {
        if (!campaignId) return;
        try {
            const result = await api("/api/campaign-items/publish-due", {
                method: "POST",
                body: JSON.stringify({ campaignId, limit: 10 }),
            });
            if (result.published || result.failed) {
                await loadCampaign(campaignId, { silent: true });
                if (!options.silent) {
                    const failedText = result.failed ? ` ${result.failed} post${result.failed === 1 ? "" : "s"} failed.` : "";
                    setMessage({ type: result.failed ? "error" : "success", text: `${result.published} due post${result.published === 1 ? "" : "s"} published.${failedText}` });
                }
            }
        } catch (error) {
            if (!options.silent) setMessage({ type: "error", text: error.message });
        }
    }, [api, loadCampaign]);

    const campaignState = campaignStateCopy[campaign?.status] || {
        badge: campaign?.status || "Draft",
        title: "Campaign is being prepared",
        text: "Generate, review, and approve posts before scheduling.",
        tone: "border-slate-200 bg-slate-50 text-slate-900",
    };
    const campaignIsActive = campaign?.status === "active";
    const campaignIsPaused = campaign?.status === "paused";

    useEffect(() => {
        if (!campaignIsActive || !campaign?.id) return undefined;
        publishDuePosts(campaign.id, { silent: true });
        const interval = window.setInterval(() => {
            publishDuePosts(campaign.id, { silent: true });
            loadCampaign(campaign.id, { silent: true });
        }, 60000);
        return () => window.clearInterval(interval);
    }, [campaignIsActive, campaign?.id, loadCampaign, publishDuePosts]);

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Growth" title="AI Marketing Autopilot" description="Turn your inventory into a complete posting calendar. Review, approve, and let ORVA publish.">
                <div className="space-y-6">
                    <FeedbackMessage type={message.type}>{message.text}</FeedbackMessage>

                    <section className="dashboard-hero p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <SectionHeading
                                eyebrow="GROWTH"
                                title="AI Marketing Autopilot"
                                description="ORVA turns your inventory into ready-to-approve Instagram and Facebook posts."
                            />
                            <div className="grid grid-cols-3 gap-2 text-xs font-bold text-[var(--ink)]">
                                {["Live Workspace", "Managed Access", form.approvalMode === "auto_post_approved" ? "Auto-post Ready" : "Approval Required"].map((label) => (
                                    <div key={label} className="rounded-xl border border-[var(--border)] bg-white/80 p-3 shadow-sm">{label}</div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
                    </div>

                    <div className={`rounded-xl border p-4 text-sm font-semibold ${form.approvalMode === "auto_post_approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
                        {form.approvalMode === "auto_post_approved"
                            ? "Default: Hourly campaign. Start time uses the current IST minute, and approved scheduled posts publish automatically."
                            : "ORVA prepares campaigns from your inventory. You approve before anything goes live."}
                    </div>

                    <section className="dashboard-panel p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <SectionHeading eyebrow={`Step ${step} of 4`} title="Create Campaign" description="Choose products, platforms, and a posting rhythm. ORVA builds the calendar." />
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4].map((number) => (
                                    <button key={number} type="button" className={`h-9 w-9 rounded-full text-sm font-bold ${step === number ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-white text-[var(--muted)]"}`} onClick={() => setStep(number)}>
                                        {number}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {step === 1 ? (
                            <div className="mt-6 space-y-5">
                                <div className="grid gap-3 lg:grid-cols-3">
                                    {campaignTypes.map((type) => {
                                        const Icon = type.icon;
                                        return (
                                            <button key={type.id} type="button" className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${form.campaignType === type.id ? "border-[var(--accent)] bg-white shadow-lg" : "border-[var(--border)] bg-[var(--surface)]"}`} onClick={() => updateForm({
                                                campaignType: type.id,
                                                name: type.id === "hourly" ? "Today Growth Sprint" : type.id === "weekly" ? "Weekly Growth Plan" : "Monthly Growth Plan",
                                                startDate: todayISO(),
                                                endDate: addDaysISO(type.id === "monthly" ? 29 : type.id === "weekly" ? 6 : 0),
                                                postingWindowStart: type.id === "hourly" ? currentTimeHHMM() : form.postingWindowStart,
                                            })}>
                                                <Icon className="h-5 w-5 text-[var(--accent)]" />
                                                <div className="mt-4 flex items-center gap-2">
                                                    <h3 className="font-bold text-[var(--ink)]">{type.title}</h3>
                                                    {type.recommended ? <span className="badge badge-green">Recommended</span> : null}
                                                </div>
                                                <p className="mt-2 text-sm text-[var(--muted)]">{type.text}</p>
                                                <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Best for: {type.best}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <label className="field-label">Campaign Name<input className="input mt-2" value={form.name} onChange={(event) => updateForm({ name: event.target.value })} placeholder="July Beauty Offers" /></label>
                                    <label className="field-label">Start Date<input type="date" className="input mt-2" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} /></label>
                                    <label className="field-label">End Date<input type="date" className="input mt-2" value={form.endDate} onChange={(event) => updateForm({ endDate: event.target.value })} /></label>
                                    <label className="field-label">Posting Window<div className="mt-2 grid grid-cols-2 gap-2"><input type="time" className="input" value={form.postingWindowStart} onChange={(event) => updateForm({ postingWindowStart: event.target.value })} /><input type="time" className="input" value={form.postingWindowEnd} onChange={(event) => updateForm({ postingWindowEnd: event.target.value })} /></div></label>
                                </div>
                                <div className="flex justify-end"><button className="btn-primary" type="button" onClick={() => setStep(2)}>Choose Products</button></div>
                            </div>
                        ) : null}

                        {step === 2 ? (
                            <div className="mt-6 space-y-5">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <SectionHeading title="Choose Products" description="Select products OR let ORVA choose smartly from your inventory." />
                                    <div className="flex rounded-xl border border-[var(--border)] bg-white p-1">
                                        {["manual", "smart"].map((mode) => <button key={mode} className={`rounded-lg px-4 py-2 text-sm font-bold ${selectionMode === mode ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`} onClick={() => setSelectionMode(mode)}>{mode === "manual" ? "Manual Selection" : "Smart Selection"}</button>)}
                                    </div>
                                </div>
                                {selectionMode === "manual" ? (
                                    <>
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--muted)]" /><input className="input pl-9" placeholder="Search products" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
                                            <button className="btn-secondary" type="button" onClick={() => setSelectedProductIds(filteredProducts.map((product) => product.id))}>Select all visible</button>
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--muted)]">{selectedProductIds.length} products selected</p>
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                            {filteredProducts.map((product) => {
                                                const selected = selectedProductIds.includes(product.id);
                                                const image = productImage(product);
                                                return (
                                                    <button key={product.id} type="button" className={`rounded-2xl border p-3 text-left transition ${selected ? "border-[var(--accent)] bg-blue-50" : "border-[var(--border)] bg-white"}`} onClick={() => toggleProduct(product.id)}>
                                                        <div className="flex gap-3">
                                                            <div className="h-16 w-16 rounded-xl bg-[var(--surface)] bg-cover bg-center" style={{ backgroundImage: image ? `url(${image})` : undefined }} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate font-bold text-[var(--ink)]">{productName(product)}</p>
                                                                <p className="text-sm text-[var(--muted)]">{formatINR(product.price || 0)} · Stock {productStock(product)}</p>
                                                                <div className="mt-2 flex flex-wrap gap-1">
                                                                    {productStock(product) <= 3 ? <span className="badge badge-warn">Low Stock</span> : null}
                                                                    {!image ? <span className="badge badge-red">Missing Image</span> : <span className="badge badge-green">Ready</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                                        <Wand2 className="h-6 w-6 text-[var(--accent)]" />
                                        <h3 className="mt-3 text-lg font-bold text-[var(--ink)]">Let ORVA choose products</h3>
                                        <p className="mt-2 text-sm text-[var(--muted)]">ORVA prioritizes products with images, good prices, enough stock, and items that have not been promoted recently. Best Sellers will unlock after sales data is available.</p>
                                    </div>
                                )}
                                <div className="flex justify-between"><button className="btn-secondary" type="button" onClick={() => setStep(1)}>Back</button><button className="btn-primary" type="button" onClick={() => setStep(3)}>Goal & Platforms</button></div>
                            </div>
                        ) : null}

                        {step === 3 ? (
                            <div className="mt-6 space-y-6">
                                <div>
                                    <SectionHeading title="Campaign Goal" description="ORVA uses this goal to decide captions, hooks, hashtags, and timing." />
                                    <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
                                        {goals.map(([id, label]) => <button key={id} type="button" className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${form.goal === id ? "border-[var(--accent)] bg-blue-50 text-[var(--accent)]" : "border-[var(--border)] bg-white text-[var(--ink)]"}`} onClick={() => updateForm({ goal: id })}>{label}</button>)}
                                    </div>
                                </div>
                                <div>
                                    <SectionHeading title="Choose Platforms" description="Auto campaigns use channels ORVA can publish reliably right now. Stories and reels stay in Reel Studio/manual export until their API flow is ready." />
                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {platforms.map((platform) => {
                                            const Icon = platform.icon;
                                            const selected = form.selectedPlatforms.includes(platform.id);
                                            return (
                                                <button key={platform.id} type="button" className={`rounded-2xl border p-4 text-left ${selected ? "border-[var(--accent)] bg-blue-50" : "border-[var(--border)] bg-white"}`} onClick={() => togglePlatform(platform.id)}>
                                                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                                                    <p className="mt-3 font-bold text-[var(--ink)]">{platform.label}</p>
                                                    <span className={`badge mt-2 ${platform.badge === "Connected" ? "badge-green" : "badge-gray"}`}>{platform.badge}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <button type="button" className={`rounded-2xl border p-4 text-left ${form.approvalMode === "ask_before_posting" ? "border-[var(--accent)] bg-blue-50" : "border-[var(--border)] bg-white"}`} onClick={() => updateForm({ approvalMode: "ask_before_posting" })}><b>Ask before posting</b><span className="mt-1 block text-sm text-[var(--muted)]">You approve each post before it goes live.</span></button>
                                    <button type="button" className={`rounded-2xl border p-4 text-left ${form.approvalMode === "auto_post_approved" ? "border-[var(--accent)] bg-blue-50" : "border-[var(--border)] bg-white"}`} onClick={() => updateForm({ approvalMode: "auto_post_approved" })}><b>Auto-post approved items</b><span className="mt-1 block text-sm text-[var(--muted)]">Approved scheduled posts publish automatically when due.</span></button>
                                </div>
                                <div className="flex justify-between"><button className="btn-secondary" type="button" onClick={() => setStep(2)}>Back</button><button className="btn-primary" type="button" disabled={working === "generate"} onClick={generateCampaign}>{working === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Generate Campaign</button></div>
                            </div>
                        ) : null}

                        {step === 4 ? (
                            <div className="mt-6 space-y-5">
                                {!campaign ? (
                                    <EmptyState icon={Sparkles} title="No campaign yet" description="Create your first campaign from your inventory in minutes." />
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                            <SectionHeading title={campaign.name} description={`Selected campaign · ${campaign.campaign_type} · Health score: ${health.score || campaign.health_score || 0}/100`} />
                                            <div className="flex flex-wrap gap-2">
                                                <button className="btn-secondary" onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}>{viewMode === "calendar" ? "List View" : "Calendar View"}</button>
                                                {!campaignIsActive && !campaignIsPaused ? <button className="btn-primary" disabled={working === "startNow"} onClick={startCampaignNow}>{working === "startNow" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}Start Campaign Now</button> : null}
                                                <button className="btn-secondary" disabled={working === "approveAll" || campaignIsActive} onClick={() => campaignAction("approveAll")}>Approve All</button>
                                                <button className="btn-primary" disabled={working === "schedule" || campaignIsActive} onClick={() => campaignAction("schedule")}>Schedule Approved</button>
                                                {campaignIsPaused ? <button className="btn-primary" onClick={() => campaignAction("resume")}><PlayCircle className="h-4 w-4" />Resume Campaign</button> : <button className={campaignIsActive ? "btn-primary" : "btn-secondary"} onClick={() => campaignAction("pause")}><PauseCircle className="h-4 w-4" />Pause Campaign</button>}
                                                <button className={`${deleteConfirm ? "btn-primary bg-rose-600 hover:bg-rose-700" : "btn-secondary text-rose-700"}`} disabled={working === "delete"} onClick={() => campaignAction("delete")}>
                                                    {working === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    {deleteConfirm ? "Confirm Delete" : "Delete Campaign"}
                                                </button>
                                            </div>
                                        </div>
                                        <div className={`rounded-2xl border p-4 ${campaignState.tone}`}>
                                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">{campaignState.badge}</span>
                                                    <h3 className="mt-3 text-xl font-black">{campaignState.title}</h3>
                                                    <p className="mt-1 text-sm font-semibold opacity-80">{campaignState.text}</p>
                                                    <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] opacity-70">Currently selected: {campaign.name}</p>
                                                </div>
                                                {campaignIsActive ? (
                                                    <button className="btn-primary shrink-0" disabled={working === "pause"} onClick={() => campaignAction("pause")}>
                                                        {working === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                                                        Pause Active Campaign
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        {viewMode === "calendar" ? <CampaignCalendar groupedItems={groupedItems} onPreview={setPreviewItem} /> : <CampaignList items={items} onPreview={setPreviewItem} onAction={itemAction} working={working} />}
                                    </>
                                )}
                            </div>
                        ) : null}
                    </section>

                    <section className="dashboard-panel p-5">
                        <SectionHeading eyebrow="Campaign Health" title={`Score ${health.score || campaign?.health_score || 0}/100`} description="Simple recommendations to improve campaign quality." />
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {(health.recommendations?.length ? health.recommendations : ["Generate a campaign to see recommendations."]).map((item) => (
                                <div key={item} className="flex gap-3 rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--ink3)]">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </section>

                    {campaigns.length ? (
                        <section className="dashboard-panel p-5">
                            <SectionHeading title="Recent campaigns" description="Open a saved campaign to continue reviewing or scheduling." />
                            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {campaigns.slice(0, 6).map((row) => {
                                    const selected = row.id === campaign?.id;
                                    return (
                                        <button key={row.id} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${selected ? "border-[var(--accent)] bg-blue-50 shadow-lg shadow-blue-100" : "border-[var(--border)] bg-white"}`} onClick={() => loadCampaign(row.id)}>
                                            <div className="flex items-start justify-between gap-3">
                                                <b>{row.name}</b>
                                                {selected ? <span className="badge badge-blue">Selected</span> : null}
                                            </div>
                                            <span className="mt-1 block text-sm text-[var(--muted)]">{row.campaign_type} · {row.status}</span>
                                            {row.status === "active" ? <span className="badge badge-green mt-3">Active campaign</span> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}
                </div>
                {previewItem ? <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onSave={(patch) => itemAction(previewItem, "edit", patch)} onApprove={() => itemAction(previewItem, "approve")} working={working} /> : null}
            </DashboardShell>
        </AuthGate>
    );
}

function CampaignCalendar({ groupedItems, onPreview }) {
    const entries = Object.entries(groupedItems);
    if (!entries.length) return <EmptyState icon={CalendarDays} title="No posts generated" description="Generate a campaign schedule first." />;
    return (
        <div className="grid gap-3 xl:grid-cols-3">
            {entries.map(([date, rows]) => (
                <div key={date} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="mb-3 font-bold text-[var(--ink)]">{date}</p>
                    <div className="space-y-2">
                        {rows.map((item) => <ScheduleCard key={item.id} item={item} onPreview={onPreview} compact />)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CampaignList({ items, onPreview, onAction, working }) {
    return (
        <div className="space-y-3">
            {items.map((item) => <ScheduleCard key={item.id} item={item} onPreview={onPreview} onAction={onAction} working={working} />)}
        </div>
    );
}

function ScheduleCard({ item, onPreview, onAction, working, compact = false }) {
    return (
        <article className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex flex-wrap gap-2">
                        <span className="badge badge-blue">{item.content_type?.replaceAll("_", " ")}</span>
                        <span className={`badge ${statusClass[item.status] || "badge-gray"}`}>{item.status}</span>
                    </div>
                    <h3 className="mt-2 font-bold text-[var(--ink)]">{item.generated_title}</h3>
                    <p className="text-xs font-semibold text-[var(--muted)]">{formatStableDateTime(item.scheduled_at)}</p>
                    {!compact ? <p className="mt-2 line-clamp-2 text-sm text-[var(--ink3)]">{item.generated_caption}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => onPreview(item)}>Preview</button>
                    {onAction ? <button className="btn-secondary" disabled={working === `regenerate:${item.id}`} onClick={() => onAction(item, "regenerate")}><RefreshCcw className="h-4 w-4" />Regenerate</button> : null}
                    {onAction && item.status === "draft" ? <button className="btn-primary" disabled={working === `approve:${item.id}`} onClick={() => onAction(item, "approve")}>Approve</button> : null}
                </div>
            </div>
        </article>
    );
}

function PreviewModal({ item, onClose, onSave, onApprove, working }) {
    const [caption, setCaption] = useState(item.generated_caption || "");
    const [hashtags, setHashtags] = useState(item.generated_hashtags || "");
    const [cta, setCta] = useState(item.generated_cta || "");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <SectionHeading title="Preview Post" description={`${item.content_type?.replaceAll("_", " ")} · ${formatStableDateTime(item.scheduled_at)}`} />
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
                    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border-8 border-slate-900 bg-slate-950 p-3 text-white">
                        <div className="aspect-[9/16] overflow-hidden rounded-[1.4rem] bg-slate-800">
                            {item.media_url ? <div className="h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.media_url})` }} /> : <div className="flex h-full items-center justify-center text-sm text-white/60">Preview simulation</div>}
                        </div>
                        <p className="mt-3 text-sm font-bold">{item.generated_title}</p>
                        <p className="mt-1 text-xs text-white/70">{cta}</p>
                    </div>
                    <div className="space-y-3">
                        <label className="field-label">Caption<textarea className="input mt-2 min-h-40" value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
                        <label className="field-label">Hashtags<input className="input mt-2" value={hashtags} onChange={(event) => setHashtags(event.target.value)} /></label>
                        <label className="field-label">CTA<input className="input mt-2" value={cta} onChange={(event) => setCta(event.target.value)} /></label>
                        <div className="flex flex-wrap gap-2">
                            <button className="btn-secondary" onClick={() => navigator.clipboard?.writeText([caption, hashtags].filter(Boolean).join("\n\n"))}>Copy Caption</button>
                            <button className="btn-secondary" disabled={working === `edit:${item.id}`} onClick={() => onSave({ generated_caption: caption, generated_hashtags: hashtags, generated_cta: cta })}>Edit</button>
                            <button className="btn-primary" disabled={working === `approve:${item.id}`} onClick={onApprove}>Approve</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
