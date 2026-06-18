"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ImageIcon, Loader2, Megaphone, PackageCheck, RefreshCw, Sparkles, Tags } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { formatINR } from "../../app/lib/pricing";
import { productName, productStock } from "../../app/lib/inventory";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const summaryCards = [
    { key: "totalProducts", label: "Total Products", icon: PackageCheck, accent: "bg-blue-500" },
    { key: "lowStockCount", label: "Low Stock", icon: AlertTriangle, accent: "bg-red-500" },
    { key: "notPromotedCount", label: "Not Promoted", icon: Megaphone, accent: "bg-amber-500" },
    { key: "missingImagesCount", label: "Missing Images", icon: ImageIcon, accent: "bg-purple-500" },
    { key: "readyToPromoteCount", label: "Ready to Promote", icon: CheckCircle2, accent: "bg-emerald-500" },
];

const priorityGroups = [
    { key: "high", title: "Needs urgent attention", description: "Fix these first so products can sell properly." },
    { key: "medium", title: "Improve these products", description: "Small upgrades that make products easier to promote." },
    { key: "low", title: "Ready for promotion", description: "These products are ready for posts, previews, and offers." },
];

const issueStyles = {
    low_stock: "badge-red",
    missing_image: "badge-red",
    price_missing: "badge-red",
    missing_description: "badge-warn",
    not_promoted: "badge-warn",
    dead_stock: "badge-warn",
    ready_to_promote: "badge-green",
};

const issueLabels = {
    low_stock: "Low stock",
    missing_image: "Needs image",
    price_missing: "Price missing",
    missing_description: "Needs description",
    not_promoted: "Not promoted",
    dead_stock: "Ignored product",
    ready_to_promote: "Ready to post",
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

function actionHref(recommendation) {
    const productId = recommendation.product_id;
    if (!productId) return "/dashboard/products";
    if (recommendation.recommendation_type === "missing_image" || recommendation.recommendation_type === "price_missing" || recommendation.recommendation_type === "missing_description") {
        return `/dashboard/products/${productId}`;
    }
    if (recommendation.recommendation_type === "ready_to_promote") {
        return `/dashboard/preview-studio?productId=${productId}`;
    }
    return `/dashboard/social-content?productId=${productId}`;
}

function productImage(product = {}) {
    return product.cleaned_image_url || product.image_url || "";
}

function RecommendationCard({ recommendation, onDismiss, onComplete }) {
    const product = recommendation.products || {};
    const image = productImage(product);
    return (
        <article className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    {image ? (
                        <img src={image} alt={productName(product)} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
                            <ImageIcon className="h-6 w-6" />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h3 className="truncate text-base font-black text-[var(--ink)]">{productName(product)}</h3>
                            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                                Stock {productStock(product)} · {product.price ? formatINR(product.price) : "No price"}
                            </p>
                        </div>
                        <span className={`dashboard-badge ${issueStyles[recommendation.recommendation_type] || "badge-gray"}`}>
                            {issueLabels[recommendation.recommendation_type] || recommendation.recommendation_type}
                        </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-[var(--ink)]">{recommendation.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--mid)]">{recommendation.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={actionHref(recommendation)} className="btn-primary px-4 py-2 text-xs">
                            <Sparkles className="h-3.5 w-3.5" />
                            {recommendation.action_label || "Review product"}
                        </Link>
                        <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => onComplete(recommendation.id)}>
                            Mark done
                        </button>
                        <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => onDismiss(recommendation.id)}>
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

export function InventoryIntelligencePage() {
    const getToken = useToken();
    const [summary, setSummary] = useState(null);
    const [groups, setGroups] = useState({ high: [], medium: [], low: [] });
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });

    const totalRecommendations = useMemo(
        () => Object.values(groups).reduce((count, items) => count + items.length, 0),
        [groups],
    );

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const [summaryResponse, recResponse] = await Promise.all([
            fetch("/api/inventory-intelligence/summary", { headers: { Authorization: `Bearer ${token}` } }),
            fetch("/api/inventory-intelligence/recommendations", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const summaryResult = await readJson(summaryResponse);
        const recResult = await readJson(recResponse);
        if (!summaryResponse.ok || !recResponse.ok) {
            setMessage({ type: "error", text: summaryResult.error || recResult.error || "Could not load inventory intelligence. Run scripts/orva-inventory-intelligence.sql if this is the first time." });
        } else {
            setSummary(summaryResult);
            setGroups(recResult.groups || { high: [], medium: [], low: [] });
        }
        setLoading(false);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const refresh = async () => {
        setWorking("refresh");
        const token = await getToken();
        const response = await fetch("/api/inventory-intelligence/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({}),
        });
        const result = await readJson(response);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not refresh intelligence." });
        } else {
            setMessage({ type: "success", text: result.created ? `Created ${result.created} recommendations.` : "Inventory intelligence is up to date." });
            await load();
        }
        setWorking("");
    };

    const updateRecommendation = async (id, action) => {
        setWorking(id);
        const token = await getToken();
        const response = await fetch(`/api/inventory-intelligence/recommendations/${id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action }),
        });
        const result = await readJson(response);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not update recommendation." });
        } else {
            setMessage({ type: "success", text: action === "dismiss" ? "Recommendation dismissed." : "Recommendation marked done." });
            await load();
        }
        setWorking("");
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Growth" title="Inventory Intelligence" description="Know what to promote, what to restock, and what needs attention.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <div className="dashboard-panel mb-6 overflow-hidden p-0">
                    <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
                        <div className="p-6">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Smart recommendations</p>
                            <h2 className="mt-2 text-3xl font-black text-[var(--ink)]">Promote the right products next.</h2>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                                ORVA checks your products for low stock, missing photos, missing descriptions, and products that are ready to post.
                            </p>
                        </div>
                        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-6 lg:w-72 lg:border-l lg:border-t-0">
                            <button type="button" className="btn-primary w-full justify-center" onClick={refresh} disabled={Boolean(working)}>
                                {working === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Refresh Intelligence
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : summary?.totalProducts === 0 ? (
                    <EmptyState
                        icon={PackageCheck}
                        title="Upload your inventory first"
                        description="Once products are added, ORVA will show smart recommendations for stock, images, descriptions, and promotions."
                        action={<Link href="/dashboard/upload-inventory" className="btn-primary mt-6">Upload Inventory</Link>}
                    />
                ) : (
                    <>
                        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            {summaryCards.map((card) => (
                                <StatCard key={card.key} label={card.label} value={summary?.[card.key] ?? 0} icon={card.icon} accent={card.accent} />
                            ))}
                        </div>

                        {totalRecommendations === 0 ? (
                            <EmptyState
                                icon={CheckCircle2}
                                title="Great! Your inventory looks ready for promotion."
                                description="No open recommendations right now. Refresh intelligence after adding or editing products."
                                tone="blue"
                            />
                        ) : (
                            <div className="grid gap-6">
                                {priorityGroups.map((group) => {
                                    const items = groups[group.key] || [];
                                    if (!items.length) return null;
                                    return (
                                        <section key={group.key} className="dashboard-panel p-5">
                                            <SectionHeading title={group.title} description={group.description} />
                                            <div className="grid gap-4">
                                                {items.map((recommendation) => (
                                                    <RecommendationCard
                                                        key={recommendation.id}
                                                        recommendation={recommendation}
                                                        onDismiss={(id) => updateRecommendation(id, "dismiss")}
                                                        onComplete={(id) => updateRecommendation(id, "mark_completed")}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
