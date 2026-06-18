"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { productName } from "../../lib/inventory";
import { formatStableDateTime } from "../../lib/stableDate";
import { AuthGate } from "../../../components/AuthGate";
import { DashboardShell } from "../../../components/DashboardShell";
import { EmptyState, FeedbackMessage } from "../../../components/DashboardUI";

function badgeClass(status = "") {
    if (status === "published") return "badge-green";
    if (status === "failed") return "badge-red";
    return "badge-blue";
}

export default function AdminSocialExportsPage() {
    const [exports, setExports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });

    const loadExports = useCallback(async () => {
        setLoading(true);
        setMessage({ type: "", text: "" });
        const { data } = await supabase.auth.getSession();
        const response = await fetch("/api/admin/social-exports", {
            headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not load social exports." });
            setLoading(false);
            return;
        }
        setExports(result.exports || []);
        setLoading(false);
    }, []);

    useEffect(() => { queueMicrotask(loadExports); }, [loadExports]);

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell role="admin" eyebrow="Admin" title="Social Exports" description="Review Instagram Reel and social publishing attempts across clients.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="dashboard-panel overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
                        <div>
                            <h2 className="text-xl font-bold">Publishing records</h2>
                            <p className="mt-1 text-sm text-[var(--mid)]">Failed attempts appear here with the Meta error message.</p>
                        </div>
                        <button type="button" className="btn-secondary" onClick={loadExports} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button>
                    </div>
                    {loading ? (
                        <div className="p-6"><div className="h-36 animate-pulse rounded-xl bg-[var(--surface)]" /></div>
                    ) : exports.length === 0 ? (
                        <div className="p-6"><EmptyState title="No exports yet" description="Instagram Reel test publishes and social exports will appear here." /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-[var(--surface)] text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                                    <tr>
                                        <th className="px-5 py-3">Product</th>
                                        <th className="px-5 py-3">Channel</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Error</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {exports.map((item) => (
                                        <tr key={item.id} className="bg-white align-top">
                                            <td className="px-5 py-4 font-semibold text-[var(--ink)]">{productName(item.products || {})}</td>
                                            <td className="px-5 py-4 text-[var(--mid)]">{String(item.channel || "").replace(/_/g, " ")}</td>
                                            <td className="px-5 py-4"><span className={`dashboard-badge ${badgeClass(item.status)}`}>{item.status || "draft"}</span></td>
                                            <td className="px-5 py-4 text-[var(--mid)]">{formatStableDateTime(item.created_at)}</td>
                                            <td className="max-w-xl px-5 py-4 text-[var(--mid)]">{item.error_message ? <span className="inline-flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />{item.error_message}</span> : "None"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
