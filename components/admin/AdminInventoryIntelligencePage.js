"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ImageIcon, Loader2, RefreshCw, Store } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { productName } from "../../app/lib/inventory";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

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

function groupByClient(recommendations = []) {
    return recommendations.reduce((groups, item) => {
        const clientId = item.client_id || "unknown";
        if (!groups[clientId]) groups[clientId] = [];
        groups[clientId].push(item);
        return groups;
    }, {});
}

export function AdminInventoryIntelligencePage() {
    const getToken = useToken();
    const [summary, setSummary] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const highPriority = useMemo(() => recommendations.filter((item) => item.priority === "high"), [recommendations]);
    const grouped = useMemo(() => groupByClient(highPriority), [highPriority]);

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [summaryResponse, recResponse] = await Promise.all([
            fetch("/api/inventory-intelligence/summary", { headers }),
            fetch("/api/inventory-intelligence/recommendations", { headers }),
        ]);
        const [summaryResult, recResult] = await Promise.all([readJson(summaryResponse), readJson(recResponse)]);
        if (!summaryResponse.ok || !recResponse.ok) {
            setMessage({ type: "error", text: summaryResult.error || recResult.error || "Could not load admin inventory intelligence." });
        } else {
            setSummary(summaryResult);
            setRecommendations(recResult.recommendations || []);
        }
        setLoading(false);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const refreshAll = async () => {
        setWorking(true);
        const token = await getToken();
        const response = await fetch("/api/inventory-intelligence/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({}),
        });
        const result = await readJson(response);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not refresh admin intelligence." });
        } else {
            setMessage({ type: "success", text: result.created ? `Created ${result.created} recommendations across clients.` : "Inventory intelligence is up to date." });
            await load();
        }
        setWorking(false);
    };

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell role="admin" eyebrow="Admin" title="Inventory Intelligence" description="High-priority inventory issues across client workspaces.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <SectionHeading title="Client issue overview" description="Focus on products that need images, prices, or urgent stock attention." className="mb-0" />
                    <button type="button" className="btn-primary" onClick={refreshAll} disabled={working}>
                        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh All
                    </button>
                </div>
                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                    <div className="grid gap-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="Total Products" value={summary?.totalProducts || 0} icon={Store} accent="bg-blue-500" />
                            <StatCard label="High Priority" value={summary?.highPriorityCount || 0} icon={AlertTriangle} accent="bg-red-500" />
                            <StatCard label="Missing Images" value={summary?.missingImagesCount || 0} icon={ImageIcon} accent="bg-purple-500" />
                            <StatCard label="Low Stock" value={summary?.lowStockCount || 0} icon={AlertTriangle} accent="bg-amber-500" />
                        </div>
                        {!highPriority.length ? (
                            <EmptyState title="No high-priority inventory issues" description="Run refresh after clients add or edit inventory." icon={Store} tone="blue" />
                        ) : (
                            <section className="dashboard-panel p-5">
                                <SectionHeading title="High-priority client issues" description="Grouped by client account." />
                                <div className="grid gap-4">
                                    {Object.entries(grouped).map(([clientId, items]) => (
                                        <div key={clientId} className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Client</p>
                                                    <p className="mt-1 font-black text-[var(--ink)]">{clientId}</p>
                                                </div>
                                                <span className="dashboard-badge badge-red">{items.length} high priority</span>
                                            </div>
                                            <div className="mt-4 grid gap-3">
                                                {items.slice(0, 5).map((item) => (
                                                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-3 py-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-[var(--ink)]">{item.title}</p>
                                                            <p className="text-xs text-[var(--muted)]">{productName(item.products)} · {item.recommendation_type.replace(/_/g, " ")}</p>
                                                        </div>
                                                        <Link href={`/admin/inventory?clientId=${clientId}`} className="btn-secondary px-3 py-2 text-xs">View inventory</Link>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
