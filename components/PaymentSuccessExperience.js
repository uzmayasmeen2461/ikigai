"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    CircleCheck,
    Clock3,
    Download,
    FileText,
    HelpCircle,
    Loader2,
    MailCheck,
    ReceiptText,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { formatINR, getServicePricing } from "../app/lib/pricing";
import { AuthGate } from "./AuthGate";

function formatDate(value) {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function SuccessSkeleton() {
    return (
        <main className="min-h-screen bg-[#f6f7fb] px-6 py-10">
            <div className="mx-auto max-w-[1180px]">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
                    <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="mt-6 h-10 w-2/3 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 h-5 w-1/2 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="h-80 animate-pulse rounded-3xl bg-white shadow-lg shadow-slate-200/50" />
                    <div className="h-80 animate-pulse rounded-3xl bg-white shadow-lg shadow-slate-200/50" />
                </div>
            </div>
        </main>
    );
}

function SuccessHero({ task }) {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-200/60 md:p-10">
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-20 -translate-y-24 rounded-full bg-blue-100/80 blur-3xl" />
            <div className="absolute left-16 top-0 h-px w-72 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
            <div className="relative">
                <div className="animate-scale-in flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <CheckCircle2 className="h-9 w-9" />
                </div>
                <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    <ShieldCheck className="h-4 w-4" />
                    Secure payment processed successfully
                </p>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-slate-950 md:text-6xl">
                    Your Payment Has Been Confirmed
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 md:text-lg">
                    Thank you for choosing IKIGAI. Your task is now being prepared for managed execution.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount paid</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{formatINR(task.total_amount)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice number</p>
                        <p className="mt-2 break-all text-lg font-semibold text-slate-950">{task.invoice_number || "Preparing"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment date</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(task.paid_at)}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function OrderSummary({ task }) {
    const service = getServicePricing(task.service_type);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <ReceiptText className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Order Summary</h2>
                    <p className="mt-1 text-sm text-slate-500">A clear breakup of the task you paid for.</p>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{service.label}</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{task.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                    {task.description || "Digital service task"}
                </p>
            </div>

            <div className="mt-6 space-y-3 text-sm">
                {[
                    ["Base amount", task.base_amount],
                    [`GST (${task.gst_percent || 18}%)`, task.gst_amount],
                    ["Platform fee", task.platform_fee],
                ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-slate-950">{formatINR(value)}</span>
                    </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-4 text-white">
                    <span className="font-semibold">Total paid</span>
                    <span className="text-xl font-semibold">{formatINR(task.total_amount)}</span>
                </div>
            </div>
        </section>
    );
}

function NextSteps() {
    const steps = [
        ["Payment received", "Your Razorpay payment was verified securely."],
        ["IKIGAI reviews your request", "We structure your task into clear execution steps."],
        ["Task assigned to the right partner", "A trained IKIGAI Partner begins managed execution."],
        ["Track progress in your dashboard", "Follow status, notes, and completion updates anytime."],
    ];

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Sparkles className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">What happens next</h2>
                    <p className="mt-1 text-sm text-slate-500">A calm, managed flow from payment to completion.</p>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                {steps.map(([title, description], index) => (
                    <div key={title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                            {index + 1}
                        </span>
                        <div>
                            <h3 className="font-semibold text-slate-950">{title}</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function InvoiceCard({ task, onDownload, downloading }) {
    const invoiceReady = Boolean(task.invoice_number);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <FileText className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Invoice</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {invoiceReady ? "Your invoice is ready and has been emailed." : "Your invoice is being prepared."}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">Invoice number</span>
                    <span className="break-all text-sm font-semibold text-slate-950">{task.invoice_number || "Preparing"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">Generated</span>
                    <span className="text-sm font-semibold text-slate-950">{formatDate(task.paid_at)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <CircleCheck className="h-4 w-4" />
                        Status
                    </span>
                    <span className="text-sm font-semibold">{invoiceReady ? "Ready" : "Preparing"}</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                    <MailCheck className="h-4 w-4" />
                    Invoice sent to your email
                </div>
            </div>

            <button
                type="button"
                onClick={onDownload}
                disabled={!invoiceReady || downloading}
                className="btn-primary mt-6 w-full"
            >
                {downloading ? (
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
        </section>
    );
}

function SupportCard() {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
            <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-700">
                    <HelpCircle className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-lg font-semibold text-slate-950">Need help with your request?</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Contact IKIGAI support and we’ll help you with invoice, payment, or task updates.
                    </p>
                    <a href="mailto:support@ikigai.example" className="mt-3 inline-flex text-sm font-semibold text-blue-700">
                        support@ikigai.example
                    </a>
                </div>
            </div>
        </section>
    );
}

function ErrorState({ message }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                    <Clock3 className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    Payment details unavailable
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
                <Link href="/dashboard" className="btn-primary mt-6">
                    Return to Dashboard
                </Link>
            </div>
        </main>
    );
}

export function PaymentSuccessExperience() {
    const searchParams = useSearchParams();
    const taskId = searchParams.get("task_id");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (taskId) params.set("task_id", taskId);
        return params.toString();
    }, [taskId]);

    const getToken = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        return sessionData.session?.access_token || "";
    };

    useEffect(() => {
        let isMounted = true;

        const loadPayment = async () => {
            setLoading(true);
            setError("");

            const token = await getToken();

            if (!token) {
                setError("Please login again to view your payment confirmation.");
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/payments/success${queryString ? `?${queryString}` : ""}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const payload = await response.json();

            if (!isMounted) return;

            if (!response.ok) {
                setError(payload.error || "Could not load payment confirmation.");
                setLoading(false);
                return;
            }

            setData(payload);
            setLoading(false);
        };

        loadPayment();

        return () => {
            isMounted = false;
        };
    }, [queryString]);

    const downloadInvoice = async () => {
        if (!data?.task) return;

        setDownloading(true);

        try {
            const token = await getToken();
            const response = await fetch(data.task.invoice_url || `/api/invoices/${data.task.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const payload = await response.json();
                throw new Error(payload.error || "Could not download invoice.");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${data.task.invoice_number || "IKIGAI-Invoice"}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (downloadError) {
            setError(downloadError.message || "Could not download invoice.");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <SuccessSkeleton />;
    if (error || !data?.task) return <ErrorState message={error || "We could not find this payment."} />;

    const { task } = data;

    return (
        <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 sm:px-6 lg:py-10">
            <div className="mx-auto max-w-[1180px] animate-fade-up">
                <SuccessHero task={task} />

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                    <OrderSummary task={task} />
                    <InvoiceCard task={task} onDownload={downloadInvoice} downloading={downloading} />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <NextSteps />
                    <div className="grid gap-6">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Continue from here</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                You can track progress anytime from your IKIGAI dashboard or create another service request.
                            </p>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <Link href="/dashboard" className="btn-primary w-full">
                                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                                <button type="button" onClick={downloadInvoice} className="btn-secondary w-full">
                                    Download Invoice <Download className="ml-2 h-4 w-4" />
                                </button>
                            </div>
                            <Link href="/dashboard#create-task" className="btn-secondary mt-3 w-full">
                                Create Another Task
                            </Link>
                        </section>
                        <SupportCard />
                    </div>
                </div>
            </div>
        </main>
    );
}

export function ProtectedPaymentSuccessExperience() {
    return (
        <AuthGate allowedRoles="client">
            <PaymentSuccessExperience />
        </AuthGate>
    );
}
