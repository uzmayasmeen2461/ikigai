"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarDays,
    CheckCircle2,
    CircleDot,
    ClipboardList,
    Clock3,
    CreditCard,
    Download,
    FileText,
    Loader2,
    Plus,
    ReceiptText,
    Send,
    ShieldCheck,
    UserCheck,
    UserMinus,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { calculatePricing, formatINR } from "../lib/pricing";
import {
    buildRazorpayCheckoutOptions,
    loadRazorpayCheckout,
    reportPaymentFailure,
} from "../lib/razorpayCheckout";
import { DashboardShell } from "../../components/DashboardShell";
import { AuthGate } from "../../components/AuthGate";
import {
    DashboardPanel,
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

const serviceOptions = [
    { value: "whatsapp", label: "WhatsApp Business" },
    { value: "listing", label: "Product Listing" },
    { value: "restaurant", label: "Restaurant Listing" },
    { value: "cloud_kitchen", label: "Cloud Kitchen Setup" },
    { value: "instagram", label: "Social Media Setup" },
    { value: "website", label: "Website / Store Setup" },
];

const statusFilters = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
];

const serviceLabels = Object.fromEntries(serviceOptions.map((service) => [service.value, service.label]));

function TaskSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
                <div key={item} className="dashboard-card p-6">
                    <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-5 h-6 w-3/4 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 space-y-2">
                        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-6 flex gap-3">
                        <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                        <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatDate(value) {
    if (!value) return "Not available";

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

export default function ClientDashboard() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [service, setService] = useState("whatsapp");
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [authRequired, setAuthRequired] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [errors, setErrors] = useState({});
    const [formMessage, setFormMessage] = useState({ type: "", text: "" });
    const [taskError, setTaskError] = useState("");
    const [payingTaskId, setPayingTaskId] = useState(null);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
    const [paymentMessages, setPaymentMessages] = useState({});

    const selectedPricing = useMemo(() => calculatePricing(service), [service]);

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
        if (statusFilter === "all") return tasks;
        return tasks.filter((task) => (task.status || "pending") === statusFilter);
    }, [statusFilter, tasks]);

    const validate = () => {
        const nextErrors = {};

        if (!service) {
            nextErrors.service = "Select a service.";
        }

        if (!title.trim() || title.trim().length < 3) {
            nextErrors.title = "Add a clear title.";
        }

        if (!description.trim() || description.trim().length < 10) {
            nextErrors.description = "Describe your requirement in at least 10 characters.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const createTask = async (event) => {
        event.preventDefault();
        setFormMessage({ type: "", text: "" });

        if (!validate()) return;

        setSubmitting(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setAuthRequired(true);
            setSubmitting(false);
            setFormMessage({
                type: "error",
                text: "Please login before submitting a task.",
            });
            return;
        }

        const pricing = calculatePricing(service);
        const clientName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "IKIGAI Client";

        const { error } = await supabase.from("tasks").insert([
            {
                title: title.trim(),
                description: description.trim(),
                service_type: service,
                client_id: user.id,
                base_amount: pricing.base_amount,
                gst_percent: pricing.gst_percent,
                gst_amount: pricing.gst_amount,
                platform_fee: pricing.platform_fee,
                total_amount: pricing.total_amount,
                payment_status: "pending",
                client_email: user.email,
                client_name: clientName,
            },
        ]);

        if (error) {
            setSubmitting(false);
            setFormMessage({
                type: "error",
                text: error.message || "Could not submit task. Please try again.",
            });
            return;
        }

        setTitle("");
        setDescription("");
        setService("whatsapp");
        setErrors({});
        setFormMessage({
            type: "success",
            text: "Task submitted successfully. Review the pricing and complete payment so IKIGAI can start execution.",
        });
        setSubmitting(false);

        fetchTasks();
    };

    const fetchTasks = async () => {
        setTaskError("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setTasks([]);
            setAuthRequired(true);
            setLoading(false);
            return;
        }

        setAuthRequired(false);

        const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("client_id", user.id);

        if (error) {
            setTasks([]);
            setTaskError(error.message || "Could not load your tasks. Please try again.");
            setLoading(false);
            return;
        }

        setTasks(data || []);
        setLoading(false);
    };

    const retryFetchTasks = () => {
        setLoading(true);
        fetchTasks();
    };

    const getAuthToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    };

    const startPayment = async (task) => {
        setPayingTaskId(task.id);
        setPaymentMessages((prev) => ({
            ...prev,
            [task.id]: { type: "", text: "" },
        }));

        const scriptLoaded = await loadRazorpayCheckout();

        if (!scriptLoaded) {
            setPayingTaskId(null);
            setPaymentMessages((prev) => ({
                ...prev,
                [task.id]: { type: "error", text: "Could not load Razorpay Checkout. Please try again." },
            }));
            return;
        }

        const token = await getAuthToken();

        if (!token) {
            setPayingTaskId(null);
            setPaymentMessages((prev) => ({
                ...prev,
                [task.id]: { type: "error", text: "Please login again before payment." },
            }));
            return;
        }

        try {
            const response = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ task_id: task.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not create payment order.");
            }

            const razorpay = new window.Razorpay(buildRazorpayCheckoutOptions({
                order: data.order,
                fallbackKey: data.razorpay_key_id,
                serviceTitle: task.title,
                client: data.client,
                contact: task.client_phone || "",
                handler: async (paymentResponse) => {
                    try {
                        const verifyResponse = await fetch("/api/payments/verify", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                task_id: task.id,
                                razorpay_order_id: paymentResponse.razorpay_order_id,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyResponse.json();

                        if (!verifyResponse.ok) {
                            throw new Error(verifyData.error || "Payment verification failed.");
                        }

                        setPaymentMessages((prev) => ({
                            ...prev,
                            [task.id]: {
                                type: "success",
                                text: "Payment verified. Invoice is ready.",
                            },
                        }));
                        await fetchTasks();
                        setPayingTaskId(null);
                        router.push(`/payment/success?task_id=${task.id}`);
                    } catch (error) {
                        setPayingTaskId(null);
                        setPaymentMessages((prev) => ({
                            ...prev,
                            [task.id]: {
                                type: "error",
                                text: error.message || "Payment verification failed. Please retry.",
                            },
                        }));
                    }
                },
                onDismiss: () => {
                    setPayingTaskId(null);
                    setPaymentMessages((prev) => ({
                        ...prev,
                        [task.id]: {
                            type: "error",
                            text: "Payment was cancelled. You can retry anytime.",
                        },
                    }));
                },
            }));
            razorpay.on("payment.failed", (response) => {
                setPayingTaskId(null);
                reportPaymentFailure({
                    token,
                    taskId: task.id,
                    orderId: data.order.id,
                    reason: response.error?.description,
                });
                setPaymentMessages((prev) => ({
                    ...prev,
                    [task.id]: {
                        type: "error",
                        text: response.error?.description || "Payment failed. Please retry payment.",
                    },
                }));
            });
            razorpay.open();
        } catch (error) {
            setPayingTaskId(null);
            setPaymentMessages((prev) => ({
                ...prev,
                [task.id]: { type: "error", text: error.message || "Could not start payment." },
            }));
        }
    };

    const downloadInvoice = async (task) => {
        setDownloadingInvoiceId(task.id);

        try {
            const token = await getAuthToken();
            const response = await fetch(task.invoice_url || `/api/invoices/${task.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Could not download invoice.");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${task.invoice_number || "IKIGAI-Invoice"}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setPaymentMessages((prev) => ({
                ...prev,
                [task.id]: { type: "error", text: error.message || "Could not download invoice." },
            }));
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Workspace"
                title="Client Dashboard"
                description="Create new requests and track the progress of your active tasks."
            >
                <section id="overview" className="mb-10 scroll-mt-28">
                    <SectionHeading
                        title="Overview"
                        description="A quick snapshot of your active IKIGAI requests."
                    />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section id="create-task" className="mb-10 scroll-mt-28">
                    <form onSubmit={createTask} className="dashboard-panel">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                        <Plus className="h-3.5 w-3.5" />
                                        New request
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                                        Submit a task
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Share the service, title, and requirement. IKIGAI will structure the execution.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                    Clear inputs help us move faster.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Service
                                    </label>
                                    <select
                                        value={service}
                                        onChange={(e) => {
                                            setService(e.target.value);
                                            setErrors((prev) => ({ ...prev, service: "" }));
                                        }}
                                        className={`form-field ${errors.service ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                    >
                                        {serviceOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.service && <p className="mt-2 text-sm text-red-600">{errors.service}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Title
                                    </label>
                                    <input
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            setErrors((prev) => ({ ...prev, title: "" }));
                                        }}
                                        placeholder="Example: Setup WhatsApp catalog"
                                        className={`form-field ${errors.title ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                    />
                                    {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        setErrors((prev) => ({ ...prev, description: "" }));
                                    }}
                                    placeholder="Describe what you need, links/assets available, and any important business context."
                                    className={`form-field min-h-36 ${errors.description ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                                {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
                            </div>

                            <FeedbackMessage type={formMessage.type}>{formMessage.text}</FeedbackMessage>

                            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
                                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                    <ReceiptText className="h-4 w-4" />
                                    Pricing summary
                                </div>
                                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-2xl bg-white px-4 py-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base</p>
                                        <p className="mt-1 font-semibold text-slate-950">{formatINR(selectedPricing.base_amount)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white px-4 py-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">GST</p>
                                        <p className="mt-1 font-semibold text-slate-950">{formatINR(selectedPricing.gst_amount)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white px-4 py-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Platform fee</p>
                                        <p className="mt-1 font-semibold text-slate-950">{formatINR(selectedPricing.platform_fee)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Total</p>
                                        <p className="mt-1 font-semibold">{formatINR(selectedPricing.total_amount)}</p>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={submitting} className="btn-primary">
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit task <Send className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                <section id="tasks" className="scroll-mt-28">
                    <SectionHeading
                        title="My tasks"
                        description="Review submitted requests, status, assignment, and partner notes."
                        action={<FilterTabs filters={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
                    />

                    {loading ? (
                        <TaskSkeleton />
                    ) : taskError ? (
                        <ErrorState title="Could not load tasks" message={taskError} onRetry={retryFetchTasks} />
                    ) : authRequired ? (
                        <EmptyState
                            tone="blue"
                            title="Login required"
                            description="Please login to submit tasks and view your dashboard."
                            action={(
                                <a href="/auth" className="btn-primary mt-6">
                                Go to Login
                                </a>
                            )}
                        />
                    ) : tasks.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="No tasks yet"
                            description="Create your first IKIGAI request and track status, assignment, and updates here."
                            action={(
                                <a href="#create-task" className="btn-primary mt-6">
                                Create first task
                                </a>
                            )}
                        />
                    ) : filteredTasks.length === 0 ? (
                        <EmptyState
                            title="No tasks match this filter"
                            description="Try another status filter to view more requests."
                        />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredTasks.map((task) => {
                                const status = task.status || "pending";
                                const assigned = Boolean(task.worker_id);
                                const paymentStatus = task.payment_status || "pending";
                                const taskPricing = {
                                    base_amount: task.base_amount || calculatePricing(task.service_type).base_amount,
                                    gst_amount: task.gst_amount || calculatePricing(task.service_type).gst_amount,
                                    platform_fee: task.platform_fee || calculatePricing(task.service_type).platform_fee,
                                    total_amount: task.total_amount || calculatePricing(task.service_type).total_amount,
                                };
                                const paymentMessage = paymentMessages[task.id];

                                return (
                                    <article
                                        key={task.id}
                                        className="dashboard-card dashboard-card-hover group overflow-hidden"
                                    >
                                        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <ServiceBadge>
                                                        {serviceLabels[task.service_type] || task.service_type}
                                                    </ServiceBadge>
                                                    <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                                                        {task.title}
                                                    </h3>
                                                </div>
                                                <StatusBadge status={status} className="shrink-0" />
                                            </div>
                                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                                <PaymentStatusBadge status={paymentStatus} />
                                                {task.invoice_number && (
                                                    <span className="dashboard-badge bg-slate-100 text-slate-700 ring-slate-200">
                                                        {task.invoice_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                                                {task.description}
                                            </p>

                                            <div className="mt-5 grid gap-3 text-sm">
                                                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">
                                                    <span className="inline-flex items-center gap-2">
                                                        <CalendarDays className="h-4 w-4 text-blue-600" />
                                                        Created
                                                    </span>
                                                    <span className="font-semibold text-slate-800">
                                                        {formatDate(task.created_at)}
                                                    </span>
                                                </div>

                                                <div
                                                    className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                                                        assigned
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-slate-50 text-slate-600"
                                                    }`}
                                                >
                                                    <span className="inline-flex items-center gap-2">
                                                        {assigned ? (
                                                            <UserCheck className="h-4 w-4" />
                                                        ) : (
                                                            <UserMinus className="h-4 w-4" />
                                                        )}
                                                        Assignment
                                                    </span>
                                                    <span className="font-semibold">
                                                        {assigned ? "Assigned" : "Unassigned"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                                        Payment summary
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-950">
                                                        {formatINR(taskPricing.total_amount)}
                                                    </span>
                                                </div>
                                                <div className="mt-3 grid gap-2 text-xs text-slate-500">
                                                    <div className="flex justify-between">
                                                        <span>Base amount</span>
                                                        <span className="font-semibold text-slate-700">{formatINR(taskPricing.base_amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>GST</span>
                                                        <span className="font-semibold text-slate-700">{formatINR(taskPricing.gst_amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Platform fee</span>
                                                        <span className="font-semibold text-slate-700">{formatINR(taskPricing.platform_fee)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <FeedbackMessage type={paymentMessage?.type} className="mt-4">
                                                {paymentMessage?.text}
                                            </FeedbackMessage>

                                            <div className="mt-5 grid gap-3">
                                                {paymentStatus !== "paid" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => startPayment(task)}
                                                        disabled={payingTaskId === task.id}
                                                        className="btn-primary w-full"
                                                    >
                                                        {payingTaskId === task.id ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Opening Checkout...
                                                            </>
                                                        ) : (
                                                            <>
                                                                Pay Now <CreditCard className="ml-2 h-4 w-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadInvoice(task)}
                                                        disabled={downloadingInvoiceId === task.id}
                                                        className="btn-secondary w-full"
                                                    >
                                                        {downloadingInvoiceId === task.id ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Preparing invoice...
                                                            </>
                                                        ) : (
                                                            <>
                                                                Download Invoice <Download className="ml-2 h-4 w-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            <div className={`mt-5 rounded-2xl border p-4 ${
                                                task.notes
                                                    ? "border-blue-100 bg-blue-50"
                                                    : "border-slate-200 bg-slate-50"
                                            }`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
                                                        task.notes ? "text-blue-700" : "text-slate-400"
                                                    }`}>
                                                        <FileText className="h-4 w-4" />
                                                        Latest Update
                                                    </div>
                                                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                                        {task.notes ? formatUpdateTimestamp(task) : "Awaiting update"}
                                                    </span>
                                                </div>
                                                {task.notes ? (
                                                    <p className="mt-3 text-sm leading-6 text-slate-700">
                                                        {task.notes}
                                                    </p>
                                                ) : (
                                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                                        No updates yet. IKIGAI will show partner progress notes here when available.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section id="support" className="mt-12 scroll-mt-28">
                    <div className="ui-card">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-gray-900">
                            Support / Notes
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Partner updates and service notes appear inside each task card when available.
                        </p>
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
