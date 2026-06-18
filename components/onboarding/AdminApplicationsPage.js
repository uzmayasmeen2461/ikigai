"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const statusLabels = {
    submitted: "Submitted",
    approved: "Approved",
    payment_pending: "Pending Activation",
    payment_uploaded: "Pending Activation",
    payment_verified: "Pending Activation",
    activated: "Activated",
    rejected: "Rejected",
};

function amountLabel(amount = 0) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

function badgeClass(status = "") {
    if (status === "activated" || status === "approved") return "badge-green";
    if (status === "rejected") return "badge-red";
    return "badge-warn";
}

function canActivate(status = "") {
    return !["activated", "rejected"].includes(status);
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

export function AdminApplicationsPage() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });

    const getToken = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const response = await fetch("/api/admin/applications", { headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        setLoading(false);
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not load applications." });
        setApplications(result.applications || []);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const stats = useMemo(() => [
        { label: "Pending", value: applications.filter((item) => canActivate(item.status)).length, icon: Clock3, accent: "bg-amber-500" },
        { label: "Approved", value: applications.filter((item) => item.status === "approved" || item.status === "activated").length, icon: CheckCircle2, accent: "bg-blue-500" },
        { label: "Activated", value: applications.filter((item) => item.status === "activated").length, icon: CheckCircle2, accent: "bg-emerald-500" },
        { label: "Rejected", value: applications.filter((item) => item.status === "rejected").length, icon: XCircle, accent: "bg-red-500" },
    ], [applications]);

    const runAction = async (applicationId, action) => {
        setWorking(`${applicationId}:${action}`);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch("/api/admin/applications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ application_id: applicationId, action }),
        });
        const result = await readJson(response);
        setWorking("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not update application." });
        setApplications((current) => current.map((item) => item.id === applicationId ? result.application : item));
        setMessage({ type: "success", text: result.message || "Application updated." });
    };

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell role="admin" eyebrow="Admin" title="Client Applications" description="Approve ORVA applications and activate client workspaces.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>
                <section className="dashboard-panel mt-6 overflow-hidden">
                    <div className="border-b border-[var(--border)] p-5">
                        <SectionHeading title="Applications" description="Manual approval keeps the onboarding flow controlled before clients publish." />
                    </div>
                    {loading ? <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : !applications.length ? (
                        <EmptyState title="No applications yet" description="Client applications will appear here after submission." className="m-5" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table min-w-[1100px]">
                                <thead>
                                    <tr><th>Business</th><th>Package</th><th>Flow</th><th>Products</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {applications.map((application) => {
                                        return (
                                            <tr key={application.id}>
                                                <td>
                                                    <p className="font-bold">{application.business_name}</p>
                                                    <p className="text-xs text-[var(--muted)]">{application.owner_name} · {application.phone}</p>
                                                    <p className="text-xs font-semibold text-[var(--accent)]">Activates: {application.email}</p>
                                                </td>
                                                <td>
                                                    <p className="font-semibold">{application.packages?.name || "-"}</p>
                                                    <p className="text-xs text-[var(--muted)]">{amountLabel(application.packages?.price_amount)}</p>
                                                </td>
                                                <td>{application.selected_flow === "photo_to_inventory" ? "Photos + prices" : "Inventory list"}</td>
                                                <td>{application.estimated_product_count || "-"}</td>
                                                <td><span className={`dashboard-badge ${badgeClass(application.status)}`}>{statusLabels[application.status] || application.status}</span></td>
                                                <td>
                                                    <div className="grid min-w-[260px] grid-cols-2 gap-2">
                                                        {canActivate(application.status) ? <button type="button" className="btn-primary px-3 py-2" disabled={working === `${application.id}:approve`} onClick={() => runAction(application.id, "approve")}><CheckCircle2 className="h-4 w-4" />Approve & Activate</button> : null}
                                                        {canActivate(application.status) ? <button type="button" className="btn-secondary px-3 py-2" disabled={working === `${application.id}:reject`} onClick={() => runAction(application.id, "reject")}>Reject</button> : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
