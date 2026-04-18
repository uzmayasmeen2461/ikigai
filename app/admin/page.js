"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    CircleDot,
    ClipboardList,
    Clock3,
    FileText,
    GraduationCap,
    Loader2,
    ReceiptText,
    Search,
    Send,
    UserCheck,
    UserRound,
    UsersRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { calculatePricing, formatINR } from "../lib/pricing";
import { DashboardShell } from "../../components/DashboardShell";
import { AuthGate } from "../../components/AuthGate";
import {
    EmptyState,
    ErrorState,
    FeedbackMessage,
    FilterTabs,
    PaymentStatusBadge,
    SectionHeading,
    ServiceBadge,
    StatCard,
    StatusBadge,
} from "../../components/DashboardUI";

const statusFilters = [
    { value: "all", label: "All" },
    { value: "unpaid", label: "Unpaid" },
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
];

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

function formatDate(value) {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function AdminSkeleton() {
    return (
        <div className="dashboard-panel">
            {[1, 2, 3].map((item) => (
                <div key={item} className="border-b border-slate-100 p-6 last:border-b-0">
                    <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 h-6 w-2/3 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Admin() {
    const [tasks, setTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [assignmentDrafts, setAssignmentDrafts] = useState({});
    const [assigningTaskId, setAssigningTaskId] = useState(null);
    const [assignmentMessages, setAssignmentMessages] = useState({});
    const [taskError, setTaskError] = useState("");
    const [partnerError, setPartnerError] = useState("");

    const overviewCards = useMemo(
        () => [
            {
                label: "Total tasks",
                value: tasks.length,
                icon: ClipboardList,
                accent: "bg-slate-950",
            },
            {
                label: "Pending",
                value: tasks.filter((task) => (task.status || "pending") === "pending").length,
                icon: CircleDot,
                accent: "bg-gray-400",
            },
            {
                label: "Assigned",
                value: tasks.filter((task) => task.status === "assigned").length,
                icon: UserCheck,
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
        ],
        [tasks]
    );

    const filteredTasks = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const status = task.status || "pending";
            const paymentStatus = task.payment_status || "pending";
            const matchesStatus =
                statusFilter === "all" ||
                status === statusFilter ||
                (statusFilter === "paid" && paymentStatus === "paid") ||
                (statusFilter === "unpaid" && paymentStatus !== "paid");
            const partnerName = workers.find((worker) => worker.id === task.worker_id)?.name || "";
            const haystack = [
                task.title,
                task.description,
                task.client_id,
                task.service_type,
                serviceLabels[task.service_type],
                partnerName,
                task.notes,
                task.payment_status,
                task.payment_order_id,
                task.payment_id,
                task.invoice_number,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return matchesStatus && (!normalizedSearch || haystack.includes(normalizedSearch));
        });
    }, [search, statusFilter, tasks, workers]);

    const partnerStats = useMemo(
        () =>
            workers.map((worker) => ({
                ...worker,
                assignedCount: tasks.filter((task) => task.worker_id === worker.id).length,
            })),
        [tasks, workers]
    );

    const getWorkerName = (workerId) => {
        const worker = workers.find((item) => item.id === workerId);
        return worker?.name || "Unassigned";
    };

    const fetchTasks = async () => {
        setTaskError("");

        const { data, error } = await supabase.from("tasks").select("*");

        if (error) {
            setTasks([]);
            setTaskError(error.message || "Could not load tasks. Please try again.");
            setLoading(false);
            return;
        }

        setTasks(data || []);
        setLoading(false);
    };

    const fetchWorkers = async () => {
        setPartnerError("");

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("role", "worker");

        if (error) {
            setWorkers([]);
            setPartnerError(error.message || "Could not load IKIGAI partners.");
            return;
        }

        setWorkers(data || []);
    };

    const assignTask = async (taskId) => {
        const task = tasks.find((item) => item.id === taskId);
        const workerId = assignmentDrafts[taskId];

        if ((task?.payment_status || "pending") !== "paid") {
            setAssignmentMessages((prev) => ({
                ...prev,
                [taskId]: { type: "error", text: "Collect payment before assigning this task." },
            }));
            return;
        }

        if (!workerId) {
            setAssignmentMessages((prev) => ({
                ...prev,
                [taskId]: { type: "error", text: "Select an IKIGAI partner first." },
            }));
            return;
        }

        setAssigningTaskId(taskId);
        setAssignmentMessages((prev) => ({
            ...prev,
            [taskId]: { type: "", text: "" },
        }));

        const { error } = await supabase
            .from("tasks")
            .update({
                worker_id: workerId,
                status: "assigned",
            })
            .eq("id", taskId);

        if (error) {
            setAssigningTaskId(null);
            setAssignmentMessages((prev) => ({
                ...prev,
                [taskId]: { type: "error", text: error.message || "Could not assign partner." },
            }));
            return;
        }

        setAssignmentMessages((prev) => ({
            ...prev,
            [taskId]: { type: "success", text: "Partner assigned successfully." },
        }));
        setAssigningTaskId(null);
        fetchTasks();
    };

    const retryFetchTasks = () => {
        setLoading(true);
        fetchTasks();
    };

    useEffect(() => {
        const loadDashboard = async () => {
            await fetchTasks();
            await fetchWorkers();
        };

        loadDashboard();
    }, []);

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell
                role="admin"
                eyebrow="Operations"
                title="Admin Dashboard"
                description="Review incoming work, read partner updates, and assign tasks to available IKIGAI partners."
            >
                <section id="overview" className="mb-10 scroll-mt-28">
                    <SectionHeading
                        title="Operations overview"
                        description="A live snapshot of requests moving through IKIGAI."
                    />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section className="mb-8 grid gap-4 lg:grid-cols-4">
                    {[
                        { label: "Tasks", href: "#tasks", icon: ClipboardList },
                        { label: "Partners", href: "#partners", icon: UsersRound },
                        { label: "Clients", href: "#clients", icon: BriefcaseBusiness },
                        { label: "Trainings", href: "#trainings", icon: GraduationCap },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-lg hover:shadow-blue-100/50"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                    <Icon className="h-5 w-5" />
                                </span>
                                {item.label}
                            </a>
                        );
                    })}
                </section>

                <section id="tasks" className="scroll-mt-28">
                    <div className="dashboard-panel mb-6">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div>
                                    <div className="dashboard-eyebrow">
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        Task management
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                                        Control center
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Search, filter, review notes, and assign requests to IKIGAI partners.
                                    </p>
                                </div>

                                <div className="grid gap-3 lg:min-w-[560px]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search by title, client, service, partner, or note"
                                            className="form-field pl-12"
                                        />
                                    </div>

                                    <FilterTabs filters={statusFilters} value={statusFilter} onChange={setStatusFilter} />
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-6">
                                <AdminSkeleton />
                            </div>
                        ) : taskError ? (
                            <div className="p-6">
                                <ErrorState title="Could not load tasks" message={taskError} onRetry={retryFetchTasks} />
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="p-6">
                                <EmptyState title="No tasks yet" description="New client requests will appear here." />
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="p-6">
                                <EmptyState title="No matching tasks" description="Try another status or search keyword." />
                            </div>
                        ) : (
                            <div>
                                <div className="hidden grid-cols-[1.2fr_0.75fr_0.8fr_0.8fr_0.85fr_1.15fr] gap-5 border-b border-slate-100 bg-slate-50/80 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400 xl:grid">
                                    <p>Task</p>
                                    <p>Client</p>
                                    <p>Status</p>
                                    <p>Payment</p>
                                    <p>Partner</p>
                                    <p>Assignment</p>
                                </div>

                                {filteredTasks.map((task) => {
                                    const status = task.status || "pending";
                                    const paymentStatus = task.payment_status || "pending";
                                    const selectedPartner = assignmentDrafts[task.id] ?? task.worker_id ?? "";
                                    const message = assignmentMessages[task.id];
                                    const pricing = calculatePricing(task.service_type);
                                    const totalAmount = task.total_amount || pricing.total_amount;
                                    const canAssign = paymentStatus === "paid";

                                    return (
                                        <article
                                            key={task.id}
                                            className="grid gap-5 border-b border-slate-100 p-6 last:border-b-0 transition hover:bg-slate-50/60 xl:grid-cols-[1.2fr_0.75fr_0.8fr_0.8fr_0.85fr_1.15fr] xl:items-start"
                                        >
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Task
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <ServiceBadge>
                                                        {serviceLabels[task.service_type] || task.service_type}
                                                    </ServiceBadge>
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        {formatDate(task.created_at)}
                                                    </span>
                                                </div>
                                                <h3 className="mt-3 text-base font-semibold text-slate-950">
                                                    {task.title}
                                                </h3>
                                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                                    {task.description}
                                                </p>
                                                <div className={`mt-4 rounded-2xl border p-4 ${
                                                    task.notes
                                                        ? "border-blue-100 bg-blue-50"
                                                        : "border-slate-200 bg-slate-50"
                                                }`}>
                                                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
                                                        task.notes ? "text-blue-700" : "text-slate-400"
                                                    }`}>
                                                            <FileText className="h-4 w-4" />
                                                            Latest Update
                                                    </div>
                                                    {task.notes ? (
                                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                                                            {task.notes}
                                                        </p>
                                                    ) : (
                                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                                            No updates yet
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                            <ReceiptText className="h-4 w-4 text-blue-600" />
                                                            Payment
                                                        </span>
                                                        <span className="text-sm font-semibold text-slate-950">
                                                            {formatINR(totalAmount)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                                                        <p className="break-all">Order: {task.payment_order_id || "Not created"}</p>
                                                        <p className="break-all">Payment: {task.payment_id || "Not paid"}</p>
                                                        <p>Invoice: {task.invoice_number || "Pending"}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Client
                                                </p>
                                                <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-3 xl:mt-0">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        Client ID
                                                    </p>
                                                    <p className="mt-1 break-all text-sm font-medium text-slate-700">
                                                        {task.client_id || "Not available"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Status
                                                </p>
                                                <StatusBadge status={status} className="mt-2 xl:mt-0" />
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Payment
                                                </p>
                                                <div className="mt-2 space-y-2 xl:mt-0">
                                                    <PaymentStatusBadge status={paymentStatus} />
                                                    <p className="text-sm font-semibold text-slate-950">
                                                        {formatINR(totalAmount)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Partner
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-slate-950 xl:mt-0">
                                                    {getWorkerName(task.worker_id)}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    Assign partner
                                                </label>
                                                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
                                                    <select
                                                        value={selectedPartner}
                                                        onChange={(e) => {
                                                            setAssignmentDrafts((prev) => ({
                                                                ...prev,
                                                                [task.id]: e.target.value,
                                                            }));
                                                            setAssignmentMessages((prev) => ({
                                                                ...prev,
                                                                [task.id]: { type: "", text: "" },
                                                            }));
                                                        }}
                                                        className="form-field px-4 py-3 text-sm font-medium"
                                                    >
                                                        <option value="">Select IKIGAI Partner</option>
                                                        {workers.map((worker) => (
                                                            <option key={worker.id} value={worker.id}>
                                                                {worker.name || worker.email || "IKIGAI Partner"}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => assignTask(task.id)}
                                                        disabled={assigningTaskId === task.id || !canAssign}
                                                        className="btn-primary px-4 py-3 text-sm"
                                                    >
                                                        {assigningTaskId === task.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                Assign <Send className="ml-2 h-4 w-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                {!canAssign && (
                                                    <p className="mt-2 text-xs font-medium text-amber-700">
                                                        Ready for assignment after payment.
                                                    </p>
                                                )}
                                                <FeedbackMessage type={message?.type} className="mt-2 py-2 text-xs">
                                                    {message?.text}
                                                </FeedbackMessage>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <section className="mt-12 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div id="partners" className="dashboard-panel scroll-mt-28 p-6">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                                    Partners
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Basic partner availability and assignment visibility.
                                </p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                                {workers.length} partners
                            </span>
                        </div>

                        {partnerError ? (
                            <ErrorState title="Could not load partners" message={partnerError} onRetry={fetchWorkers} />
                        ) : workers.length === 0 ? (
                            <EmptyState title="No partners yet" description="Approved IKIGAI partners will appear here." />
                        ) : (
                            <div className="grid gap-4">
                                {partnerStats.map((partner) => (
                                    <div key={partner.id} className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-950">
                                                    {partner.name || partner.email || "IKIGAI Partner"}
                                                </p>
                                                <p className="text-sm text-slate-500">{partner.email || "No email available"}</p>
                                            </div>
                                        </div>
                                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                            Availability: Placeholder
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                            {partner.assignedCount} assigned
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6">
                        <div id="clients" className="dashboard-panel scroll-mt-28 p-6">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                    <BriefcaseBusiness className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">Clients</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Client controls can be expanded here as the product grows.
                                    </p>
                                </div>
                            </div>
                            <EmptyState className="mt-6 p-6" title="No client list yet" description="Client management will appear here once the client directory is connected." />
                        </div>

                        <div id="trainings" className="dashboard-panel scroll-mt-28 p-6">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                    <GraduationCap className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-950">Trainings</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Training resources for IKIGAI partners can be organized here.
                                    </p>
                                </div>
                            </div>
                            <EmptyState className="mt-6 p-6" title="No training controls yet" description="Training management can be added here when admin training tools are ready." />
                        </div>
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
