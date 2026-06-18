"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, ErrorState, SectionHeading, StatCard } from "../DashboardUI";

function formatDate(value) {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminReelUsagePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadUsage = useCallback(async () => {
        setLoading(true);
        setError("");
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token || "";
        const response = await fetch("/api/admin/reel-usage", { headers: { Authorization: `Bearer ${token}` } });
        const text = await response.text();
        const result = text ? JSON.parse(text) : {};
        if (!response.ok) {
            setError(result.error || "Could not load reel usage.");
            setData(null);
        } else {
            setData(result);
        }
        setLoading(false);
    }, []);

    useEffect(() => { queueMicrotask(loadUsage); }, [loadUsage]);

    const clients = data?.clients || [];
    const failedCount = clients.reduce((sum, row) => sum + (row.failedEnhancements?.length || 0), 0);

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell role="admin" eyebrow="Admin" title="Reel Usage" description="Track enhanced reel credits and failed premium render attempts.">
                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : error ? (
                    <ErrorState title="Could not load reel usage" message={error} onRetry={loadUsage} />
                ) : (
                    <div className="grid gap-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatCard label="Clients" value={clients.length} icon={Film} />
                            <StatCard label="Enhanced reels" value={clients.reduce((sum, row) => sum + Number(row.enhancedReelsUsed || 0), 0)} icon={Film} />
                            <StatCard label="Failed renders" value={failedCount} icon={AlertTriangle} />
                        </div>

                        <section className="dashboard-panel overflow-hidden p-0">
                            <div className="p-5">
                                <SectionHeading title={`Usage for ${data?.month || "this month"}`} description="Credit usage and the latest premium reel per client." />
                            </div>
                            {clients.length ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-[var(--surface)] text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                                            <tr>
                                                <th className="px-5 py-3">Client</th>
                                                <th className="px-5 py-3">Plan</th>
                                                <th className="px-5 py-3">Usage</th>
                                                <th className="px-5 py-3">Last reel</th>
                                                <th className="px-5 py-3">Failures</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {clients.map((row) => (
                                                <tr key={row.client.id} className="bg-white">
                                                    <td className="px-5 py-4">
                                                        <p className="font-black text-[var(--ink)]">{row.client.name || row.client.email}</p>
                                                        <p className="text-xs font-semibold text-[var(--muted)]">{row.client.email}</p>
                                                    </td>
                                                    <td className="px-5 py-4 font-semibold text-[var(--mid)]">{row.plan}</td>
                                                    <td className="px-5 py-4 font-black text-[var(--ink)]">{row.enhancedReelsUsed}/{row.monthlyLimit}</td>
                                                    <td className="px-5 py-4 text-[var(--mid)]">
                                                        {row.lastGeneratedReel ? (
                                                            <>
                                                                <p className="font-semibold">{row.lastGeneratedReel.template_name || row.lastGeneratedReel.status}</p>
                                                                <p className="text-xs">{formatDate(row.lastGeneratedReel.updated_at)}</p>
                                                            </>
                                                        ) : "No reels yet"}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`dashboard-badge ${row.failedEnhancements?.length ? "badge-red" : "badge-green"}`}>{row.failedEnhancements?.length || 0}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-5"><EmptyState title="No reel usage yet" description="Enhanced reel usage will appear after clients generate premium reels." /></div>
                            )}
                        </section>
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
