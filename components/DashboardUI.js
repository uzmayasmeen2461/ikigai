"use client";

import {
    AlertCircle,
    CheckCircle2,
    ClipboardList,
    Filter,
} from "lucide-react";

const statusStyles = {
    pending: "bg-gray-100 text-gray-700 ring-gray-200",
    assigned: "bg-blue-50 text-blue-700 ring-blue-200",
    in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const statusLabels = {
    pending: "Pending",
    assigned: "Assigned",
    in_progress: "In progress",
    completed: "Completed",
};

const paymentStatusStyles = {
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
    refunded: "bg-slate-100 text-slate-700 ring-slate-200",
};

const paymentStatusLabels = {
    pending: "Payment pending",
    paid: "Paid",
    failed: "Payment failed",
    refunded: "Refunded",
};

export function DashboardPanel({ children, className = "" }) {
    return (
        <div className={`dashboard-panel ${className}`}>
            {children}
        </div>
    );
}

export function DashboardCard({ children, interactive = false, className = "" }) {
    return (
        <div className={`dashboard-card ${interactive ? "dashboard-card-hover" : ""} ${className}`}>
            {children}
        </div>
    );
}

export function SectionHeading({ eyebrow, icon: Icon, title, description, action, className = "" }) {
    return (
        <div className={`mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
            <div>
                {eyebrow && (
                    <div className="dashboard-eyebrow">
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {eyebrow}
                    </div>
                )}
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

export function StatCard({ label, value, icon: Icon, accent = "bg-blue-500" }) {
    return (
        <DashboardCard className="p-5">
            <div className="flex items-center justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-blue-700 ring-1 ring-slate-100">
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                {value}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
        </DashboardCard>
    );
}

export function StatusBadge({ status = "pending", className = "" }) {
    return (
        <span className={`dashboard-badge ${statusStyles[status] || statusStyles.pending} ${className}`}>
            {statusLabels[status] || status}
        </span>
    );
}

export function PaymentStatusBadge({ status = "pending", className = "" }) {
    return (
        <span className={`dashboard-badge ${paymentStatusStyles[status] || paymentStatusStyles.pending} ${className}`}>
            {paymentStatusLabels[status] || status}
        </span>
    );
}

export function ServiceBadge({ children, className = "" }) {
    return (
        <span className={`inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white ${className}`}>
            {children}
        </span>
    );
}

export function FeedbackMessage({ type = "success", children, className = "" }) {
    if (!children) return null;

    const isError = type === "error";

    return (
        <div
            className={`flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                isError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
            } ${className}`}
        >
            {isError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{children}</p>
        </div>
    );
}

export function EmptyState({
    icon: Icon = ClipboardList,
    title,
    description,
    action,
    tone = "default",
    className = "",
}) {
    const toneClass =
        tone === "blue"
            ? "border-blue-200 bg-blue-50"
            : "border-slate-300 bg-white";

    return (
        <div className={`rounded-2xl border border-dashed ${toneClass} p-10 text-center shadow-sm ${className}`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-950">{title}</h3>
            {description && (
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}

export function ErrorState({ title, message, onRetry, className = "" }) {
    return (
        <div className={`rounded-2xl border border-red-100 bg-red-50 p-10 text-center shadow-sm ${className}`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-600 ring-1 ring-red-100">
                <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-950">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="btn-secondary mt-6 bg-white">
                    Try again
                </button>
            )}
        </div>
    );
}

export function FilterTabs({ filters, value, onChange }) {
    return (
        <div className="dashboard-filter-tabs">
            <Filter className="ml-2 h-4 w-4 text-slate-400" />
            {filters.map((filter) => (
                <button
                    key={filter.value}
                    type="button"
                    onClick={() => onChange(filter.value)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        value === filter.value
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-500 hover:bg-white hover:text-slate-950"
                    }`}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    );
}
