"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
};

const defaultDurations = {
    success: 3200,
    info: 3400,
    warning: 4200,
    error: 5200,
};

function createToast(input) {
    const toast = typeof input === "string" ? { text: input } : input || {};
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: toast.type || "info",
        title: toast.title || "",
        text: toast.text || toast.message || "",
        duration: toast.duration,
    };
}

function quickActionToast(label) {
    const text = label.toLowerCase().replace(/\s+/g, " ").trim();
    if (!text) return null;
    if (text.includes("copy")) return { type: "success", text: "Copied to clipboard." };
    if (text.includes("download")) return { type: "success", text: "Download started." };
    if (text.includes("save")) return { type: "success", text: "Saved." };
    if (text.includes("refresh")) return { type: "info", text: "Refreshing latest data." };
    return null;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((input) => {
        const toast = createToast(input);
        setToasts((current) => [toast, ...current].slice(0, 5));
        const duration = toast.duration ?? defaultDurations[toast.type] ?? 3600;
        window.setTimeout(() => dismiss(toast.id), duration);
        return toast.id;
    }, [dismiss]);

    useEffect(() => {
        const handleToast = (event) => showToast(event.detail);
        window.addEventListener("orva:toast", handleToast);
        return () => window.removeEventListener("orva:toast", handleToast);
    }, [showToast]);

    useEffect(() => {
        const handleClick = (event) => {
            const target = event.target?.closest?.("button, a");
            if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;
            if (target.dataset.toast === "off") return;
            const explicitToast = target.dataset.toast;
            if (explicitToast && explicitToast !== "off") {
                showToast({ type: target.dataset.toastType || "success", text: explicitToast });
                return;
            }

            const actionToast = quickActionToast(target.textContent || target.getAttribute("aria-label") || "");
            if (actionToast) {
                window.setTimeout(() => showToast(actionToast), 120);
            }
        };

        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, [showToast]);

    const value = useMemo(() => ({
        success: (text, options = {}) => showToast({ ...options, type: "success", text }),
        error: (text, options = {}) => showToast({ ...options, type: "error", text }),
        info: (text, options = {}) => showToast({ ...options, type: "info", text }),
        warning: (text, options = {}) => showToast({ ...options, type: "warning", text }),
        show: showToast,
        dismiss,
    }), [dismiss, showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-stack" aria-live="polite" aria-atomic="false">
                {toasts.map((toast) => {
                    const Icon = icons[toast.type] || Info;
                    return (
                        <div key={toast.id} className={`toast-card toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
                            <Icon className="toast-icon" />
                            <div className="min-w-0 flex-1">
                                {toast.title ? <p className="toast-title">{toast.title}</p> : null}
                                <p className="toast-text">{toast.text}</p>
                            </div>
                            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            success: () => {},
            error: () => {},
            info: () => {},
            warning: () => {},
            show: () => {},
            dismiss: () => {},
        };
    }
    return context;
}

export function notifyToast(detail) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("orva:toast", { detail }));
}
