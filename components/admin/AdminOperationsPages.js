"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    BarChart3,
    CheckCircle2,
    Clock3,
    CreditCard,
    FileText,
    Loader2,
    ReceiptText,
    Search,
    Send,
    UserCheck,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { formatINR } from "../../app/lib/pricing";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import {
    EmptyState,
    ErrorState,
    FeedbackMessage,
    PaymentStatusBadge,
    SectionHeading,
    ServiceBadge,
    SlaBadge,
    StatCard,
    StatusBadge,
} from "../DashboardUI";

const serviceLabels = {
    whatsapp: "WhatsApp Business Catalog Setup",
    instagram: "Instagram / Facebook Business Setup",
    social: "Instagram / Facebook Business Setup",
    restaurant: "Restaurant Listing Support",
    cloud_kitchen: "Cloud Kitchen Setup",
    listing: "Product Listing Setup",
    website: "Website / Store Setup",
};

function formatDate(value) {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function getBusinessName(task = {}) {
    return task.client_business_name || task.business_name || task.client_name || task.title || "Business name pending";
}

function payoutMath(task = {}) {
    const total = Number(task.total_amount || 0);
    const base = Number(task.base_amount || 0);
    const platformMargin = Math.max(Number(task.platform_fee || 0), Math.round(base * 0.2));
    const payoutAmount = Math.max(0, total - Number(task.gst_amount || 0) - platformMargin);
    return { payoutAmount, platformMargin };
}

const payoutReadyStatuses = ["completed", "client_approved", "auto_approved"];

function getPartnerName(partner) {
    return partner?.name || partner?.email || "ORVA Partner";
}

function getPartnerUpi(partner) {
    return partner?.upi_id || partner?.upiId || "";
}

function partnerSelectLabel(partner) {
    const upiId = getPartnerUpi(partner);
    return `${getPartnerName(partner)}${upiId ? ` - UPI: ${upiId}` : " - UPI missing"}`;
}

function useAdminData() {
    const [tasks, setTasks] = useState([]);
    const [partners, setPartners] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payoutWarning, setPayoutWarning] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setError("");
        setPayoutWarning("");

        const [taskResult, partnerResult, payoutResult] = await Promise.all([
            supabase.from("tasks").select("*").order("created_at", { ascending: false }),
            supabase.from("users").select("*").in("role", ["worker", "partner"]),
            supabase.from("partner_payouts").select("*").order("created_at", { ascending: false }),
        ]);

        if (taskResult.error || partnerResult.error) {
            setTasks([]);
            setPartners([]);
            setPayouts([]);
            setError(taskResult.error?.message || partnerResult.error?.message || "Could not load admin data.");
            setLoading(false);
            return;
        }

        setTasks(taskResult.data || []);
        setPartners(partnerResult.data || []);
        setPayouts(payoutResult.error ? [] : payoutResult.data || []);
        if (payoutResult.error) {
            setPayoutWarning("Partner payout table is not available yet. Apply the payout migration to save payout records.");
        }
        setLoading(false);
    };

    useEffect(() => {
        queueMicrotask(fetchData);
    }, []);

    return { tasks, partners, payouts, loading, error, payoutWarning, fetchData };
}

function AdminFrame({ title, description, children }) {
    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell role="admin" eyebrow="Admin" title={title} description={description}>
                {children}
            </DashboardShell>
        </AuthGate>
    );
}

function LoadingRow({ label = "Loading..." }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {label}
        </div>
    );
}

export function AdminAssignmentsPage() {
    const { tasks, partners, loading, error, payoutWarning, fetchData } = useAdminData();
    const [drafts, setDrafts] = useState({});
    const [messages, setMessages] = useState({});
    const [savingId, setSavingId] = useState("");

    const unassignedTasks = tasks.filter((task) => task.payment_status === "paid" && !task.worker_id);

    const assignTask = async (task) => {
        const partnerId = drafts[task.id];
        if (!partnerId) {
            setMessages((current) => ({ ...current, [task.id]: { type: "error", text: "Choose a partner first." } }));
            return;
        }

        setSavingId(task.id);
        const taskUpdate = await supabase.from("tasks").update({ worker_id: partnerId, status: "assigned" }).eq("id", task.id);

        if (taskUpdate.error) {
            setSavingId("");
            setMessages((current) => ({ ...current, [task.id]: { type: "error", text: taskUpdate.error.message } }));
            return;
        }

        setMessages((current) => ({ ...current, [task.id]: { type: "success", text: "Partner assigned. Payout will be created automatically after completion." } }));
        setSavingId("");
        fetchData();
    };

    return (
        <AdminFrame title="Assignments" description="Assign paid orders to partners and prepare payout tracking.">
            <SectionHeading title="Paid unassigned tasks" description="Next step: choose a partner for each paid task." />
            {payoutWarning ? <FeedbackMessage type="error" className="mb-5">{payoutWarning}</FeedbackMessage> : null}
            <section className="dashboard-panel p-6">
                {loading ? (
                    <LoadingRow label="Loading assignments..." />
                ) : error ? (
                    <ErrorState title="Could not load assignments" message={error} onRetry={fetchData} />
                ) : unassignedTasks.length === 0 ? (
                    <EmptyState title="No paid unassigned tasks" description="Paid tasks needing assignment will appear here." />
                ) : (
                    <div className="grid gap-4">
                        {unassignedTasks.map((task) => (
                            <article key={task.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_320px]">
                                <div>
                                    <ServiceBadge>{serviceLabels[task.service_type] || task.service_type}</ServiceBadge>
                                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{task.title}</h3>
                                    <p className="mt-1 text-sm text-slate-500">{getBusinessName(task)} · {formatINR(task.total_amount || 0)}</p>
                                </div>
                                <div>
                                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] md:grid-cols-1">
                                        <select value={drafts[task.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [task.id]: event.target.value }))} className="form-field">
                                            <option value="">Select partner</option>
                                            {partners.filter((partner) => (partner.availability || "available") === "available").map((partner) => (
                                                <option key={partner.id} value={partner.id}>{partnerSelectLabel(partner)}</option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => assignTask(task)} disabled={savingId === task.id} className="btn-primary">
                                            {savingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Assign <Send className="ml-2 h-4 w-4" /></>}
                                        </button>
                                    </div>
                                    <FeedbackMessage type={messages[task.id]?.type} className="mt-3">{messages[task.id]?.text}</FeedbackMessage>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </AdminFrame>
    );
}

export function AdminExceptionsPage() {
    const { tasks, payouts, loading, error, payoutWarning, fetchData } = useAdminData();
    const [search, setSearch] = useState("");

    const exceptionTasks = useMemo(() => {
        const payoutTaskIds = new Set(
            payouts
                .filter((payout) => ["failed", "blocked", "rejected"].includes(payout.status))
                .map((payout) => String(payout.task_id))
        );
        const term = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const isException =
                task.status === "needs_admin_assignment" ||
                (task.payment_status === "paid" && !task.worker_id) ||
                task.sla_status === "overdue" ||
                task.payment_status === "failed" ||
                task.dispute_status === "admin_review" ||
                payoutTaskIds.has(String(task.id)) ||
                Boolean(task.client_complaint);
            const haystack = [
                task.title,
                task.client_business_name,
                task.client_name,
                task.service_type,
                task.dispute_status,
                task.client_complaint,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return isException && (!term || haystack.includes(term));
        });
    }, [payouts, search, tasks]);

    const cards = [
        {
            label: "Unassigned",
            value: tasks.filter((task) => task.status === "needs_admin_assignment" || (task.payment_status === "paid" && !task.worker_id)).length,
            icon: UserCheck,
            accent: "bg-red-500",
        },
        {
            label: "Overdue",
            value: tasks.filter((task) => task.sla_status === "overdue").length,
            icon: Clock3,
            accent: "bg-amber-500",
        },
        {
            label: "Failed payments",
            value: tasks.filter((task) => task.payment_status === "failed").length,
            icon: CreditCard,
            accent: "bg-red-500",
        },
        {
            label: "Disputes",
            value: tasks.filter((task) => task.dispute_status === "admin_review" || task.client_complaint).length,
            icon: FileText,
            accent: "bg-slate-950",
        },
    ];

    return (
        <AdminFrame title="Exception Queue" description="Only the work that needs admin judgment. Automation handles the normal path.">
            <section className="mb-10">
                <SectionHeading title="Problems first" description="Unassigned, overdue, disputed, failed, and payout-risk work." />
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => <StatCard key={card.label} {...card} />)}
                </div>
            </section>
            {payoutWarning ? <FeedbackMessage type="error" className="mb-5">{payoutWarning}</FeedbackMessage> : null}
            <section className="dashboard-panel p-6">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Exception list</h2>
                        <p className="mt-1 text-sm text-slate-500">Open details, assign, resolve, or follow up.</p>
                    </div>
                    <div className="relative lg:min-w-96">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exceptions" className="form-field pl-12" />
                    </div>
                </div>

                {loading ? (
                    <LoadingRow label="Loading exceptions..." />
                ) : error ? (
                    <ErrorState title="Could not load exceptions" message={error} onRetry={fetchData} />
                ) : exceptionTasks.length === 0 ? (
                    <EmptyState title="No exceptions right now" description="Automation is handling the normal flow." />
                ) : (
                    <div className="grid gap-4">
                        {exceptionTasks.map((task) => (
                            <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <ServiceBadge>{serviceLabels[task.service_type] || task.service_type}</ServiceBadge>
                                        <h3 className="mt-3 text-lg font-semibold text-slate-950">{task.title}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{getBusinessName(task)}</p>
                                        {task.client_complaint ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{task.client_complaint}</p> : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <StatusBadge status={task.status || "pending"} />
                                        <PaymentStatusBadge status={task.payment_status || "pending"} />
                                        <SlaBadge status={task.sla_status || "on_time"} />
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Link href={`/admin/orders/${task.id}`} className="btn-primary">Review details</Link>
                                    {task.status === "needs_admin_assignment" || !task.worker_id ? (
                                        <Link href="/admin/assignments" className="btn-secondary">Assign partner</Link>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </AdminFrame>
    );
}

export function AdminPartnerPayoutsPage() {
    const { tasks, partners, payouts, loading, error, payoutWarning, fetchData } = useAdminData();
    const [messages, setMessages] = useState({});
    const [savingId, setSavingId] = useState("");

    const generatedPayouts = useMemo(() => {
        const existingTaskIds = new Set(payouts.map((payout) => String(payout.task_id)));
        const fromTable = payouts.map((payout) => ({
            ...payout,
            task: tasks.find((task) => String(task.id) === String(payout.task_id)),
            generated: false,
        }));
        const missing = tasks
            .filter((task) =>
                task.payment_status === "paid" &&
                task.worker_id &&
                payoutReadyStatuses.includes(task.status) &&
                !existingTaskIds.has(String(task.id))
            )
            .map((task) => {
                const { payoutAmount, platformMargin } = payoutMath(task);
                return {
                    id: `generated-${task.id}`,
                    task_id: task.id,
                    partner_id: task.worker_id,
                    payout_amount: payoutAmount,
                    platform_margin: platformMargin,
                    status: "pending_approval",
                    task,
                    generated: true,
                };
            });
        return [...fromTable, ...missing];
    }, [payouts, tasks]);

    const updatePayout = async (payout, status, partner) => {
        const upiId = partner?.upi_id || partner?.upiId || "";

        if (!upiId && status !== "pending_approval") {
            setMessages((current) => ({
                ...current,
                [payout.id]: {
                    type: "error",
                    text: "Ask this partner to add a UPI ID before initiating payout.",
                },
            }));
            return;
        }

        const timestamp = new Date().toISOString();
        if (payout.generated) {
            setSavingId(payout.id);
            const { error: insertError } = await supabase
                .from("partner_payouts")
                .insert({
                    task_id: payout.task_id,
                    partner_id: payout.partner_id,
                    payout_amount: payout.payout_amount,
                    platform_margin: payout.platform_margin,
                    status,
                    approved_at: ["approved", "paid"].includes(status) ? timestamp : null,
                    paid_at: status === "paid" ? timestamp : null,
                });

            setSavingId("");

            if (insertError) {
                setMessages((current) => ({
                    ...current,
                    [payout.id]: {
                        type: "error",
                        text: insertError.message?.includes("partner_payouts")
                            ? "Apply the partner_payouts migration before saving payout records."
                            : insertError.message || "Could not create payout record.",
                    },
                }));
                return;
            }

            setMessages((current) => ({
                ...current,
                [payout.id]: {
                    type: "success",
                    text: status === "paid"
                        ? `Payout marked paid. UPI: ${upiId}.`
                        : `Payout approved. Initiate UPI transfer to ${upiId}.`,
                },
            }));
            fetchData();
            return;
        }

        setSavingId(payout.id);
        const { error: updateError } = await supabase
            .from("partner_payouts")
            .update({
                status,
                approved_at: ["approved", "paid"].includes(status) ? (payout.approved_at || timestamp) : payout.approved_at || null,
                paid_at: status === "paid" ? timestamp : payout.paid_at || null,
            })
            .eq("id", payout.id);

        setSavingId("");
        if (updateError) {
            setMessages((current) => ({ ...current, [payout.id]: { type: "error", text: updateError.message } }));
            return;
        }
        setMessages((current) => ({
            ...current,
            [payout.id]: {
                type: "success",
                text: status === "paid"
                    ? `Payout marked paid. UPI: ${upiId}.`
                    : `Payout approved. Initiate UPI transfer to ${upiId}.`,
            },
        }));
        fetchData();
    };

    return (
        <AdminFrame title="Partner Payouts" description="Approve and manually track partner payouts.">
            <SectionHeading title="Payout queue" description="Automation creates pending approval records when tasks complete." />
            {payoutWarning ? <FeedbackMessage type="error" className="mb-5">{payoutWarning}</FeedbackMessage> : null}
            <section className="dashboard-panel p-6">
                {loading ? (
                    <LoadingRow label="Loading payouts..." />
                ) : error ? (
                    <ErrorState title="Could not load payouts" message={error} onRetry={fetchData} />
                ) : generatedPayouts.length === 0 ? (
                    <EmptyState title="No payouts yet" description="Completed paid tasks will appear here." />
                ) : (
                    <div className="grid gap-4">
                        {generatedPayouts.map((payout) => {
                            const partner = partners.find((item) => item.id === payout.partner_id);
                            const upiId = getPartnerUpi(partner);
                            const needsUpi = !upiId;
                            return (
                                <article key={payout.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Worker payout</p>
                                            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                <p className="font-semibold text-slate-950">{getPartnerName(partner)}</p>
                                                <p className={`mt-1 text-sm font-semibold ${needsUpi ? "text-red-600" : "text-emerald-700"}`}>
                                                    UPI: {upiId || "Not provided"}
                                                </p>
                                            </div>
                                            <h3 className="mt-2 text-lg font-semibold text-slate-950">{payout.task?.title || `Task ${payout.task_id}`}</h3>
                                            <p className="mt-1 text-sm text-slate-500">Status: {payout.status || "pending"}</p>
                                            {needsUpi ? (
                                                <p className="mt-1 text-xs text-slate-500">Ask the partner to add UPI from the worker dashboard before payout.</p>
                                            ) : null}
                                        </div>
                                        <div className="grid gap-2 text-sm sm:grid-cols-3">
                                            <Amount label="Payout" value={payout.payout_amount} />
                                            <Amount label="Margin" value={payout.platform_margin} />
                                            <Amount label="Order" value={payout.task?.total_amount || 0} />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button type="button" onClick={() => updatePayout(payout, "approved", partner)} disabled={savingId === payout.id || needsUpi} className="btn-secondary">Initiate UPI payout</button>
                                        <button type="button" onClick={() => updatePayout(payout, "paid", partner)} disabled={savingId === payout.id || needsUpi} className="btn-primary">Mark paid manually</button>
                                    </div>
                                    <FeedbackMessage type={messages[payout.id]?.type} className="mt-3">{messages[payout.id]?.text}</FeedbackMessage>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </AdminFrame>
    );
}

function Amount({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 font-semibold text-slate-950">{formatINR(value || 0)}</p>
        </div>
    );
}

export function AdminReportsPage() {
    const { tasks, partners, loading, error, fetchData } = useAdminData();
    const paidTasks = tasks.filter((task) => task.payment_status === "paid");
    const completedTasks = tasks.filter((task) => ["completed", "client_approved", "auto_approved"].includes(task.status));
    const pendingPayoutTasks = paidTasks.filter((task) => task.worker_id && task.status !== "completed");
    const revenue = paidTasks.reduce((sum, task) => sum + Number(task.total_amount || 0), 0);
    const margin = paidTasks.reduce((sum, task) => sum + payoutMath(task).platformMargin, 0);
    const autoAssigned = paidTasks.filter((task) => task.assignment_mode === "auto").length;
    const completionTimes = completedTasks
        .filter((task) => task.assigned_at && task.completed_at)
        .map((task) => (new Date(task.completed_at).getTime() - new Date(task.assigned_at).getTime()) / 36e5);
    const averageCompletionHours = completionTimes.length
        ? Math.round(completionTimes.reduce((sum, value) => sum + value, 0) / completionTimes.length)
        : 0;
    const partnerPerformance = partners.map((partner) => {
        const partnerTasks = tasks.filter((task) => task.worker_id === partner.id);
        const partnerCompleted = partnerTasks.filter((task) => ["completed", "client_approved", "auto_approved"].includes(task.status)).length;
        return {
            partner,
            total: partnerTasks.length,
            completed: partnerCompleted,
            rate: partnerTasks.length ? Math.round((partnerCompleted / partnerTasks.length) * 100) : 0,
        };
    }).sort((a, b) => b.rate - a.rate || b.completed - a.completed);
    const serviceCounts = Object.entries(
        tasks.reduce((acc, task) => {
            const key = serviceLabels[task.service_type] || task.service_type || "Other";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    return (
        <AdminFrame title="Reports" description="Simple operating metrics for revenue, margin, completion, and demand.">
            {loading ? (
                <LoadingRow label="Loading reports..." />
            ) : error ? (
                <ErrorState title="Could not load reports" message={error} onRetry={fetchData} />
            ) : (
                <>
                    <div className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Total revenue" value={formatINR(revenue)} icon={CreditCard} accent="bg-emerald-500" />
                        <StatCard label="Platform margin" value={formatINR(margin)} icon={BarChart3} accent="bg-blue-500" />
                        <StatCard label="Completed tasks" value={completedTasks.length} icon={CheckCircle2} accent="bg-green-500" />
                        <StatCard label="Pending payouts" value={pendingPayoutTasks.length} icon={Clock3} accent="bg-amber-500" />
                        <StatCard label="Automation success" value={`${paidTasks.length ? Math.round((autoAssigned / paidTasks.length) * 100) : 0}%`} icon={UserCheck} accent="bg-indigo-500" />
                        <StatCard label="Avg completion" value={averageCompletionHours ? `${averageCompletionHours}h` : "N/A"} icon={Clock3} accent="bg-slate-950" />
                    </div>
                    <section className="dashboard-panel mb-6 p-6">
                        <SectionHeading title="Popular services" description="Demand by service type." />
                        <div className="grid gap-3">
                            {serviceCounts.map(([service, count]) => (
                                <div key={service} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4">
                                    <span className="font-semibold text-slate-900">{service}</span>
                                    <span className="dashboard-badge bg-blue-50 text-blue-700 ring-blue-100">{count} orders</span>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="dashboard-panel p-6">
                        <SectionHeading title="Partner performance" description="Completion rate by partner." />
                        <div className="grid gap-3">
                            {partnerPerformance.length === 0 ? (
                                <EmptyState title="No partner data yet" description="Partner performance appears after assignments." />
                            ) : partnerPerformance.map(({ partner, total, completed, rate }) => (
                                <div key={partner.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                                    <span>
                                        <span className="block font-semibold text-slate-900">{getPartnerName(partner)}</span>
                                        <span className={`mt-1 block text-xs font-semibold ${getPartnerUpi(partner) ? "text-emerald-700" : "text-red-600"}`}>
                                            UPI: {getPartnerUpi(partner) || "missing"}
                                        </span>
                                    </span>
                                    <span className="text-sm text-slate-500">{completed}/{total} completed</span>
                                    <span className="dashboard-badge bg-emerald-50 text-emerald-700 ring-emerald-100">{rate}%</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </AdminFrame>
    );
}

export function AdminOrderDetailsPage() {
    const params = useParams();
    const taskId = params?.taskId;
    const { tasks, partners, loading, error, fetchData } = useAdminData();
    const task = tasks.find((item) => String(item.id) === String(taskId));
    const partner = partners.find((item) => item.id === task?.worker_id);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [conversion, setConversion] = useState(null);
    const [conversionLoading, setConversionLoading] = useState(false);

    const markCompleted = async () => {
        setSaving(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(`/api/tasks/${task.id}/action`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionData.session?.access_token || ""}`,
            },
            body: JSON.stringify({ action: "admin_complete" }),
        });
        const result = await response.json();
        setSaving(false);
        if (!response.ok) {
            setMessage(result.error || "Could not complete this task.");
            return;
        }
        setMessage("Task marked completed. Payout record is pending approval.");
        fetchData();
    };

    const loadConversion = useCallback(async () => {
        if (!task || task.service_type !== "inventory_photo_conversion") return;
        setConversionLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(`/api/inventory/conversion/${task.id}`, {
            headers: { Authorization: `Bearer ${sessionData.session?.access_token || ""}` },
        });
        const result = await response.json().catch(() => ({}));
        setConversion(response.ok ? result : null);
        setConversionLoading(false);
    }, [task]);

    useEffect(() => {
        queueMicrotask(loadConversion);
    }, [loadConversion]);

    const approveConversion = async () => {
        setSaving(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(`/api/inventory/conversion/${task.id}/approve`, {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionData.session?.access_token || ""}` },
        });
        const result = await response.json().catch(() => ({}));
        setSaving(false);
        if (!response.ok) {
            setMessage(result.error || "Could not approve inventory.");
            return;
        }
        setMessage(`${result.products?.length || 0} products approved and added to client inventory.`);
        fetchData();
        loadConversion();
    };

    return (
        <AdminFrame title="Order Details" description="Review one order from payment to partner submission.">
            {loading ? (
                <LoadingRow label="Loading order..." />
            ) : error ? (
                <ErrorState title="Could not load order" message={error} onRetry={fetchData} />
            ) : !task ? (
                <EmptyState title="Order not found" description="This task could not be found." action={<Link href="/admin/orders" className="btn-primary mt-6 inline-flex">Back to orders</Link>} />
            ) : (
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <section className="dashboard-panel p-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <ServiceBadge>{serviceLabels[task.service_type] || task.service_type}</ServiceBadge>
                            <StatusBadge status={task.status || "pending"} />
                            <PaymentStatusBadge status={task.payment_status || "pending"} />
                        </div>
                        <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{task.title}</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{task.description}</p>
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <Info label="Client" value={task.client_name || task.client_email || task.client_id} />
                            <Info label="Business" value={getBusinessName(task)} />
                            <Info label="Phone" value={task.client_phone || "Not provided"} />
                            <Info label="Created" value={formatDate(task.created_at)} />
                        </div>
                    </section>
                    <section className="space-y-6">
                        <Panel title="Payment">
                            <Info label="Total" value={formatINR(task.total_amount || 0)} />
                            <Info label="Order ID" value={task.payment_order_id || "Not created"} />
                            <Info label="Payment ID" value={task.payment_id || "Not paid"} />
                        </Panel>
                        <Panel title="Invoice">
                            <Info label="Invoice number" value={task.invoice_number || "Pending"} />
                            <Info label="Invoice URL" value={task.invoice_url || "Pending"} />
                        </Panel>
                        <Panel title="Assignment">
                            <Info label="Partner" value={partner ? `${getPartnerName(partner)}${getPartnerUpi(partner) ? ` - UPI: ${getPartnerUpi(partner)}` : " - UPI missing"}` : "Unassigned"} />
                            <Info label="Latest partner update" value={task.notes || "No update submitted yet"} />
                        </Panel>
                        {task.service_type === "inventory_photo_conversion" ? (
                            <Panel title="Inventory Conversion">
                                {conversionLoading ? (
                                    <LoadingRow label="Loading converted inventory..." />
                                ) : (
                                    <>
                                        <Info label="Uploaded photos" value={`${conversion?.batch?.photos?.length || 0} photo(s)`} />
                                        <Info label="Converted rows" value={`${conversion?.items?.length || 0} product row(s)`} />
                                        {conversion?.batch?.photos?.length ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {conversion.batch.photos.slice(0, 6).map((photo, index) => (
                                                    <div
                                                        key={`${photo.name || "photo"}-${index}`}
                                                        aria-label={photo.name || `Uploaded photo ${index + 1}`}
                                                        className="aspect-square rounded-2xl border border-slate-100 bg-slate-100 bg-cover bg-center"
                                                        style={{ backgroundImage: `url(${photo.url})` }}
                                                    />
                                                ))}
                                            </div>
                                        ) : null}
                                        <div className="grid gap-2">
                                            {(conversion?.items || []).map((item) => (
                                                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                                                    <p className="text-sm text-slate-500">{item.category || "No category"} · ₹{item.price || 0} · Stock {item.stock || 0} · {item.status}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={approveConversion} disabled={saving || !conversion?.items?.length} className="btn-primary w-full">
                                            Approve Converted Inventory
                                        </button>
                                    </>
                                )}
                            </Panel>
                        ) : null}
                        <div className="dashboard-panel p-5">
                            <button type="button" onClick={markCompleted} disabled={saving || task.status === "completed"} className="btn-primary w-full">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {task.status === "completed" ? "Task completed" : "Complete task"}
                            </button>
                            {message ? <FeedbackMessage type={message.includes("Could") ? "error" : "success"} className="mt-3">{message}</FeedbackMessage> : null}
                        </div>
                    </section>
                </div>
            )}
        </AdminFrame>
    );
}

function Panel({ title, children }) {
    return (
        <div className="dashboard-panel p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-950">{title}</h3>
            <div className="grid gap-3">{children}</div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "Not available"}</p>
        </div>
    );
}

export function ClientInvoicesPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingId, setDownloadingId] = useState("");

    const fetchTasks = async () => {
        setLoading(true);
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const { data, error: fetchError } = await supabase.from("tasks").select("*").eq("client_id", user.id).order("created_at", { ascending: false });
        setTasks(data || []);
        setError(fetchError?.message || "");
        setLoading(false);
    };

    useEffect(() => {
        queueMicrotask(fetchTasks);
    }, []);

    const downloadInvoice = async (task) => {
        setDownloadingId(task.id);
        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token || "";
            const response = await fetch(task.invoice_url || `/api/invoices/${task.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!response.ok) {
                throw new Error("Could not download invoice.");
            }

            const blob = await response.blob();
            downloadBlob(`${task.invoice_number || "ORVA-Invoice"}.pdf`, blob);
        } catch (downloadError) {
            setError(downloadError.message || "Could not download invoice.");
        } finally {
            setDownloadingId("");
        }
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Business Owner" title="Invoices" description="Download invoices for paid ORVA services.">
                <section className="dashboard-panel p-6">
                    <SectionHeading title="My invoices" description="Paid service invoices appear here." />
                    {loading ? (
                        <LoadingRow label="Loading invoices..." />
                    ) : error ? (
                        <ErrorState title="Could not load invoices" message={error} onRetry={fetchTasks} />
                    ) : tasks.filter((task) => task.invoice_number).length === 0 ? (
                        <EmptyState icon={ReceiptText} title="No invoices yet" description="Invoices are generated after verified payment." />
                    ) : (
                        <div className="grid gap-4">
                            {tasks.filter((task) => task.invoice_number).map((task) => (
                                <article key={task.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{task.invoice_number}</p>
                                        <h3 className="mt-2 font-semibold text-slate-950">{task.title}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{formatDate(task.paid_at || task.created_at)}</p>
                                    </div>
                                    <button type="button" onClick={() => downloadInvoice(task)} disabled={downloadingId === task.id} className="btn-primary">
                                        {downloadingId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Download invoice
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
