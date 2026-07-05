"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BadgeIndianRupee,
    CheckCircle2,
    Clock3,
    Loader2,
    Play,
    RefreshCw,
    Send,
    UserCheck,
    WalletCards,
} from "lucide-react";
import { getAuthToken } from "../../app/lib/supabase";
import { formatINR } from "../../app/lib/pricing";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const taskTemplates = [
    {
        value: "create_facebook_page",
        label: "Facebook page creation",
        channel: "facebook_setup",
        title: "Create Facebook page",
        instructions: "Create or update the client's Facebook Page, add business details, profile image, bio, contact details, and confirm page access.",
    },
    {
        value: "create_instagram_page",
        label: "Instagram page creation",
        channel: "instagram_setup",
        title: "Create Instagram page",
        instructions: "Create or update the client's Instagram professional account, add bio, category, contact details, profile image, and connect it to Meta if required.",
    },
    {
        value: "setup_whatsapp_business",
        label: "WhatsApp Business account creation",
        channel: "whatsapp_business",
        title: "Setup WhatsApp Business account",
        instructions: "Setup WhatsApp Business for the client, add profile details, business hours, catalog basics, greeting message, and quick replies.",
    },
    {
        value: "catalog_setup",
        label: "Publish inventory to WhatsApp catalog",
        channel: "whatsapp_catalog",
        title: "Publish inventory to WhatsApp catalog",
        instructions: "Review the client's ORVA products, prepare product images/names/prices/descriptions, and add or update them manually in the WhatsApp Business catalog. Add a completion note before marking done.",
    },
];

const blankTask = {
    title: taskTemplates[0].title,
    client_name: "",
    client_business_name: "",
    client_phone: "",
    client_email: "",
    channel: taskTemplates[0].channel,
    task_type: taskTemplates[0].value,
    priority: "medium",
    payout_amount: "",
    description: "",
    instructions: taskTemplates[0].instructions,
    assigned_to: "",
};

function pretty(value = "") {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function channelLabel(value) {
    return taskTemplates.find((item) => item.channel === value)?.label || pretty(value);
}

function statusClass(status) {
    if (["completed", "payment_confirmed", "closed"].includes(status)) return "badge-green";
    if (["failed", "cancelled"].includes(status)) return "badge-red";
    if (["started", "in_progress", "payout_generated", "payout_paid"].includes(status)) return "badge-warn";
    return "badge-blue";
}

function payoutClass(status) {
    if (status === "confirmed_by_worker") return "badge-green";
    if (status === "paid_by_admin") return "badge-blue";
    if (status === "pending_admin_payment") return "badge-warn";
    return "badge-gray";
}

function specialistName(task) {
    return task.specialist?.name || task.specialist?.email || (task.assigned_to ? "Assigned specialist" : "Unassigned");
}

function specialistUpi(task) {
    return task.specialist?.upi_id || "";
}

function clientLine(task) {
    return [task.client_business_name, task.client_name, task.client_phone].filter(Boolean).join(" · ");
}

function visibleLogs(task) {
    return (task.activity_logs || []).filter((log) => log.note);
}

function TaskCreateForm({ workers, onCreated }) {
    const [form, setForm] = useState(blankTask);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const selectTask = (value) => {
        const template = taskTemplates.find((item) => item.value === value) || taskTemplates[0];
        setForm((current) => ({
            ...current,
            task_type: template.value,
            channel: template.channel,
            title: template.title,
            instructions: template.instructions,
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage({ type: "", text: "" });
        const response = await fetch("/api/operations/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getAuthToken()}` },
            body: JSON.stringify(form),
        });
        const result = await response.json();
        setSaving(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not create task." });
            return;
        }
        setMessage({ type: "success", text: "Task created." });
        setForm(blankTask);
        onCreated();
    };

    return (
        <section className="dashboard-panel p-5">
            <SectionHeading title="Create worker task" description="Select the setup task, choose a worker, and assign it from here." />
            <form onSubmit={submit} className="grid gap-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
                    <select className="form-field" value={form.task_type} onChange={(event) => selectTask(event.target.value)}>
                        {taskTemplates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <select className="form-field" value={form.assigned_to} onChange={(event) => setField("assigned_to", event.target.value)}>
                        <option value="">Choose worker later</option>
                        {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name || "Worker"}{worker.upi_id ? ` - ${worker.upi_id}` : " - UPI missing"}</option>)}
                    </select>
                    <input className="form-field" type="number" min="0" value={form.payout_amount} onChange={(event) => setField("payout_amount", event.target.value)} placeholder="Payout" />
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                    <input className="form-field" value={form.client_business_name} onChange={(event) => setField("client_business_name", event.target.value)} placeholder="Client business name" required />
                    <input className="form-field" value={form.client_name} onChange={(event) => setField("client_name", event.target.value)} placeholder="Client contact name" required />
                    <input className="form-field" value={form.client_phone} onChange={(event) => setField("client_phone", event.target.value)} placeholder="Client phone" required />
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                    <input className="form-field" value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Task title" required />
                    <input className="form-field" type="email" value={form.client_email} onChange={(event) => setField("client_email", event.target.value)} placeholder="Client email optional" />
                </div>
                <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
                    <select className="form-field" value={form.priority} onChange={(event) => setField("priority", event.target.value)}>
                        {["low", "medium", "high", "urgent"].map((item) => <option key={item} value={item}>{pretty(item)} priority</option>)}
                    </select>
                    <input className="form-field" value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Short note optional" />
                </div>
                <textarea className="form-field min-h-20" value={form.instructions} onChange={(event) => setField("instructions", event.target.value)} placeholder="Instructions for specialist" />
                <div className="flex flex-wrap items-center gap-3">
                    <button className="btn-primary" disabled={saving} type="submit">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {form.assigned_to ? "Create and assign task" : "Create task"}
                    </button>
                    <FeedbackMessage type={message.type}>{message.text}</FeedbackMessage>
                </div>
            </form>
        </section>
    );
}

function TaskCard({ task, workers, role, onAction }) {
    const admin = role === "admin";
    const specialist = role === "partner";
    const [workerId, setWorkerId] = useState(task.assigned_to || "");
    const [note, setNote] = useState("");
    const [payoutAmount, setPayoutAmount] = useState(task.payout_amount || "");
    const [reference, setReference] = useState(task.payout_reference || "");
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });

    const run = async (payload, successText) => {
        setWorking(payload.action || payload.status);
        setMessage({ type: "", text: "" });
        const response = await fetch("/api/operations/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getAuthToken()}` },
            body: JSON.stringify({ task_id: task.id, note, ...payload }),
        });
        const result = await response.json();
        setWorking("");
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not update task." });
            return;
        }
        setNote("");
        setMessage({ type: "success", text: successText || "Task updated." });
        onAction();
    };

    return (
        <article className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap gap-2">
                        <span className="dashboard-badge badge-blue">{channelLabel(task.channel)}</span>
                        <span className={`dashboard-badge ${statusClass(task.status)}`}>{pretty(task.status)}</span>
                        <span className={`dashboard-badge ${payoutClass(task.payout_status)}`}>Payout: {pretty(task.payout_status)}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-[var(--ink)]">{task.title}</h3>
                    <p className="mt-1 text-sm text-[var(--mid)]">{clientLine(task) || "Client details pending"}</p>
                    {task.instructions ? <p className="mt-3 rounded-lg bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--ink3)]">{task.instructions}</p> : null}
                </div>
                <div className="min-w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{specialistName(task)}</p>
                    <p className={`mt-1 text-xs font-semibold ${specialistUpi(task) ? "text-emerald-700" : "text-red-600"}`}>
                        UPI: {specialistUpi(task) || "Not added"}
                    </p>
                    <p className="mt-2 text-xs text-[var(--mid)]">Payout: {formatINR(task.payout_amount || 0)}</p>
                </div>
            </div>

            {admin ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_150px_auto_auto]">
                    <select className="form-field" value={workerId} onChange={(event) => setWorkerId(event.target.value)}>
                        <option value="">Select specialist</option>
                        {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name || "Specialist"}{worker.upi_id ? ` - ${worker.upi_id}` : " - UPI missing"}</option>)}
                    </select>
                    <input className="form-field" type="number" min="0" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} placeholder="Payout" />
                    <button className="btn-secondary" disabled={working === "assign"} onClick={() => run({ action: "assign", assigned_to: workerId }, "Specialist assigned.")}>
                        <UserCheck className="h-4 w-4" /> Assign
                    </button>
                    <button className="btn-secondary" disabled={working === "generate_payout"} onClick={() => run({ action: "generate_payout", payout_amount: payoutAmount }, "Payout generated for admin payment.")}>
                        <WalletCards className="h-4 w-4" /> Generate payout
                    </button>
                </div>
            ) : null}

            {(task.admin_notes || task.specialist_notes || task.completion_note || visibleLogs(task).length) ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Admin note</p>
                        <p className="mt-2 text-sm text-[var(--ink3)]">{task.admin_notes || "No admin note yet."}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Worker note</p>
                        <p className="mt-2 text-sm text-[var(--ink3)]">{task.specialist_notes || task.completion_note || "No worker note yet."}</p>
                    </div>
                    {visibleLogs(task).length ? (
                        <div className="rounded-lg border border-[var(--border)] bg-white p-4 md:col-span-2">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Message history</p>
                            <div className="mt-3 grid gap-2">
                                {visibleLogs(task).slice(0, 6).map((log) => (
                                    <p key={log.id} className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-[var(--mid)]">
                                        <span className="font-semibold text-[var(--ink)]">{log.actor_role === "admin" ? "Admin" : "Worker"}</span>
                                        <span className="text-[var(--muted)]"> · {pretty(log.action)}</span>
                                        <span>: {log.note}</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <textarea className="form-field min-h-20" value={note} onChange={(event) => setNote(event.target.value)} placeholder={admin ? "Admin note or payout note" : "Add task update or completion note"} />
                <div className="flex flex-wrap items-start gap-2 lg:max-w-md">
                    {specialist && ["assigned", "pending"].includes(task.status) ? <button className="btn-secondary" disabled={working === "status"} onClick={() => run({ action: "status", status: "started" }, "Task started.")}><Play className="h-4 w-4" /> Start</button> : null}
                    {specialist && !["completed", "payout_generated", "payout_paid", "closed", "failed", "cancelled"].includes(task.status) ? <button className="btn-primary" disabled={working === "status"} onClick={() => run({ action: "status", status: "completed" }, "Task marked completed.")}><CheckCircle2 className="h-4 w-4" /> Complete</button> : null}
                    {admin ? (
                        <>
                            <input className="form-field min-w-48" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UPI reference optional" />
                            <button className="btn-primary" disabled={working === "mark_paid"} onClick={() => run({ action: "mark_paid", payout_reference: reference }, "Payout marked paid.")}>
                                <BadgeIndianRupee className="h-4 w-4" /> Mark paid
                            </button>
                        </>
                    ) : null}
                    {specialist && task.payout_status === "paid_by_admin" ? <button className="btn-primary" disabled={working === "confirm_payout"} onClick={() => run({ action: "confirm_payout" }, "Payment confirmed and task closed.")}><CheckCircle2 className="h-4 w-4" /> I received payment</button> : null}
                </div>
            </div>

            {task.activity_logs?.length ? (
                <details className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">Activity history</summary>
                    <div className="mt-3 grid gap-2">
                        {task.activity_logs.slice(0, 5).map((log) => (
                            <p key={log.id} className="text-xs text-[var(--mid)]">
                                <span className="font-semibold text-[var(--ink3)]">{pretty(log.action)}</span>
                                {log.to_status ? ` → ${pretty(log.to_status)}` : ""}{log.note ? `: ${log.note}` : ""}
                            </p>
                        ))}
                    </div>
                </details>
            ) : null}
            <FeedbackMessage type={message.type} className="mt-3">{message.text}</FeedbackMessage>
        </article>
    );
}

function AllTasksList({ tasks }) {
    if (!tasks.length) return null;

    return (
        <section className="dashboard-panel mt-6 p-5">
            <SectionHeading title="All tasks" description="A quick status list for active and closed work." />
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr] gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)] md:grid">
                    <span>Task</span>
                    <span>Client</span>
                    <span>Status</span>
                    <span>Payout</span>
                    <span>Worker</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {tasks.map((task) => (
                        <div key={task.id} className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_1fr] md:items-center">
                            <div>
                                <p className="font-semibold text-[var(--ink)]">{task.title}</p>
                                <p className="text-xs text-[var(--mid)]">{channelLabel(task.channel)}</p>
                            </div>
                            <p className="text-[var(--mid)]">{task.client_business_name || task.client_name || "Client pending"}</p>
                            <span className={`dashboard-badge w-fit ${statusClass(task.status)}`}>{pretty(task.status)}</span>
                            <span className={`dashboard-badge w-fit ${payoutClass(task.payout_status)}`}>{pretty(task.payout_status)}</span>
                            <p className="text-[var(--mid)]">{specialistName(task)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function OperationsTasksPage({ role }) {
    const admin = role === "admin";
    const [tasks, setTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("active");
    const [message, setMessage] = useState({ type: "", text: "" });

    const load = useCallback(async () => {
        setLoading(true);
        const response = await fetch("/api/operations/tasks", { headers: { Authorization: `Bearer ${await getAuthToken()}` } });
        const result = await response.json();
        setLoading(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not load operations tasks." });
            return;
        }
        setTasks(result.tasks || []);
        setWorkers(result.workers || []);
    }, []);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const summary = useMemo(() => [
        { label: "Pending", value: tasks.filter((task) => ["pending", "assigned"].includes(task.status)).length, icon: Clock3, accent: "bg-amber-500" },
        { label: "Started", value: tasks.filter((task) => ["started", "in_progress"].includes(task.status)).length, icon: Play, accent: "bg-[var(--accent)]" },
        { label: "Completed", value: tasks.filter((task) => ["completed", "payout_generated", "payout_paid"].includes(task.status)).length, icon: CheckCircle2, accent: "bg-emerald-500" },
        { label: "Closed", value: tasks.filter((task) => task.status === "closed").length, icon: RefreshCw, accent: "bg-slate-950" },
    ], [tasks]);

    const filtered = tasks.filter((task) => {
        if (filter === "active") return !["closed", "cancelled"].includes(task.status);
        if (filter === "payout") return ["completed", "payout_generated", "payout_paid"].includes(task.status) || task.payout_status !== "not_generated";
        if (filter === "closed") return task.status === "closed";
        return true;
    });

    return (
        <AuthGate allowedRoles={role}>
            <DashboardShell
                role={role}
                eyebrow={admin ? "Admin" : "Digital Setup Specialist"}
                title={admin ? "Operations" : "My Tasks"}
                description={admin ? "Create setup tasks, assign specialists, track progress, and close payouts." : "Start assigned work, update progress, complete tasks, and confirm payout receipt."}
            >
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summary.map((item) => <StatCard key={item.label} {...item} />)}
                </section>

                {admin ? <div className="mb-6"><TaskCreateForm workers={workers} onCreated={load} /></div> : null}

                <section className="dashboard-panel p-5">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <SectionHeading title={admin ? "Task queue" : "Assigned queue"} description={admin ? "Every task has a visible owner, status, payout, and activity record." : "Your updates appear instantly for admin review."} />
                        <div className="flex flex-wrap gap-2">
                            {["active", "payout", "closed", "all"].map((item) => (
                                <button key={item} type="button" onClick={() => setFilter(item)} className={`btn ${filter === item ? "btn-primary" : "btn-secondary"}`}>{pretty(item)}</button>
                            ))}
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex items-center gap-2 py-10 text-sm text-[var(--mid)]"><Loader2 className="h-4 w-4 animate-spin" />Loading tasks...</div>
                    ) : !filtered.length ? (
                        <EmptyState title={admin ? "No operations tasks yet" : "No assigned tasks"} description={admin ? "Create a setup task above to start assigning work." : "Tasks assigned by admin will appear here."} />
                    ) : (
                        <div className="grid gap-4">
                            {filtered.map((task) => <TaskCard key={task.id} task={task} workers={workers} role={role} onAction={load} />)}
                        </div>
                    )}
                </section>
                <AllTasksList tasks={tasks} />
            </DashboardShell>
        </AuthGate>
    );
}

export function AdminOperationsTasksPage() {
    return <OperationsTasksPage role="admin" />;
}

export function SpecialistOperationsTasksPage() {
    return <OperationsTasksPage role="partner" />;
}
