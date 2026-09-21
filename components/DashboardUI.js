"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    FileSpreadsheet,
    Filter,
    Megaphone,
    MousePointerClick,
    Smartphone,
} from "lucide-react";
import { useToast } from "./ToastProvider";

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

export function SectionHeading({ eyebrow, icon: Icon, title, action, className = "" }) {
    return (
        <div className={`mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
            <div className="flex min-w-0 gap-4">
                <div className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(27,79,216,0.14)] bg-[var(--accent-light)] text-[var(--accent)] sm:flex">
                    {Icon ? <Icon className="h-6 w-6" /> : <MousePointerClick className="h-6 w-6" />}
                </div>
                <div className="min-w-0">
                {eyebrow && (
                    <div className="dashboard-eyebrow">
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {eyebrow}
                    </div>
                )}
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    {title}
                </h2>
                </div>
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
    const toast = useToast();
    const lastMessageRef = useRef("");

    useEffect(() => {
        if (!children) return;
        const text = typeof children === "string" ? children : "";
        if (!text || lastMessageRef.current === `${type}:${text}`) return;
        lastMessageRef.current = `${type}:${text}`;
        const toastType = type === "error" ? "error" : type === "warning" ? "warning" : type === "info" ? "info" : "success";
        toast.show({ type: toastType, text });
    }, [children, toast, type]);

    if (!children) return null;

    const isError = type === "error";
    const isWarning = type === "warning";
    const isInfo = type === "info";

    return (
        <div
            className={`flex gap-3 rounded-xl border p-4 text-sm leading-6 ${
                isError
                    ? "border-[rgba(122,21,21,0.18)] bg-[var(--danger-bg)] text-[var(--danger)]"
                    : isWarning
                        ? "border-[rgba(122,92,14,0.2)] bg-[var(--warn-bg)] text-[var(--warn)]"
                        : isInfo
                            ? "border-[rgba(27,79,216,0.18)] bg-[var(--accent-light)] text-[var(--accent)]"
                    : "border-[rgba(14,122,82,0.2)] bg-[var(--success-bg)] text-[var(--success)]"
            } ${className}`}
        >
            {isError || isWarning ? (
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
        <div className={`rounded-xl border border-dashed ${toneClass} p-6 text-center sm:p-10 ${className}`}>
            <div className="visual-demo mx-auto max-w-[240px]" data-visual="empty">
                <div className="visual-demo-screen">
                    <div className="visual-demo-row visual-demo-row-wide" />
                    <div className="visual-demo-grid">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="visual-demo-click">
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
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

export function VisualActionCard({
    icon: Icon = MousePointerClick,
    title,
    description,
    action,
    href,
    primary = false,
    visual = "tap",
    className = "",
}) {
    const productTiles = [
        { name: "Shoe", price: "1499", color: "bg-[#dbeafe]" },
        { name: "Bag", price: "899", color: "bg-[#dcfce7]" },
        { name: "Kurti", price: "1299", color: "bg-[#fef3c7]" },
    ];

    const productCard = (item) => (
        <div key={item.name} className="rounded-lg border border-[var(--border)] bg-white p-1.5 shadow-sm">
            <div className={`h-10 rounded-md ${item.color}`} />
            <p className="mt-1 truncate text-[9px] font-black leading-none text-[var(--ink)]">{item.name}</p>
            <p className="mt-0.5 text-[8px] font-bold leading-none text-[var(--success)]">Rs {item.price}</p>
        </div>
    );

    const visualContent = (() => {
        if (visual === "upload") {
            return (
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2">
                    <div className="w-24 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <div className="mb-2 flex items-center gap-1 text-[8px] font-black text-[var(--success)]">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            CSV list
                        </div>
                        {[1, 2, 3, 4].map((row) => (
                            <div key={row} className="mb-1 grid grid-cols-[1fr_0.55fr] gap-1">
                                <span className="h-2 rounded bg-[var(--accent-soft)]" />
                                <span className="h-2 rounded bg-[var(--success-bg)]" />
                            </div>
                        ))}
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div className="grid w-28 grid-cols-2 gap-1.5">
                        {productTiles.slice(0, 2).map(productCard)}
                        <div className="col-span-2 rounded-lg bg-[var(--success-bg)] px-2 py-1 text-center text-[8px] font-black text-[var(--success)] shadow-sm">
                            AI matched
                        </div>
                    </div>
                </div>
            );
        }

        if (visual === "photo") {
            return (
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2">
                    <div className="w-24 rounded-[1.2rem] border-[5px] border-[var(--ink)] bg-[var(--ink)] shadow-xl">
                        <div className="overflow-hidden rounded-[0.75rem] bg-white p-1.5">
                            <div className="mb-1 flex items-center gap-1 text-[8px] font-black text-[var(--accent)]">
                                <Smartphone className="h-3.5 w-3.5" />
                                Phone photos
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {productTiles.slice(0, 4).map((item) => (
                                    <span key={item.name} className={`h-9 rounded-md ${item.color}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div className="w-24 space-y-1.5">
                        {["Rs 499", "Rs 899", "Rs 1299"].map((price) => (
                            <div key={price} className="rounded-lg bg-white px-2 py-1 text-center text-[9px] font-black text-[var(--success)] shadow-md">
                                {price}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (visual === "content") {
            return (
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2">
                    <div className="grid w-28 grid-cols-2 gap-1.5">
                        <div className="h-16 rounded-xl bg-[#fef3c7] shadow-sm" />
                        <div className="h-16 rounded-xl bg-[#dbeafe] shadow-sm" />
                        <div className="col-span-2 rounded-lg bg-white px-2 py-1 text-center text-[8px] font-black text-[var(--accent)] shadow-sm">
                            Offer images
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <div className="w-24 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg">
                        <Megaphone className="mb-1 h-4 w-4 text-[var(--success)]" />
                        <p className="rounded bg-[var(--accent-light)] px-1 py-0.5 text-[8px] font-black text-[var(--accent)]">Caption</p>
                        <p className="mt-1 rounded bg-[var(--success-bg)] px-1 py-0.5 text-[8px] font-black text-[var(--success)]">CTA</p>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className="visual-demo-row visual-demo-row-wide" />
                <div className="visual-demo-row" />
                <div className="visual-demo-grid">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="visual-demo-button">
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="visual-demo-click">
                    <MousePointerClick className="h-4 w-4" />
                </div>
            </>
        );
    })();

    const content = (
        <div className={`visual-action-card interactive-tile ${primary ? "visual-action-card-primary" : ""} ${className}`}>
            <div className="visual-demo" data-visual={visual}>
                <div className="visual-demo-topbar">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="visual-demo-screen">
                    {visualContent}
                </div>
            </div>
            <div className="mt-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-tight text-[var(--ink)]">{title}</h3>
                    {description ? <p className="mt-1 text-sm leading-5 text-[var(--mid)]">{description}</p> : null}
                </div>
            </div>
            <span className={primary ? "btn-primary mt-5 w-full" : "btn-secondary mt-5 w-full"}>
                {action}
                <ArrowRight className="h-4 w-4" />
            </span>
        </div>
    );

    if (!href) return content;

    return (
        <Link href={href} className="block h-full">
            {content}
        </Link>
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
