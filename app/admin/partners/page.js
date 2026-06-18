"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, UserRound, UsersRound, WalletCards } from "lucide-react";
import { getAuthToken } from "../../lib/supabase";
import { AuthGate } from "../../../components/AuthGate";
import { DashboardShell } from "../../../components/DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../../../components/DashboardUI";

export default function AdminPartnersPage() {
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });

    const load = useCallback(async () => {
        setLoading(true);
        const response = await fetch("/api/operations/tasks", { headers: { Authorization: `Bearer ${await getAuthToken()}` } });
        const result = await response.json();
        setLoading(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not load specialists." });
            return;
        }
        setWorkers(result.workers || []);
        setTasks(result.tasks || []);
    }, []);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const specialistRows = useMemo(() => workers.map((worker) => {
        const ownedTasks = tasks.filter((task) => task.assigned_to === worker.id);
        return {
            ...worker,
            active: ownedTasks.filter((task) => !["closed", "cancelled", "failed"].includes(task.status)).length,
            completed: ownedTasks.filter((task) => ["completed", "payout_generated", "payout_paid", "closed"].includes(task.status)).length,
            payoutsDue: ownedTasks.filter((task) => task.payout_status === "pending_admin_payment").length,
        };
    }), [tasks, workers]);

    const cards = [
        { label: "Specialists", value: workers.length, icon: UsersRound, accent: "bg-[var(--accent)]" },
        { label: "Active tasks", value: tasks.filter((task) => !["closed", "cancelled"].includes(task.status)).length, icon: Clock3, accent: "bg-amber-500" },
        { label: "Completed", value: tasks.filter((task) => ["completed", "payout_generated", "payout_paid", "closed"].includes(task.status)).length, icon: CheckCircle2, accent: "bg-emerald-500" },
        { label: "Payouts due", value: tasks.filter((task) => task.payout_status === "pending_admin_payment").length, icon: WalletCards, accent: "bg-slate-950" },
    ];

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell role="admin" eyebrow="Admin" title="Specialists" description="Track digital setup specialists, assigned work, and payout readiness.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => <StatCard key={card.label} {...card} />)}
                </section>
                <section className="dashboard-panel p-5">
                    <SectionHeading title="Specialist list" description="Workers need a UPI ID before admin can complete payouts smoothly." />
                    {loading ? (
                        <div className="flex items-center gap-2 py-10 text-sm text-[var(--mid)]"><Loader2 className="h-4 w-4 animate-spin" />Loading specialists...</div>
                    ) : !specialistRows.length ? (
                        <EmptyState title="No specialists yet" description="Users with role worker or partner will appear here." />
                    ) : (
                        <div className="grid gap-3">
                            {specialistRows.map((worker) => (
                                <article key={worker.id} className="interactive-tile grid gap-4 rounded-xl border border-[var(--border)] bg-white p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--ink)] text-white">
                                            <UserRound className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--ink)]">{worker.name || "Digital Setup Specialist"}</p>
                                            <p className={`text-sm font-semibold ${worker.upi_id ? "text-emerald-700" : "text-red-600"}`}>UPI: {worker.upi_id || "Missing"}</p>
                                        </div>
                                    </div>
                                    <span className="dashboard-badge badge-blue">{worker.availability || "available"}</span>
                                    <span className="text-sm text-[var(--mid)]">{worker.active} active</span>
                                    <span className="text-sm text-[var(--mid)]">{worker.completed} completed · {worker.payoutsDue} payouts due</span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
