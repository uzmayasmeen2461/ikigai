"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    CheckCircle2,
    CircleDot,
    ClipboardList,
    Clock3,
    FileText,
    Loader2,
    ReceiptText,
    Search,
    Send,
    Trash2,
    UserCheck,
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

function getBusinessName(task) {
    return (
        task.client_business_name ||
        task.business_name ||
        task.client_name ||
        task.title ||
        "Business name not added"
    );
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
    const [deletingTaskId, setDeletingTaskId] = useState(null);
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
            .in("role", ["worker", "partner"]);

        if (error) {
            setWorkers([]);
            setPartnerError(error.message || "Could not load ikigaidigital partners.");
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
                [taskId]: { type: "error", text: "Select an ikigaidigital partner first." },
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

    const deleteTask = async (taskId) => {
        setDeletingTaskId(taskId);
        setAssignmentMessages((prev) => ({
            ...prev,
            [taskId]: { type: "", text: "" },
        }));

        const { error } = await supabase.from("tasks").delete().eq("id", taskId);

        if (error) {
            setDeletingTaskId(null);
            setAssignmentMessages((prev) => ({
                ...prev,
                [taskId]: { type: "error", text: error.message || "Could not delete this order." },
            }));
            return;
        }

        setTasks((current) => current.filter((task) => task.id !== taskId));
        setDeletingTaskId(null);
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
                eyebrow="Admin"
                title="Orders"
                description="See orders, payments, and partner assignment in one place."
            >
                <section id="overview" className="mb-10 scroll-mt-28">
                    <SectionHeading
                        title="Overview"
                        description="A quick view of orders and payments."
                    />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section id="tasks" className="scroll-mt-28">
                    <div className="dashboard-panel mb-6">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div>
                                    <div className="dashboard-eyebrow">
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        Orders
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                                        Manage orders
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Search, check payment, and assign work.
                                    </p>
                                </div>

                                <div className="grid gap-3 lg:min-w-[560px]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search orders"
                                            className="form-field pl-12"
                                        />
                                    </div>

                                    <FilterTabs filters={statusFilters} value={statusFilter} onChange={setStatusFilter} />
                                </div>
                            </div>
                        </div>

                        {partnerError ? (
                            <div className="border-b border-slate-100 px-6 py-4">
                                <FeedbackMessage type="error">
                                    {partnerError}
                                </FeedbackMessage>
                            </div>
                        ) : null}

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
                                <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(320px,1fr)] gap-6 border-b border-slate-100 bg-slate-50/80 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400 xl:grid">
                                    <p>Order</p>
                                    <p>Client</p>
                                    <p>Status & Payment</p>
                                    <p>Assignment</p>
                                </div>

                                <div className="space-y-4 bg-slate-50/40 p-4 sm:p-6">
                                    {filteredTasks.map((task) => {
                                        const status = task.status || "pending";
                                        const paymentStatus = task.payment_status || "pending";
                                        const selectedPartner = assignmentDrafts[task.id] ?? task.worker_id ?? "";
                                        const message = assignmentMessages[task.id];
                                        const pricing = calculatePricing(task.service_type);
                                        const totalAmount = task.total_amount || pricing.total_amount;
                                        const canAssign = paymentStatus === "paid";
                                        const isDeletingTask = deletingTaskId === task.id;
                                        const isAlreadyAssigned = Boolean(task.worker_id);

                                        return (
                                            <article
                                                key={task.id}
                                                className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 transition hover:border-blue-200 hover:shadow-md hover:shadow-slate-200/70 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(320px,1fr)] xl:items-start"
                                            >
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Order
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
                                                <div className="mt-4 grid gap-4 2xl:grid-cols-2">
                                                    <div className={`rounded-2xl border p-4 ${
                                                        task.notes
                                                            ? "border-blue-100 bg-blue-50"
                                                            : "border-slate-200 bg-slate-50"
                                                    }`}>
                                                        <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
                                                            task.notes ? "text-blue-700" : "text-slate-400"
                                                        }`}>
                                                            <FileText className="h-4 w-4" />
                                                            Latest update
                                                        </div>
                                                        {task.notes ? (
                                                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">
                                                                {task.notes}
                                                            </p>
                                                        ) : (
                                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                                No updates yet
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                                <ReceiptText className="h-4 w-4 text-blue-600" />
                                                                Payment refs
                                                            </span>
                                                            <span className="text-base font-semibold text-slate-950">
                                                                {formatINR(totalAmount)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 space-y-2 text-xs text-slate-500">
                                                            <p className="truncate">Order: {task.payment_order_id || "Not created"}</p>
                                                            <p className="truncate">Payment: {task.payment_id || "Not paid"}</p>
                                                            <p className="truncate">Invoice: {task.invoice_number || "Pending"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/admin/orders/${task.id}`}
                                                    className="btn-secondary mt-4 inline-flex px-4 py-2.5"
                                                >
                                                    View Details
                                                </Link>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Client
                                                </p>
                                                <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-3 xl:mt-0">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Business name</p>
                                                    <p className="mt-2 break-words text-base font-semibold leading-6 text-slate-950">
                                                        {getBusinessName(task)}
                                                    </p>
                                                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Client ID</p>
                                                    <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-700">
                                                        {task.client_id || "Not available"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                                                    Status & Payment
                                                </p>
                                                <div className="mt-2 space-y-3 xl:mt-0">
                                                    <StatusBadge status={status} />
                                                    <PaymentStatusBadge status={paymentStatus} />
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</p>
                                                        <p className="mt-1 text-lg font-semibold text-slate-950">
                                                            {formatINR(totalAmount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    Assign work
                                                </label>
                                                <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-4">
                                                    <div className="mb-3">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                            Current partner
                                                        </p>
                                                        <p className="mt-1 text-sm font-semibold text-slate-950">
                                                            {getWorkerName(task.worker_id)}
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
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
                                                        <option value="">Select partner</option>
                                                        {workers.filter((worker) => (worker.availability || "available") === "available").map((worker) => (
                                                            <option key={worker.id} value={worker.id}>
                                                                {worker.name || worker.email || "ikigaidigital Partner"}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => assignTask(task.id)}
                                                        disabled={assigningTaskId === task.id || !canAssign || isDeletingTask || isAlreadyAssigned}
                                                        className="btn-primary px-4 py-3 text-sm"
                                                    >
                                                        {assigningTaskId === task.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : isAlreadyAssigned ? (
                                                            "Assigned"
                                                        ) : (
                                                            <>
                                                                Assign <Send className="ml-2 h-4 w-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteTask(task.id)}
                                                        disabled={assigningTaskId === task.id || isDeletingTask}
                                                        className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {isDeletingTask ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Deleting order...
                                                            </>
                                                        ) : (
                                                            <>
                                                                Delete Order <Trash2 className="ml-2 h-4 w-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                {!canAssign && (
                                                    <p className="mt-2 text-xs font-medium text-amber-700">
                                                        Wait for payment before assigning.
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
                            </div>
                        )}
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
