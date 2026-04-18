"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    CheckCircle2,
    CreditCard,
    Loader2,
    ReceiptText,
    ShieldCheck,
    X,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { dashboardForRole, getUserRole } from "../app/lib/authRouting";
import { calculatePricing, formatINR } from "../app/lib/pricing";
import {
    buildRazorpayCheckoutOptions,
    loadRazorpayCheckout,
    reportPaymentFailure,
} from "../app/lib/razorpayCheckout";

const checkoutIntentKey = "ikigai_pending_service_checkout";

function defaultForm(email = "") {
    return {
        title: "",
        businessName: "",
        contactNumber: "",
        email,
        productCount: "",
        notes: "",
        assetsNote: "",
    };
}

export function ServiceStartButton({
    serviceType,
    serviceTitle,
    included = [],
    requiredDetails = [],
    turnaround = "",
    className = "",
}) {
    const router = useRouter();
    const [checkingAuth, setCheckingAuth] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [form, setForm] = useState(defaultForm());
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });
    const [paymentLoading, setPaymentLoading] = useState(false);

    const pricing = useMemo(() => calculatePricing(serviceType), [serviceType]);

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
        setMessage({ type: "", text: "" });
    };

    const getToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    };

    const validate = () => {
        const nextErrors = {};

        if (!form.businessName.trim() || form.businessName.trim().length < 2) {
            nextErrors.businessName = "Enter your business name.";
        }

        if (!/^[6-9]\d{9}$/.test(form.contactNumber.trim())) {
            nextErrors.contactNumber = "Enter a valid 10-digit Indian phone number.";
        }

        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
            nextErrors.email = "Enter a valid email address.";
        }

        if (!form.title.trim() || form.title.trim().length < 3) {
            nextErrors.title = "Add a short task title.";
        }

        if (!form.notes.trim() || form.notes.trim().length < 10) {
            nextErrors.notes = "Add a short requirement note.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const openCheckout = async ({ fromIntent = false } = {}) => {
        setCheckingAuth(true);
        setMessage({ type: "", text: "" });

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            if (typeof window !== "undefined") {
                window.localStorage.setItem(
                    checkoutIntentKey,
                    JSON.stringify({ serviceType, from: "services" })
                );
            }
            router.push(`/auth?next=/services?checkout=${serviceType}`);
            return;
        }

        const role = await getUserRole(user.id);

        if (role !== "client") {
            router.push(dashboardForRole(role));
            return;
        }

        setForm((prev) => ({
            ...prev,
            title: prev.title || serviceTitle,
            email: prev.email || user.email || "",
        }));
        setCheckoutOpen(true);
        setCheckingAuth(false);

        if (fromIntent && typeof window !== "undefined") {
            window.localStorage.removeItem(checkoutIntentKey);
            window.history.replaceState({}, "", "/services");
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const checkoutService = params.get("checkout");

        if (checkoutService === serviceType) {
            openCheckout({ fromIntent: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceType]);

    const payAndStart = async (event) => {
        event.preventDefault();
        setMessage({ type: "", text: "" });

        if (!validate()) return;

        setPaymentLoading(true);

        const scriptLoaded = await loadRazorpayCheckout();

        if (!scriptLoaded) {
            setPaymentLoading(false);
            setMessage({
                type: "error",
                text: "Could not load Razorpay Checkout. Please try again.",
            });
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();
        const token = await getToken();

        if (!user || !token) {
            setPaymentLoading(false);
            router.push(`/auth?next=/services?checkout=${serviceType}`);
            return;
        }

        try {
            const orderResponse = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    service_type: serviceType,
                    requirement: {
                        title: form.title.trim(),
                        businessName: form.businessName.trim(),
                        contactNumber: form.contactNumber.trim(),
                        email: form.email.trim(),
                        productCount: form.productCount,
                        description: form.notes.trim(),
                        notes: form.notes.trim(),
                        assetsNote: form.assetsNote.trim(),
                    },
                }),
            });
            const orderData = await orderResponse.json();

            if (!orderResponse.ok) {
                throw new Error(orderData.error || "Could not create payment order.");
            }

            const taskId = orderData.task_id;

            if (!taskId) {
                throw new Error("Payment order created without a task reference.");
            }

            const razorpay = new window.Razorpay(buildRazorpayCheckoutOptions({
                order: orderData.order,
                fallbackKey: orderData.razorpay_key_id,
                serviceTitle,
                client: orderData.client,
                contact: form.contactNumber,
                handler: async (paymentResponse) => {
                    try {
                        const verifyResponse = await fetch("/api/payments/verify", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                task_id: taskId,
                                razorpay_order_id: paymentResponse.razorpay_order_id,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyResponse.json();

                        if (!verifyResponse.ok) {
                            throw new Error(verifyData.error || "Payment verification failed.");
                        }

                        setMessage({
                            type: "success",
                            text: "Payment verified successfully. Redirecting to confirmation...",
                        });
                        router.push(`/payment/success?task_id=${taskId}`);
                    } catch (error) {
                        setPaymentLoading(false);
                        setMessage({
                            type: "error",
                            text: error.message || "Payment verification failed. Please retry from your dashboard.",
                        });
                    }
                },
                onDismiss: () => {
                    setPaymentLoading(false);
                    setMessage({
                        type: "error",
                        text: "Payment was cancelled. Your request is saved and you can retry anytime.",
                    });
                },
            }));

            razorpay.on("payment.failed", (response) => {
                setPaymentLoading(false);
                reportPaymentFailure({
                    token,
                    taskId,
                    orderId: orderData.order.id,
                    reason: response.error?.description,
                });
                setMessage({
                    type: "error",
                    text: response.error?.description || "Payment failed. Your request is saved and you can retry.",
                });
            });

            razorpay.open();
        } catch (error) {
            setPaymentLoading(false);
            setMessage({
                type: "error",
                text: error.message || "Could not start this service.",
            });
        }
    };

    return (
        <div className={className}>
            <button type="button" onClick={() => openCheckout()} disabled={checkingAuth} className="btn-primary w-full">
                {checkingAuth ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                    </>
                ) : (
                    <>
                        Start This Service <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
            </button>

            {checkoutOpen && (
                <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                    <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
                            <div>
                                <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Secure service checkout
                                </p>
                                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                                    Start {serviceTitle}
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Share your requirement, review pricing, and pay securely to begin managed execution.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckoutOpen(false)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"
                                aria-label="Close checkout"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={payAndStart} className="grid gap-6 p-6 lg:grid-cols-[1fr_0.82fr]">
                            <div className="space-y-5">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <h3 className="text-lg font-semibold text-slate-950">Service summary</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Turnaround: <span className="font-semibold text-slate-700">{turnaround || "Shared after review"}</span>
                                    </p>
                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                        {included.map((item) => (
                                            <div key={item} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                    {requiredDetails.length > 0 && (
                                        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                                You need to provide
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {requiredDetails.map((item) => (
                                                    <span
                                                        key={item}
                                                        className="rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                    <h3 className="text-lg font-semibold text-slate-950">Share your requirement</h3>
                                    <div className="mt-5">
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Task title</label>
                                        <input
                                            value={form.title}
                                            onChange={(e) => setField("title", e.target.value)}
                                            placeholder={`Example: Start ${serviceTitle}`}
                                            className={`form-field ${errors.title ? "border-red-300 focus:ring-red-100" : ""}`}
                                        />
                                        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Business name</label>
                                            <input
                                                value={form.businessName}
                                                onChange={(e) => setField("businessName", e.target.value)}
                                                placeholder="Example: Uzma's Kitchen"
                                                className={`form-field ${errors.businessName ? "border-red-300 focus:ring-red-100" : ""}`}
                                            />
                                            {errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Contact number</label>
                                            <input
                                                value={form.contactNumber}
                                                onChange={(e) => setField("contactNumber", e.target.value)}
                                                placeholder="10-digit mobile number"
                                                className={`form-field ${errors.contactNumber ? "border-red-300 focus:ring-red-100" : ""}`}
                                            />
                                            {errors.contactNumber && <p className="mt-1 text-xs text-red-600">{errors.contactNumber}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                                            <input
                                                value={form.email}
                                                onChange={(e) => setField("email", e.target.value)}
                                                placeholder="you@example.com"
                                                className={`form-field ${errors.email ? "border-red-300 focus:ring-red-100" : ""}`}
                                            />
                                            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Products / items</label>
                                            <input
                                                type="number"
                                                value={form.productCount}
                                                onChange={(e) => setField("productCount", e.target.value)}
                                                placeholder="Example: 12"
                                                className="form-field"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Notes / instructions</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={(e) => setField("notes", e.target.value)}
                                            placeholder="Tell us what you want IKIGAI to set up, list, or prepare."
                                            className={`form-field min-h-28 ${errors.notes ? "border-red-300 focus:ring-red-100" : ""}`}
                                        />
                                        {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                                    </div>

                                    <div className="mt-4">
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Documents / assets placeholder</label>
                                        <textarea
                                            value={form.assetsNote}
                                            onChange={(e) => setField("assetsNote", e.target.value)}
                                            placeholder="Example: Logo ready, product images pending, FSSAI available, etc."
                                            className="form-field min-h-24"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                        <ReceiptText className="h-4 w-4" />
                                        Pricing breakdown
                                    </div>
                                    <div className="mt-4 space-y-3 text-sm">
                                        {[
                                            ["Base price", pricing.base_amount],
                                            [`GST (${pricing.gst_percent}%)`, pricing.gst_amount],
                                            ["Platform fee", pricing.platform_fee],
                                        ].map(([label, value]) => (
                                            <div key={label} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                                                <span className="text-slate-500">{label}</span>
                                                <span className="font-semibold text-slate-950">{formatINR(value)}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-4 text-white">
                                            <span className="font-semibold">Total payable</span>
                                            <span className="text-xl font-semibold">{formatINR(pricing.total_amount)}</span>
                                        </div>
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`rounded-2xl border p-4 text-sm leading-6 ${
                                        message.type === "error"
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-green-200 bg-green-50 text-green-700"
                                    }`}>
                                        {message.text}
                                    </div>
                                )}

                                <button type="submit" disabled={paymentLoading} className="btn-primary w-full py-4">
                                    {paymentLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Opening Checkout...
                                        </>
                                    ) : (
                                        <>
                                            Pay & Start Service <CreditCard className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs leading-5 text-slate-500">
                                    Your task is created as unpaid first. It becomes ready for IKIGAI execution only after secure Razorpay verification.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
