"use client";

export function loadRazorpayCheckout() {
    return new Promise((resolve) => {
        if (typeof window === "undefined") {
            resolve(false);
            return;
        }

        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const existingScript = document.querySelector("script[src='https://checkout.razorpay.com/v1/checkout.js']");

        if (existingScript) {
            existingScript.addEventListener("load", () => resolve(true), { once: true });
            existingScript.addEventListener("error", () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function normalizeIndianContact(value = "") {
    return String(value || "").replace(/\D/g, "").slice(-10);
}

function getCheckoutEnvironment() {
    if (typeof window === "undefined") {
        return {
            isMobile: false,
            userAgent: "server",
        };
    }

    const userAgent = window.navigator?.userAgent || "";

    return {
        isMobile: /Android|iPhone|iPad|iPod/i.test(userAgent),
        userAgent,
    };
}

function logCheckoutOptions(options) {
    if (typeof window === "undefined") return;

    const { isMobile, userAgent } = getCheckoutEnvironment();

    console.info("[IKIGAI Razorpay] Opening Standard Checkout", {
        order_id: options.order_id,
        amount: options.amount,
        currency: options.currency,
        has_prefill_email: Boolean(options.prefill?.email),
        has_prefill_contact: Boolean(options.prefill?.contact),
        is_mobile: isMobile,
        user_agent: userAgent,
        payment_method_filtering: "disabled",
        note: "No method/config.display is passed, so Razorpay can show UPI, cards, netbanking, wallets, and other enabled methods when available.",
    });
}

export function buildRazorpayCheckoutOptions({
    order,
    fallbackKey,
    serviceTitle,
    client = {},
    contact = "",
    handler,
    onDismiss,
}) {
    const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || fallbackKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "IKIGAI",
        description: serviceTitle || "IKIGAI Digital Service",
        order_id: order.id,
        prefill: {
            name: client.name || "",
            email: client.email || "",
            contact: normalizeIndianContact(contact),
        },
        // Do not pass `method` or `config.display` here.
        // Razorpay Standard Checkout decides which payment methods to show based on
        // the merchant account, order currency, device, and enabled test/live methods.
        // Passing custom display blocks can unintentionally hide UPI in Test Mode.
        theme: {
            color: "#2563eb",
        },
        handler,
        modal: {
            confirm_close: true,
            ondismiss: onDismiss,
        },
        retry: {
            enabled: true,
            max_count: 2,
        },
    };

    logCheckoutOptions(options);

    return options;
}

export async function reportPaymentFailure({ token, taskId, orderId, reason }) {
    if (!token || !taskId) return;

    try {
        await fetch("/api/payments/failure", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                task_id: taskId,
                razorpay_order_id: orderId,
                reason,
            }),
        });
    } catch (error) {
        console.warn("Could not record Razorpay payment failure", error);
    }
}
