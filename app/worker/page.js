"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    Clock3,
    ClipboardList,
    FileText,
    Loader2,
    MessageSquareText,
    Send,
    Sparkles,
    Target,
    Wrench,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { isWhatsAppServiceType } from "../../app/lib/whatsappCatalog";
import { DashboardShell } from "../../components/DashboardShell";
import { AuthGate } from "../../components/AuthGate";
import {
    EmptyState,
    ErrorState,
    FeedbackMessage,
    SectionHeading,
    ServiceBadge,
    SlaBadge,
    StatCard,
    StatusBadge,
} from "../../components/DashboardUI";

const statusLabels = {
    pending: "Pending",
    assigned: "Assigned",
    in_progress: "In progress",
    submitted_for_review: "Submitted for review",
    revision_requested: "Revision requested",
    completed: "Completed",
};

const serviceLabels = {
    whatsapp: "WhatsApp Business",
    instagram: "Social Media Setup",
    social: "Social Media Setup",
    zomato: "Restaurant Listing",
    restaurant: "Restaurant Listing",
    cloud_kitchen: "Cloud Kitchen Setup",
    listing: "Product Listing",
    website: "Website / Store Setup",
};

const priorityOrder = {
    assigned: 1,
    in_progress: 2,
    revision_requested: 2,
    submitted_for_review: 3,
    pending: 3,
    completed: 4,
};

function canOpenWhatsAppTool(task) {
    const status = task.status || "assigned";
    return (
        isWhatsAppServiceType(`${task.service_type || ""} ${task.title || ""}`) &&
        task.payment_status === "paid" &&
        status !== "completed" &&
        status !== "cancelled"
    );
}

function canOpenInstagramTool(task) {
    const status = task.status || "assigned";
    const normalizedService = `${task.service_type || ""} ${task.title || ""}`.toLowerCase();

    return (
        (normalizedService.includes("instagram") ||
            normalizedService.includes("social") ||
            normalizedService.includes("facebook")) &&
        task.payment_status === "paid" &&
        status !== "completed" &&
        status !== "cancelled"
    );
}

function getToolAction(task) {
    if (canOpenWhatsAppTool(task)) {
        return {
            label: "Open WhatsApp Catalog Tool",
            href: `/partner/tools/whatsapp-catalog?taskId=${task.id}`,
            available: true,
        };
    }

    if (canOpenInstagramTool(task)) {
        return {
            label: "Open Instagram Setup Tool",
            href: `/partner/tools/instagram-setup?taskId=${task.id}`,
            available: true,
        };
    }

    const normalizedService = `${task.service_type || ""} ${task.title || ""}`.toLowerCase();
    if (normalizedService.includes("listing")) {
        return { label: "Product Listing Tool Coming Soon", available: false };
    }

    if (
        normalizedService.includes("restaurant") ||
        normalizedService.includes("cloud_kitchen") ||
        normalizedService.includes("cloud kitchen") ||
        normalizedService.includes("zomato")
    ) {
        return { label: "Menu / Listing Tool Coming Soon", available: false };
    }

    return null;
}

function TaskSkeleton() {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((item) => (
                <div key={item} className="dashboard-card p-6">
                    <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-5 h-6 w-3/4 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 space-y-2">
                        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-6 h-24 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            ))}
        </div>
    );
}

function formatDate(value) {
    if (!value) return "Timestamp ready";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function formatUpdateTimestamp(task) {
    const value = task.updated_at || task.note_updated_at || task.created_at;

    if (!value) return "Timestamp ready";

    return `Updated ${formatDate(value)}`;
}

export default function WorkerDashboard() {
    const [tasks, setTasks] = useState([]);
    const [noteDrafts, setNoteDrafts] = useState({});
    const [noteMessages, setNoteMessages] = useState({});
    const [statusMessages, setStatusMessages] = useState({});
    const [statusUpdatingId, setStatusUpdatingId] = useState(null);
    const [statusUpdatingAction, setStatusUpdatingAction] = useState("");
    const [noteUpdatingId, setNoteUpdatingId] = useState(null);
    const [availability, setAvailability] = useState("available");
    const [availabilityMessage, setAvailabilityMessage] = useState({ type: "", text: "" });
    const [reviewDrafts, setReviewDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [taskError, setTaskError] = useState("");

    const sortedTasks = useMemo(
        () =>
            [...tasks].sort(
                (a, b) =>
                    (priorityOrder[a.status] || 99) - (priorityOrder[b.status] || 99)
            ),
        [tasks]
    );

    const overviewCards = useMemo(
        () => [
            {
                label: "Assigned tasks",
                value: tasks.filter((task) => task.status === "assigned" || !task.status).length,
                icon: ClipboardList,
                accent: "bg-blue-500",
            },
            {
                label: "In progress",
                value: tasks.filter((task) => task.status === "in_progress").length,
                icon: Clock3,
                accent: "bg-yellow-500",
            },
            {
                label: "In review",
                value: tasks.filter((task) => task.status === "submitted_for_review").length,
                icon: CheckCircle2,
                accent: "bg-green-500",
            },
        ],
        [tasks]
    );

    const renderProgressIndicator = (status) => {
        if (status === "completed" || status === "client_approved" || status === "auto_approved") {
            return (
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                    </span>
                    Completed with update trail
                </div>
            );
        }

        if (status === "submitted_for_review") {
            return (
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <CheckCircle2 className="h-4 w-4" />
                    </span>
                    Submitted. Waiting for client approval.
                </div>
            );
        }

        if (status === "in_progress") {
            return (
                <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-yellow-800">
                        <span>In progress</span>
                        <span>60%</span>
                    </div>
                    <div className="h-2 rounded-full bg-yellow-100">
                        <div className="h-2 w-3/5 rounded-full bg-yellow-500" />
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-sm shadow-blue-200" />
                Ready to begin
            </div>
        );
    };

    const updateNote = async (id) => {
        const note = noteDrafts[id]?.trim();

        if (!note) {
            setNoteMessages((prev) => ({
                ...prev,
                [id]: { type: "error", text: "Add a short update before sending." },
            }));
            return;
        }

        setNoteUpdatingId(id);
        setNoteMessages((prev) => ({
            ...prev,
            [id]: { type: "", text: "" },
        }));

        const { error } = await supabase
            .from("tasks")
            .update({ notes: note })
            .eq("id", id);

        if (error) {
            setNoteUpdatingId(null);
            setNoteMessages((prev) => ({
                ...prev,
                [id]: { type: "error", text: error.message || "Could not save update." },
            }));
            return;
        }

        setTasks((prev) =>
            prev.map((task) => (task.id === id ? { ...task, notes: note } : task))
        );
        setNoteDrafts((prev) => ({
            ...prev,
            [id]: "",
        }));
        setNoteMessages((prev) => ({
            ...prev,
            [id]: { type: "success", text: "Update sent successfully." },
        }));
        setNoteUpdatingId(null);
    };

    const fetchTasks = async () => {
        setTaskError("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase
            .from("users")
            .select("availability")
            .eq("id", user.id)
            .single();

        setAvailability(profile?.availability || "available");

        const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("worker_id", user.id);

        if (error) {
            setTasks([]);
            setTaskError(error.message || "Could not load your assigned tasks.");
            setLoading(false);
            return;
        }

        setTasks(data || []);
        setLoading(false);
    };

    const getAuthToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    };

    const updateAvailability = async (nextAvailability) => {
        setAvailability(nextAvailability);
        setAvailabilityMessage({ type: "", text: "" });

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase
            .from("users")
            .update({ availability: nextAvailability })
            .eq("id", user.id);

        setAvailabilityMessage({
            type: error ? "error" : "success",
            text: error ? error.message : `Availability set to ${nextAvailability}.`,
        });
    };

    const updateStatus = async (id, status) => {
        setStatusUpdatingId(id);
        setStatusUpdatingAction(status);
        setStatusMessages((prev) => ({
            ...prev,
            [id]: { type: "", text: "" },
        }));

        const token = await getAuthToken();
        const response = await fetch(`/api/tasks/${id}/action`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: status === "in_progress" ? "partner_start" : status }),
        });
        const result = await response.json();

        if (!response.ok) {
            setStatusUpdatingId(null);
            setStatusUpdatingAction("");
            setStatusMessages((prev) => ({
                ...prev,
                [id]: { type: "error", text: result.error || "Could not update task status." },
            }));
            return;
        }

        setStatusMessages((prev) => ({
            ...prev,
            [id]: { type: "success", text: `Status updated to ${statusLabels[status] || status}.` },
        }));
        await fetchTasks();
        setStatusUpdatingId(null);
        setStatusUpdatingAction("");
    };

    const setReviewDraft = (taskId, field, value) => {
        setReviewDrafts((current) => ({
            ...current,
            [taskId]: {
                output_attached: false,
                notes_added: false,
                deliverables_completed: false,
                output: "",
                notes: "",
                ...(current[taskId] || {}),
                [field]: value,
            },
        }));
        setStatusMessages((prev) => ({ ...prev, [taskId]: { type: "", text: "" } }));
    };

    const submitForReview = async (taskId) => {
        const draft = reviewDrafts[taskId] || {};
        setStatusUpdatingId(taskId);
        setStatusUpdatingAction("submitted_for_review");

        const token = await getAuthToken();
        const response = await fetch(`/api/tasks/${taskId}/action`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                action: "partner_submit",
                output: draft.output,
                notes: draft.notes,
                checklist: {
                    output_attached: Boolean(draft.output_attached),
                    notes_added: Boolean(draft.notes_added || draft.notes),
                    deliverables_completed: Boolean(draft.deliverables_completed),
                },
            }),
        });
        const result = await response.json();

        setStatusMessages((prev) => ({
            ...prev,
            [taskId]: {
                type: response.ok ? "success" : "error",
                text: response.ok ? "Submitted to client for approval." : result.error || "Could not submit for review.",
            },
        }));

        if (response.ok) await fetchTasks();
        setStatusUpdatingId(null);
        setStatusUpdatingAction("");
    };

    const retryFetchTasks = () => {
        setLoading(true);
        fetchTasks();
    };

    useEffect(() => {
        queueMicrotask(() => {
            fetchTasks();
        });
    }, []);

    return (
        <AuthGate allowedRoles="partner">
            <DashboardShell
                role="partner"
                eyebrow="Partner"
                title="My Tasks"
                description="See your tasks, send updates, and open tools quickly."
            >
                <section id="overview" className="mb-10 scroll-mt-28">
                    <SectionHeading
                        title="Today"
                        description="Check your assigned work and send updates."
                    />
                    <div className="dashboard-panel mb-5 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-950">Availability</p>
                                <p className="mt-1 text-sm text-slate-500">Auto-assignment sends new tasks only to available partners.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {["available", "busy", "unavailable"].map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => updateAvailability(option)}
                                        className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold capitalize transition ${
                                            availability === option
                                                ? "border-slate-950 bg-slate-950 text-white"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <FeedbackMessage type={availabilityMessage.type} className="mt-3">{availabilityMessage.text}</FeedbackMessage>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section id="tasks" className="scroll-mt-28">
                    <SectionHeading
                        eyebrow="Tasks"
                        icon={Sparkles}
                        title="Tasks assigned to me"
                        description="Open a task, update progress, and send a simple note."
                    />

                    {loading ? (
                        <TaskSkeleton />
                    ) : taskError ? (
                        <ErrorState title="Could not load assignments" message={taskError} onRetry={retryFetchTasks} />
                    ) : tasks.length === 0 ? (
                        <EmptyState
                            icon={Target}
                            title="No tasks assigned yet"
                            description="You are all caught up. New tasks will appear here."
                        />
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                            {sortedTasks.map((task) => {
                                const status = task.status || "assigned";
                                const noteMessage = noteMessages[task.id];
                                const statusMessage = statusMessages[task.id];
                                const isUpdatingStatus = statusUpdatingId === task.id;
                                const reviewDraft = reviewDrafts[task.id] || {};

                                return (
                                    <article
                                        key={task.id}
                                        className={`dashboard-card dashboard-card-hover overflow-hidden ${
                                            status === "assigned"
                                                ? "border-blue-200 ring-1 ring-blue-100"
                                                : status === "completed"
                                                    ? "border-slate-200 opacity-80"
                                                    : "border-slate-200"
                                        }`}
                                    >
                                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <ServiceBadge>
                                                    {serviceLabels[task.service_type] || task.service_type}
                                                </ServiceBadge>
                                                <div className="flex flex-wrap gap-2">
                                                    <StatusBadge status={status} />
                                                    <SlaBadge status={task.sla_status || "on_time"} />
                                                </div>
                                            </div>
                                            <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                                                {task.title}
                                            </h3>
                                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                                {task.description}
                                            </p>
                                        </div>

                                        <div className="space-y-5 p-6">
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                {renderProgressIndicator(status)}
                                            </div>

                                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                    <MessageSquareText className="h-4 w-4" />
                                                    Request details
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                                    {task.description || "No additional client context was provided."}
                                                </p>
                                                {canOpenWhatsAppTool(task) ? (
                                                    <p className="mt-3 text-xs font-semibold text-blue-700">
                                                        This task is ready for the WhatsApp Catalog Tool.
                                                    </p>
                                                ) : isWhatsAppServiceType(`${task.service_type || ""} ${task.title || ""}`) && task.payment_status !== "paid" ? (
                                                    <p className="mt-3 text-xs font-semibold text-amber-700">
                                                        Tool access opens after payment is marked paid.
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    Actions
                                                </p>
                                                {(() => {
                                                    const toolAction = getToolAction(task);
                                                    if (!toolAction?.available) return null;

                                                    return (
                                                        <div className="mt-3">
                                                            <Link href={toolAction.href} className="btn-secondary inline-flex">
                                                                {toolAction.label} <Wrench className="ml-2 h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(task.id, "in_progress")}
                                                        disabled={isUpdatingStatus || status === "submitted_for_review"}
                                                        className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isUpdatingStatus && statusUpdatingAction === "in_progress" ? (
                                                            <span className="inline-flex items-center justify-center gap-2">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Updating
                                                            </span>
                                                        ) : (
                                                            "Start Task"
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => submitForReview(task.id)}
                                                        disabled={isUpdatingStatus || status === "submitted_for_review"}
                                                        className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:-translate-y-0.5 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isUpdatingStatus && statusUpdatingAction === "submitted_for_review" ? (
                                                            <span className="inline-flex items-center justify-center gap-2">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Submitting
                                                            </span>
                                                        ) : (
                                                            "Submit for Review"
                                                        )}
                                                    </button>
                                                </div>
                                                {isUpdatingStatus && (
                                                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Updating status...
                                                    </p>
                                                )}
                                                <FeedbackMessage type={statusMessage?.type} className="mt-3">
                                                    {statusMessage?.text}
                                                </FeedbackMessage>
                                                {(() => {
                                                    const toolAction = getToolAction(task);
                                                    if (!toolAction) {
                                                        return (
                                                            <p className="mt-3 text-sm font-medium text-slate-500">
                                                                No tool required for this task.
                                                            </p>
                                                        );
                                                    }

                                                    if (toolAction.available) {
                                                        return null;
                                                    }

                                                    return (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="mt-3 inline-flex rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"
                                                        >
                                                            {toolAction.label}
                                                        </button>
                                                    );
                                                })()}
                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-sm font-semibold text-slate-900">Review checklist</p>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">Complete this before sending the delivery to the client.</p>
                                                    <div className="mt-3 grid gap-2">
                                                        {[
                                                            ["output_attached", "Output attached"],
                                                            ["notes_added", "Notes added"],
                                                            ["deliverables_completed", "Service-specific deliverables completed"],
                                                        ].map(([field, label]) => (
                                                            <label key={field} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(reviewDraft[field])}
                                                                    onChange={(event) => setReviewDraft(task.id, field, event.target.checked)}
                                                                    className="h-4 w-4 rounded border-slate-300"
                                                                />
                                                                {label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <input
                                                        value={reviewDraft.output || ""}
                                                        onChange={(event) => setReviewDraft(task.id, "output", event.target.value)}
                                                        className="form-field mt-3 bg-white"
                                                        placeholder="Delivery link or export note"
                                                    />
                                                    <textarea
                                                        value={reviewDraft.notes || ""}
                                                        onChange={(event) => {
                                                            setReviewDraft(task.id, "notes", event.target.value);
                                                            setReviewDraft(task.id, "notes_added", Boolean(event.target.value.trim()));
                                                        }}
                                                        className="form-field mt-3 min-h-24 bg-white"
                                                        placeholder="Final delivery notes for client/admin"
                                                    />
                                                </div>
                                            </div>

                                            <div className={`rounded-2xl border p-4 shadow-sm ${
                                                task.notes
                                                    ? "border-blue-100 bg-blue-50"
                                                    : "border-slate-200 bg-white"
                                            }`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
                                                        task.notes ? "text-blue-700" : "text-slate-400"
                                                    }`}>
                                                        <FileText className="h-4 w-4" />
                                                        Latest update
                                                    </div>
                                                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                                        {task.notes ? formatUpdateTimestamp(task) : "No update sent"}
                                                    </span>
                                                </div>
                                                {task.notes ? (
                                                    <p className="mt-3 text-sm leading-6 text-slate-700">
                                                        {task.notes}
                                                    </p>
                                                ) : (
                                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                                        No updates yet.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-800">
                                                            Send update
                                                        </label>
                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                            Share short progress updates here.
                                                        </p>
                                                    </div>
                                                    <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                        Update only
                                                    </span>
                                                </div>
                                                <p className="mt-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
                                                    Keep it short: progress, blocker, or done.
                                                </p>
                                                <textarea
                                                    placeholder="Example: Catalog images received. Starting product upload today. No blocker right now."
                                                    value={noteDrafts[task.id] || ""}
                                                    onChange={(e) => {
                                                        setNoteDrafts((prev) => ({
                                                            ...prev,
                                                            [task.id]: e.target.value,
                                                        }));
                                                        setNoteMessages((prev) => ({
                                                            ...prev,
                                                            [task.id]: { type: "", text: "" },
                                                        }));
                                                    }}
                                                    className="form-field mt-3 min-h-28 bg-white text-sm"
                                                />
                                                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                                                    <span>Timestamp support is ready for future update history.</span>
                                                    <span>{(noteDrafts[task.id] || "").length} characters</span>
                                                </div>

                                                <FeedbackMessage type={noteMessage?.type} className="mt-3">
                                                    {noteMessage?.text}
                                                </FeedbackMessage>

                                                <button
                                                    type="button"
                                                    onClick={() => updateNote(task.id)}
                                                    disabled={noteUpdatingId === task.id}
                                                    className="btn-primary mt-3 w-full"
                                                >
                                                    {noteUpdatingId === task.id ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Sending update...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Send update <Send className="ml-2 h-4 w-4" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
