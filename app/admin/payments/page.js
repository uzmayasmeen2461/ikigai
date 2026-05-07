"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, ReceiptText, Search, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatINR } from "../../lib/pricing";
import { DashboardShell } from "../../../components/DashboardShell";
import { AuthGate } from "../../../components/AuthGate";
import {
    EmptyState,
    ErrorState,
    FilterTabs,
    PaymentStatusBadge,
    SectionHeading,
    StatCard,
} from "../../../components/DashboardUI";

const paymentFilters = [
    { value: "all", label: "All" },
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
];

function formatDate(value) {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function getBusinessName(task) {
    return (
        task.client_business_name ||
        task.business_name ||
        task.client_name ||
        task.title ||
        "Business name not added"
    );
}

export default function AdminPaymentsPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const filteredTasks = useMemo(() => {
        const term = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const paymentStatus = task.payment_status || "pending";
            const matchesFilter = filter === "all" || paymentStatus === filter;
            const haystack = [
                task.title,
                task.client_business_name,
                task.business_name,
                task.client_name,
                task.payment_order_id,
                task.payment_id,
                task.invoice_number,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return matchesFilter && (!term || haystack.includes(term));
        });
    }, [filter, search, tasks]);

    const overviewCards = useMemo(
        () => [
            {
                label: "Paid",
                value: tasks.filter((task) => (task.payment_status || "pending") === "paid").length,
                icon: CheckCircle2,
                accent: "bg-emerald-500",
            },
            {
                label: "Pending",
                value: tasks.filter((task) => (task.payment_status || "pending") === "pending").length,
                icon: Clock3,
                accent: "bg-amber-500",
            },
            {
                label: "Failed",
                value: tasks.filter((task) => task.payment_status === "failed").length,
                icon: XCircle,
                accent: "bg-red-500",
            },
            {
                label: "Total collected",
                value: formatINR(
                    tasks
                        .filter((task) => (task.payment_status || "pending") === "paid")
                        .reduce((sum, task) => sum + Number(task.total_amount || 0), 0)
                ),
                icon: ReceiptText,
                accent: "bg-slate-950",
            },
        ],
        [tasks]
    );

    const fetchTasks = async () => {
        setError("");
        const { data, error: fetchError } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

        if (fetchError) {
            setTasks([]);
            setError(fetchError.message || "Could not load payment records.");
            setLoading(false);
            return;
        }

        setTasks(data || []);
        setLoading(false);
    };

    useEffect(() => {
        queueMicrotask(() => {
            fetchTasks();
        });
    }, []);

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell
                role="admin"
                eyebrow="Admin"
                title="Payments"
                description="Review payment status, invoice details, and collected amounts."
            >
                <section className="mb-10">
                    <SectionHeading title="Payment overview" description="A simple view of paid, pending, and failed payments." />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section className="dashboard-panel p-6">
                    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Payment records</h2>
                            <p className="mt-1 text-sm text-slate-500">Check payment state and invoice references without the order assignment controls.</p>
                        </div>
                        <div className="grid gap-3 lg:min-w-[560px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search payments"
                                    className="form-field pl-12"
                                />
                            </div>
                            <FilterTabs filters={paymentFilters} value={filter} onChange={setFilter} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading payments...
                        </div>
                    ) : error ? (
                        <ErrorState title="Could not load payments" message={error} onRetry={fetchTasks} />
                    ) : filteredTasks.length === 0 ? (
                        <EmptyState title="No payment records" description="Matching payment records will appear here." />
                    ) : (
                        <div className="grid gap-4">
                            {filteredTasks.map((task) => (
                                <article key={task.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                {getBusinessName(task)}
                                            </p>
                                            <h3 className="mt-2 text-lg font-semibold text-slate-950">{task.title}</h3>
                                            <p className="mt-1 text-sm text-slate-500">{formatDate(task.created_at)}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <PaymentStatusBadge status={task.payment_status || "pending"} />
                                            <span className="text-lg font-semibold text-slate-950">
                                                {formatINR(task.total_amount || 0)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order ID</p>
                                            <p className="mt-2 break-all text-sm font-medium text-slate-700">{task.payment_order_id || "Not created"}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment ID</p>
                                            <p className="mt-2 break-all text-sm font-medium text-slate-700">{task.payment_id || "Not paid"}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</p>
                                            <p className="mt-2 break-all text-sm font-medium text-slate-700">{task.invoice_number || "Pending"}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
