"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { productName } from "../../app/lib/inventory";
import { formatStableDateTime } from "../../app/lib/stableDate";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const channelLabels = {
    whatsapp_catalog: "WhatsApp Catalog",
    instagram: "Instagram",
    facebook_page: "Facebook Page",
    online_store: "Online Store",
};

function pretty(value = "") {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badge(status) {
    if (status === "completed") return "badge-green";
    if (status === "failed") return "badge-red";
    if (status === "in_progress") return "badge-warn";
    if (status === "cancelled") return "badge-gray";
    return "badge-blue";
}

function priorityBadge(priority) {
    if (priority === "high") return "badge-red";
    if (priority === "low") return "badge-gray";
    return "badge-warn";
}

function UpdateTasks({ role = "client" }) {
    const specialist = role === "partner";
    const admin = role === "admin";
    const [tasks, setTasks] = useState([]);
    const [filters, setFilters] = useState({ channel: "all", status: "all", priority: "all" });
    const [notes, setNotes] = useState({});
    const [working, setWorking] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });

    const getToken = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        const response = await fetch("/api/update-tasks", { headers: { Authorization: `Bearer ${await getToken()}` } });
        const result = await response.json();
        setLoading(false);
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not load update tasks." });
        setTasks(result.tasks || []);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const filtered = useMemo(() => tasks.filter((task) =>
        (filters.channel === "all" || task.channel === filters.channel) &&
        (filters.status === "all" || task.status === filters.status) &&
        (filters.priority === "all" || task.priority === filters.priority)
    ), [filters, tasks]);

    const summary = [
        { label: "Pending tasks", value: tasks.filter((task) => task.status === "pending").length, icon: Clock3, accent: "bg-[var(--accent)]" },
        { label: "In progress", value: tasks.filter((task) => task.status === "in_progress").length, icon: RefreshCw, accent: "bg-amber-500" },
        { label: "Completed", value: tasks.filter((task) => task.status === "completed").length, icon: CheckCircle2, accent: "bg-emerald-500" },
        { label: "Failed tasks", value: tasks.filter((task) => task.status === "failed").length, icon: AlertTriangle, accent: "bg-red-500" },
    ];

    const updateStatus = async (task, status) => {
        setWorking(task.id);
        const response = await fetch("/api/update-tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
            body: JSON.stringify({ task_id: task.id, status, completion_note: notes[task.id] || "" }),
        });
        const result = await response.json();
        setWorking("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not update task." });
        setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
        setNotes((current) => ({ ...current, [task.id]: "" }));
        setMessage({ type: "success", text: status === "completed" ? "Update marked complete." : "Task status updated." });
    };

    return <AuthGate allowedRoles={role}>
        <DashboardShell role={role} eyebrow={specialist ? "Digital Setup Specialist" : admin ? "Admin exceptions" : "Catalog operations"} title={specialist ? "Assigned Update Tasks" : "Update Tasks"} description={specialist ? "Complete the channel updates assigned to you and add a short note." : admin ? "Review catalog and social update operations across clients." : "Track the updates needed across your digital channels."}>
            <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map((item) => <StatCard key={item.label} {...item} />)}</section>
            <section className="dashboard-panel p-5">
                <SectionHeading title={specialist ? "Assigned queue" : "Channel update queue"} description={specialist ? "Work through assigned catalog and social updates." : admin ? "Unassigned items need attention; assigned work is visible for oversight." : "ORVA creates these tasks when product details change."} />
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <select className="form-field" value={filters.channel} onChange={(event) => setFilters({ ...filters, channel: event.target.value })}><option value="all">All channels</option>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    <select className="form-field" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">All statuses</option>{["pending", "in_progress", "completed", "failed", "cancelled"].map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select>
                    <select className="form-field" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="all">All priorities</option>{["high", "medium", "low"].map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select>
                </div>
                {loading ? <div className="flex items-center gap-2 py-8 text-sm text-[var(--mid)]"><Loader2 className="h-4 w-4 animate-spin" />Loading queue...</div> : !filtered.length ? <EmptyState title="No update tasks here" description="Product changes that need channel updates will appear in this queue." /> : <div className="grid gap-3">{filtered.map((task) => <article key={task.id} className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[var(--ink)]">{task.title}</p><p className="mt-1 text-sm text-[var(--mid)]">{task.description}</p></div><div className="flex gap-2"><span className={`dashboard-badge ${priorityBadge(task.priority)}`}>{pretty(task.priority)}</span><span className={`dashboard-badge ${badge(task.status)}`}>{pretty(task.status)}</span></div></div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[var(--muted)]"><span>{channelLabels[task.channel] || pretty(task.channel)}</span><span>{pretty(task.task_type)}</span><span>{productName(task.products || {})}</span><span>{task.assigned_to ? `Assigned: ${task.assigned_to.slice(0, 8)}` : "Needs specialist assignment"}</span><span>{formatStableDateTime(task.created_at)}</span></div>
                    {specialist || admin ? <textarea className="form-field mt-4 min-h-20" placeholder="Add completion notes..." value={notes[task.id] || ""} onChange={(event) => setNotes({ ...notes, [task.id]: event.target.value })} /> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {task.status === "pending" ? <button type="button" className="btn-secondary" disabled={working === task.id} onClick={() => updateStatus(task, "in_progress")}><Play className="h-4 w-4" />Start</button> : null}
                        {!["completed", "cancelled"].includes(task.status) ? <button type="button" className="btn-primary" disabled={working === task.id} onClick={() => updateStatus(task, "completed")}><CheckCircle2 className="h-4 w-4" />Mark Complete</button> : null}
                        {!["completed", "failed", "cancelled"].includes(task.status) ? <button type="button" className="btn-secondary" disabled={working === task.id} onClick={() => updateStatus(task, "failed")}><XCircle className="h-4 w-4" />Mark Failed</button> : null}
                    </div>
                </article>)}</div>}
            </section>
        </DashboardShell>
    </AuthGate>;
}

export function ClientUpdateTasksPage() {
    return <UpdateTasks role="client" />;
}

export function SpecialistUpdateTasksPage() {
    return <UpdateTasks role="partner" />;
}

export function AdminUpdateTasksPage() {
    return <UpdateTasks role="admin" />;
}
