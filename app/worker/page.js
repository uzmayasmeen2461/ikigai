"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BookOpenCheck,
    CheckCircle2,
    CircleDot,
    Clock3,
    ClipboardList,
    ExternalLink,
    FileText,
    Loader2,
    MessageSquareText,
    PlayCircle,
    Send,
    Sparkles,
    Target,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { DashboardShell } from "../../components/DashboardShell";
import { AuthGate } from "../../components/AuthGate";
import {
    EmptyState,
    ErrorState,
    FeedbackMessage,
    FilterTabs,
    SectionHeading,
    ServiceBadge,
    StatCard,
    StatusBadge,
} from "../../components/DashboardUI";

const statusLabels = {
    pending: "Pending",
    assigned: "Assigned",
    in_progress: "In progress",
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
    pending: 3,
    completed: 4,
};

const trainingFilters = [
    { value: "all", label: "All" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "instagram", label: "Instagram" },
    { value: "restaurant", label: "Restaurant" },
    { value: "website", label: "Website" },
    { value: "ads", label: "Ads" },
    { value: "general", label: "General" },
];

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
    const [trainings, setTrainings] = useState([]);
    const [noteDrafts, setNoteDrafts] = useState({});
    const [noteMessages, setNoteMessages] = useState({});
    const [statusMessages, setStatusMessages] = useState({});
    const [statusUpdatingId, setStatusUpdatingId] = useState(null);
    const [statusUpdatingAction, setStatusUpdatingAction] = useState("");
    const [noteUpdatingId, setNoteUpdatingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trainingLoading, setTrainingLoading] = useState(true);
    const [taskError, setTaskError] = useState("");
    const [trainingError, setTrainingError] = useState("");
    const [trainingFilter, setTrainingFilter] = useState("all");

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
                label: "Completed",
                value: tasks.filter((task) => task.status === "completed").length,
                icon: CheckCircle2,
                accent: "bg-green-500",
            },
            {
                label: "Training resources",
                value: trainings.length,
                icon: BookOpenCheck,
                accent: "bg-slate-950",
            },
        ],
        [tasks, trainings]
    );

    const trainingCategoriesCount = useMemo(() => {
        const categories = new Set(
            trainings.map((training) => (training.category || "general").toLowerCase())
        );

        return categories.size;
    }, [trainings]);

    const filteredTrainings = useMemo(() => {
        if (trainingFilter === "all") return trainings;

        return trainings.filter(
            (training) => (training.category || "general").toLowerCase() === trainingFilter
        );
    }, [trainingFilter, trainings]);

    const renderProgressIndicator = (status) => {
        if (status === "completed") {
            return (
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                    </span>
                    Completed with update trail
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

    const fetchTrainings = async () => {
        setTrainingLoading(true);
        setTrainingError("");

        const { data, error } = await supabase.from("trainings").select("*");

        if (error) {
            setTrainings([]);
            setTrainingError(error.message || "Could not load training resources.");
            setTrainingLoading(false);
            return;
        }

        setTrainings(data || []);
        setTrainingLoading(false);
    };

    const updateStatus = async (id, status) => {
        setStatusUpdatingId(id);
        setStatusUpdatingAction(status);
        setStatusMessages((prev) => ({
            ...prev,
            [id]: { type: "", text: "" },
        }));

        const { error } = await supabase.from("tasks").update({ status }).eq("id", id);

        if (error) {
            setStatusUpdatingId(null);
            setStatusUpdatingAction("");
            setStatusMessages((prev) => ({
                ...prev,
                [id]: { type: "error", text: error.message || "Could not update task status." },
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

    const retryFetchTasks = () => {
        setLoading(true);
        fetchTasks();
    };

    useEffect(() => {
        const loadDashboard = async () => {
            await fetchTasks();
            await fetchTrainings();
        };

        loadDashboard();
    }, []);

    return (
        <AuthGate allowedRoles="partner">
            <DashboardShell
                role="partner"
                eyebrow="Workboard"
                title="IKIGAI Partner Dashboard"
                description="Start assigned tasks, mark work complete, and keep client updates clearly documented."
            >
                <section id="overview" className="mb-10 scroll-mt-28">
                    <SectionHeading
                        title="Today’s workboard"
                        description="A calm view of your assigned work, progress, and learning resources."
                    />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section id="tasks" className="scroll-mt-28">
                    <SectionHeading
                        eyebrow="Assigned work"
                        icon={Sparkles}
                        title="Tasks assigned to you"
                        description="Review the requirement, update status, and send clear progress notes."
                    />

                    {loading ? (
                        <TaskSkeleton />
                    ) : taskError ? (
                        <ErrorState title="Could not load assignments" message={taskError} onRetry={retryFetchTasks} />
                    ) : tasks.length === 0 ? (
                        <EmptyState
                            icon={Target}
                            title="No tasks assigned yet"
                            description="You are all caught up. New assignments will appear here when IKIGAI matches work to your availability."
                        />
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2">
                            {sortedTasks.map((task) => {
                                const status = task.status || "assigned";
                                const noteMessage = noteMessages[task.id];
                                const statusMessage = statusMessages[task.id];
                                const isUpdatingStatus = statusUpdatingId === task.id;

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
                                                <StatusBadge status={status} />
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
                                                    Client context
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                                    {task.description || "No additional client context was provided."}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    Task actions
                                                </p>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(task.id, "assigned")}
                                                        disabled={isUpdatingStatus}
                                                        className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isUpdatingStatus && statusUpdatingAction === "assigned" ? (
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
                                                        onClick={() => updateStatus(task.id, "in_progress")}
                                                        disabled={isUpdatingStatus}
                                                        className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800 transition hover:-translate-y-0.5 hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isUpdatingStatus && statusUpdatingAction === "in_progress" ? (
                                                            <span className="inline-flex items-center justify-center gap-2">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Updating
                                                            </span>
                                                        ) : (
                                                            "Mark In Progress"
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(task.id, "completed")}
                                                        disabled={isUpdatingStatus}
                                                        className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 transition hover:-translate-y-0.5 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isUpdatingStatus && statusUpdatingAction === "completed" ? (
                                                            <span className="inline-flex items-center justify-center gap-2">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Updating
                                                            </span>
                                                        ) : (
                                                            "Mark Complete"
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
                                                        Latest Update
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
                                                        No updates yet. Send a concise status update when there is progress, a blocker, or a completion note.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-800">
                                                            Send update to IKIGAI / Client
                                                        </label>
                                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                                            Use this for status updates only: progress made, information needed, blockers, or completion notes.
                                                        </p>
                                                    </div>
                                                    <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                        Not a chat
                                                    </span>
                                                </div>
                                                <p className="mt-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
                                                    Suggested format: what changed, what you need next, and whether the task is blocked or moving.
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

                <section id="training" className="mt-12 scroll-mt-28">
                    <div className="dashboard-panel">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white">
                            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                                        <BookOpenCheck className="h-3.5 w-3.5" />
                                        Learning center
                                    </div>
                                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                                        Training resources
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                        Complete trainings to be better prepared for assigned tasks. Use these short resources as quick refreshers before starting new service types.
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                                        <p className="text-3xl font-semibold">{trainings.length}</p>
                                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                                            Total resources
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                                        <p className="text-3xl font-semibold">{trainingCategoriesCount}</p>
                                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                                            Categories
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mb-6">
                                <FilterTabs filters={trainingFilters} value={trainingFilter} onChange={setTrainingFilter} />
                            </div>

                            {trainingLoading ? (
                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {[1, 2, 3].map((item) => (
                                        <div key={item} className="dashboard-card p-6">
                                            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
                                            <div className="mt-5 h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                                            <div className="mt-4 h-6 w-3/4 animate-pulse rounded-full bg-slate-100" />
                                            <div className="mt-3 space-y-2">
                                                <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
                                                <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
                                            </div>
                                            <div className="mt-6 h-11 animate-pulse rounded-2xl bg-slate-100" />
                                        </div>
                                    ))}
                                </div>
                            ) : trainingError ? (
                                <ErrorState title="Could not load trainings" message={trainingError} onRetry={fetchTrainings} />
                            ) : trainings.length === 0 ? (
                                <EmptyState
                                    icon={PlayCircle}
                                    title="No training yet"
                                    description="Training resources will appear here when IKIGAI adds them to your workspace."
                                    className="bg-slate-50"
                                />
                            ) : filteredTrainings.length === 0 ? (
                                <EmptyState
                                    title="No resources in this category"
                                    description="Try another category or switch back to all trainings."
                                    className="bg-slate-50"
                                />
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredTrainings.map((training) => (
                                        <article
                                            key={training.id}
                                            className="dashboard-card dashboard-card-hover group relative overflow-hidden bg-gradient-to-b from-white to-slate-50 p-6"
                                        >
                                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
                                            <div className="flex items-start gap-4">
                                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/60">
                                                    <PlayCircle className="h-6 w-6" />
                                                </span>
                                                <div>
                                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                                                        {training.category || "general"}
                                                    </span>
                                                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                                                        {training.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                                        Quick micro-learning resource to help you understand expectations before starting related tasks.
                                                    </p>
                                                </div>
                                            </div>

                                            <a
                                                href={training.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn-primary mt-6 w-full"
                                            >
                                                Open Training <ExternalLink className="ml-2 h-4 w-4" />
                                            </a>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section id="updates" className="mt-12 scroll-mt-28">
                    <div className="dashboard-panel p-6">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                            Updates
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Use task cards to send concise updates that help IKIGAI and clients understand progress clearly.
                        </p>
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
