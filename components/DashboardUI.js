"use client";

import {
    AlertCircle,
    CheckCircle2,
    ClipboardList,
    Filter,
} from "lucide-react";

const statusStyles = {
    pending: "badge-gray",
    needs_admin_assignment: "badge-red",
    assigned: "badge-blue",
    in_progress: "badge-warn",
    submitted_for_review: "badge-purple",
    revision_requested: "badge-warn",
    client_approved: "badge-green",
    auto_approved: "badge-green",
    completed: "badge-green",
};

const statusLabels = {
    pending: "Pending",
    needs_admin_assignment: "Needs admin assignment",
    assigned: "Assigned",
    in_progress: "In progress",
    submitted_for_review: "Submitted for review",
    revision_requested: "Revision requested",
    client_approved: "Client approved",
    auto_approved: "Auto-approved",
    completed: "Completed",
};

const paymentStatusStyles = {
    pending: "badge-warn",
    paid: "badge-green",
    failed: "badge-red",
    refunded: "badge-gray",
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
        <DashboardCard className="stat-card p-5">
            <div className="flex items-center justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                    {Icon && <Icon className="h-5 w-5" />}
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
            </div>
            <p className="stat-val">
                {value}
            </p>
            <p className="stat-lbl">{label}</p>
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

export function SlaBadge({ status = "on_time", className = "" }) {
    const styles = {
        on_time: "badge-green",
        due_soon: "badge-warn",
        overdue: "badge-red",
    };
    const labels = {
        on_time: "On time",
        due_soon: "Due soon",
        overdue: "Overdue",
    };

    return (
        <span className={`dashboard-badge ${styles[status] || styles.on_time} ${className}`}>
            {labels[status] || status}
        </span>
    );
}

export function ServiceBadge({ children, className = "" }) {
    return (
        <span className={`badge badge-blue ${className}`}>
            {children}
        </span>
    );
}

export function FeedbackMessage({ type = "success", children, className = "" }) {
    if (!children) return null;

    const isError = type === "error";

    return (
        <div
            className={`flex gap-3 rounded-xl border p-4 text-sm leading-6 ${
                isError
                    ? "border-[rgba(122,21,21,0.18)] bg-[var(--danger-bg)] text-[var(--danger)]"
                    : "border-[rgba(14,122,82,0.2)] bg-[var(--success-bg)] text-[var(--success)]"
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
            ? "border-[rgba(27,79,216,0.25)] bg-[var(--accent-light)]"
            : "border-[var(--border)] bg-white";

    return (
        <div className={`rounded-xl border border-dashed ${toneClass} p-10 text-center ${className}`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-[var(--ink)]">{title}</h3>
            {description && (
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--mid)]">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}

export function ErrorState({ title, message, onRetry, className = "" }) {
    return (
        <div className={`rounded-xl border border-[rgba(122,21,21,0.18)] bg-[var(--danger-bg)] p-10 text-center ${className}`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[var(--danger)]">
                <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-[var(--ink)]">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--danger)]">{message}</p>
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
            <Filter className="ml-2 h-4 w-4 text-[var(--muted)]" />
            {filters.map((filter) => (
                <button
                    key={filter.value}
                    type="button"
                    onClick={() => onChange(filter.value)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        value === filter.value
                            ? "bg-[var(--ink)] text-white"
                            : "text-[var(--mid)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    }`}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    );
}
