"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AlertTriangle,
    Camera,
    CalendarDays,
    CheckCircle2,
    CloudUpload,
    Copy,
    ExternalLink,
    Film,
    FileSpreadsheet,
    ImageIcon,
    Loader2,
    Package,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    Settings,
    ShoppingBag,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { formatINR } from "../../app/lib/pricing";
import { buildFacebookPageCaption, buildInstagramCaption, formatInventoryStatus, productCode, productName, productStock } from "../../app/lib/inventory";
import { formatStableDateTime } from "../../app/lib/stableDate";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, ErrorState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const channels = [
    { id: "whatsapp", name: "WhatsApp Business", description: "Prepare catalog-ready product text and images for manual WhatsApp setup.", icon: Send },
    { id: "instagram", name: "Instagram Business", description: "Keep products ready for posts and product highlights.", icon: Camera },
    { id: "facebook", name: "Facebook Page", description: "Prepare listings for your Facebook audience.", icon: ShoppingBag },
    { id: "online_store", name: "Online Store Preview", description: "Keep your shareable storefront preview current.", icon: Package },
];

function useToken() {
    return useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);
}

async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: "The server returned an invalid response." };
    }
}

function statusBadge(status = "in_stock") {
    if (status === "out_of_stock") return "badge-red";
    if (status === "low_stock") return "badge-warn";
    if (status === "hidden") return "badge-gray";
    return "badge-green";
}

function syncBadge(status = "pending") {
    if (status === "synced") return "badge-green";
    if (status === "failed") return "badge-red";
    return "badge-warn";
}

function connectionBadge(status = "not_connected") {
    if (status === "connected") return "badge-green";
    if (status === "manual_setup") return "badge-blue";
    if (status === "api_ready") return "badge-warn";
    if (status === "connecting") return "badge-warn";
    if (status === "failed") return "badge-red";
    return "badge-gray";
}

function prettyStatus(status = "") {
    return String(status || "pending").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProductThumb({ product }) {
    if (!product.image_url) {
        return <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)]"><ImageIcon className="h-5 w-5" /></div>;
    }
    return <div className="h-11 w-11 rounded-lg border border-[var(--border)] bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} />;
}

function ChannelLogo({ channel }) {
    if (channel === "whatsapp") {
        return <Image src="/service-logos/whatsapp.jpeg" alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />;
    }

    if (channel === "instagram") {
        return <Image src="/service-logos/instagram.jpeg" alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />;
    }

    return (
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1877F2] text-[13px] font-black leading-none text-white" aria-hidden="true">
            f
        </span>
    );
}

function publishCopyForChannel(channel, product = {}) {
    if (channel === "instagram") return buildInstagramCaption(product);
    return buildFacebookPageCaption(product);
}

function hasOpenWhatsAppCatalogRequest(tasks = []) {
    const openStatuses = new Set(["pending", "assigned", "started", "in_progress", "completed", "payout_generated", "payout_paid", "payment_confirmed"]);
    return tasks.some((task) =>
        task.channel === "whatsapp_catalog" &&
        task.task_type === "catalog_setup" &&
        openStatuses.has(task.status || "pending")
    );
}

async function loadSavedPublishCopy(getToken, productId, channel) {
    const token = await getToken();
    const params = new URLSearchParams({ productId, channel });
    const response = await fetch(`/api/social-content/saved-caption?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readJson(response);
    return { ok: response.ok, ...result };
}

async function savePublishCopy(getToken, productId, channel, copy) {
    const token = await getToken();
    const response = await fetch("/api/social-content/saved-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, channel, copy }),
    });
    const result = await readJson(response);
    return { ok: response.ok, ...result };
}

async function requestWhatsAppCatalogSetup(getToken, productIds = []) {
    const token = await getToken();
    const response = await fetch("/api/operations/whatsapp-catalog-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productIds }),
    });
    const result = await readJson(response);
    return { ok: response.ok, ...result };
}

export function MvpDashboard() {
    const getToken = useToken();
    const [products, setProducts] = useState([]);
    const [connections, setConnections] = useState([]);
    const [updateTasks, setUpdateTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const [onboarding, setOnboarding] = useState({ active: false });
    const [selectedProductId, setSelectedProductId] = useState("");
    const [publishProduct, setPublishProduct] = useState(null);
    const [publishChannel, setPublishChannel] = useState("facebook");
    const [publishing, setPublishing] = useState(false);
    const [editedCopy, setEditedCopy] = useState("");
    const [editingCopy, setEditingCopy] = useState(false);
    const [writingAI, setWritingAI] = useState(false);
    const [savingCaption, setSavingCaption] = useState(false);
    const [requestingWhatsApp, setRequestingWhatsApp] = useState(false);
    const [whatsappRequested, setWhatsappRequested] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [productResponse, connectionResponse, taskResponse, onboardingResponse] = await Promise.all([
            fetch("/api/inventory", { headers }),
            fetch("/api/connections", { headers }),
            fetch("/api/update-tasks", { headers }),
            fetch("/api/onboarding/application", { headers }),
        ]);
        const [productResult, connectionResult, taskResult, onboardingResult] = await Promise.all([
            readJson(productResponse),
            readJson(connectionResponse),
            readJson(taskResponse),
            readJson(onboardingResponse),
        ]);
        if (!productResponse.ok) setError(productResult.error || "Could not load products.");
        setProducts(productResult.products || []);
        setConnections(connectionResult.connections || []);
        setUpdateTasks(taskResult.tasks || []);
        setWhatsappRequested(hasOpenWhatsAppCatalogRequest(taskResult.tasks || []));
        setOnboarding(onboardingResponse.ok ? onboardingResult : { active: false });
        setLoading(false);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const selectedProduct = products.find((product) => product.id === selectedProductId) || products[0];
    const publishDetails = publishChannel === "instagram"
        ? {
            eyebrow: "Instagram Post",
            title: "Review Instagram post",
            copy: publishCopyForChannel(publishChannel, publishProduct || {}),
            copyLabel: "Copy Caption",
            actionLabel: "Publish Instagram",
            endpoint: "/api/instagram/publish-product",
            note: "Publish one reviewed image post to the connected Instagram professional account.",
        }
        : {
            eyebrow: "Facebook Page",
            title: "Review Facebook post",
            copy: publishCopyForChannel(publishChannel, publishProduct || {}),
            copyLabel: "Copy Caption",
            actionLabel: "Publish Facebook",
            endpoint: "/api/facebook/page/publish-product",
            note: "Publish one reviewed post to the connected Facebook Page.",
        };
    const stats = [
        { label: "Total products", value: products.length, icon: Package, accent: "bg-[var(--accent)]" },
        { label: "Ready to publish", value: products.filter((product) => productName(product) && product.price).length, icon: CheckCircle2, accent: "bg-emerald-500" },
        { label: "Catalog tasks", value: updateTasks.filter((task) => String(task.channel || "").includes("whatsapp")).length, icon: Send, accent: "bg-[#16A46D]" },
        { label: "Out of stock", value: products.filter((product) => productStock(product) <= 0).length, icon: AlertTriangle, accent: "bg-red-500" },
    ];
    const connectedChannels = connections.filter((connection) => connection.status === "connected").length;
    const pendingTasks = updateTasks.filter((task) => ["pending", "in_progress", "failed"].includes(task.status)).slice(0, 4);

    const openPublisher = async (product, channel) => {
        setPublishChannel(channel);
        setPublishProduct(product);
        const fallback = publishCopyForChannel(channel, product);
        setEditedCopy(fallback);
        setEditingCopy(false);
        const saved = await loadSavedPublishCopy(getToken, product.id, channel);
        if (saved.ok && saved.copy) {
            setEditedCopy(saved.copy);
        }
    };

    const copyPublishCopy = async () => {
        if (!publishProduct) return;
        try {
            await navigator.clipboard.writeText(editedCopy || publishDetails.copy);
            setMessage({ type: "success", text: `${publishDetails.copyLabel.replace("Copy ", "")} copied.` });
        } catch {
            setMessage({ type: "error", text: "Could not copy automatically. Please select and copy the text manually." });
        }
    };

    const writeWithAi = async () => {
        if (!publishProduct) return;
        setWritingAI(true);
        const token = await getToken();
        const response = await fetch("/api/social-content/write-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                productId: publishProduct.id,
                channel: publishChannel,
                currentText: editedCopy || publishDetails.copy,
            }),
        });
        const result = await readJson(response);
        setWritingAI(false);
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not write with AI right now." });
        setEditedCopy(result.copy || editedCopy || publishDetails.copy);
        setEditingCopy(true);
        setMessage({ type: result.configured === false ? "error" : "success", text: result.warning || "AI draft ready. Review it before publishing." });
    };

    const saveCurrentCaption = async () => {
        if (!publishProduct) return;
        setSavingCaption(true);
        const result = await savePublishCopy(getToken, publishProduct.id, publishChannel, editedCopy || publishDetails.copy);
        setSavingCaption(false);
        if (!result.ok) return setMessage({ type: "error", text: result.error || "Could not save caption." });
        setEditedCopy(result.copy || editedCopy || publishDetails.copy);
        setMessage({ type: "success", text: result.message || "Caption saved for this product." });
    };

    const publishSelectedProduct = async () => {
        if (!publishProduct) return;
        setPublishing(true);
        const token = await getToken();
        const response = await fetch(publishDetails.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ productId: publishProduct.id, caption: editedCopy || publishDetails.copy }),
        });
        const result = await readJson(response);
        setPublishing(false);
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not publish this product. Copy the prepared text and complete the update manually." });
        setPublishProduct(null);
        setMessage({ type: "success", text: result.message || "Product published successfully." });
    };

    const requestWhatsAppCatalog = async () => {
        setRequestingWhatsApp(true);
        const result = await requestWhatsAppCatalogSetup(getToken);
        setRequestingWhatsApp(false);
        if (!result.ok) return setMessage({ type: "error", text: result.error || "Could not create WhatsApp catalog task." });
        setWhatsappRequested(true);
        setMessage({ type: "success", text: result.message || "WhatsApp catalog task created for admin review." });
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Workspace" title="Publish your products" description="Upload a product list, or send photos and prices so ORVA can create the inventory for you.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {loading ? <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : error ? <ErrorState title="Could not load dashboard" message={error} onRetry={load} /> : (
                    <div className="grid gap-6">
                        {!onboarding.active ? (
                            <section className="dashboard-panel border-l-4 border-l-amber-400 p-5">
                                <p className="font-bold">Your ORVA account is pending activation.</p>
                                <p className="mt-1 text-sm leading-6 text-[var(--mid)]">You can prepare products, but publishing/export unlocks after admin verifies your manual payment.</p>
                                <Link href="/dashboard/onboarding" className="btn-primary mt-4 inline-flex">Complete onboarding</Link>
                            </section>
                        ) : null}
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>

                        <section className="dashboard-panel p-5">
                            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                                {[
                                    { step: "1", title: "Add inventory", detail: "Upload CSV, or send product photos with prices.", action: "Start here", href: "/dashboard/upload-inventory", icon: CloudUpload },
                                    { step: "2", title: "Review products", detail: "Check price, stock, image, and status.", action: "Manage products", href: "/dashboard/products", icon: Package },
                                    { step: "3", title: "Growth Assistant", detail: "Get today’s best product, offers, and weekly plan.", action: "Open Growth", href: "/dashboard?view=growth-assistant", icon: Sparkles },
                                    { step: "4", title: "Growth Autopilot", detail: "Prepare posts and reminders for the week.", action: "Plan week", href: "/dashboard?view=growth-autopilot", icon: CalendarDays },
                                    { step: "5", title: "Create reels", detail: "Upload a video or create a reel from product images.", action: "Open Reel Studio", href: selectedProduct ? `/dashboard/reel-studio?productId=${selectedProduct.id}` : "/dashboard/reel-studio", icon: Film },
                                    { step: "6", title: "Preview & publish", detail: "Choose one product and publish after review.", action: `${connectedChannels || 0} channels connected`, href: "/dashboard/connections", icon: Send },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return <Link key={item.title} href={item.href} className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--accent)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-light)] text-sm font-bold text-[var(--accent)]">{item.step}</span>
                                            <Icon className="h-5 w-5 text-[var(--accent)]" />
                                        </div>
                                        <p className="mt-4 font-bold">{item.title}</p>
                                        <p className="mt-1 text-sm leading-5 text-[var(--mid)]">{item.detail}</p>
                                        <p className="mt-4 text-sm font-bold text-[var(--accent)]">{item.action}</p>
                                    </Link>;
                                })}
                            </div>
                        </section>

                        {!products.length ? (
                            <EmptyState title="Create your first inventory" description="Upload a CSV if you have one. If not, send product photos and prices, and ORVA will help turn them into inventory." action={<div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/dashboard/upload-inventory" className="btn-primary inline-flex"><CloudUpload className="h-4 w-4" />Add Inventory</Link><Link href="/dashboard/upload-inventory" className="btn-secondary inline-flex"><ImageIcon className="h-4 w-4" />Send Photos + Prices</Link></div>} />
                        ) : (
                            <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
                                <div className="dashboard-panel overflow-hidden">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
                                        <div>
                                            <h2 className="text-xl font-bold">Products ready to publish</h2>
                                            <p className="mt-1 text-sm text-[var(--mid)]">Pick a product, preview it, then publish to the channel you need.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Link href="/dashboard/upload-inventory" className="btn-secondary"><CloudUpload className="h-4 w-4" />CSV or Photos</Link>
                                            <Link href="/dashboard/products/new" className="btn-primary"><Plus className="h-4 w-4" />Add product</Link>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-[var(--border)]">
                                        {products.slice(0, 6).map((product) => {
                                            const active = selectedProduct?.id === product.id;
                                            return <button key={product.id} type="button" onClick={() => setSelectedProductId(product.id)} className={`flex w-full flex-col gap-4 p-4 text-left transition hover:bg-[var(--surface)] md:flex-row md:items-center md:justify-between ${active ? "bg-[var(--accent-light)]" : "bg-white"}`}>
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <ProductThumb product={product} />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-bold">{productName(product)}</p>
                                                        <p className="mt-1 text-sm text-[var(--mid)]">{productCode(product) || "No code"} · {product.category || "Uncategorised"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="dashboard-badge badge-blue">{formatINR(product.price || 0)}</span>
                                                    <span className={`dashboard-badge ${statusBadge(product.status)}`}>{formatInventoryStatus(product.status)}</span>
                                                </div>
                                            </button>;
                                        })}
                                    </div>
                                </div>

                                <div className="grid gap-6">
                                    <section className="dashboard-panel p-5">
                                        <SectionHeading title="Live product preview" description="This is the customer-facing feel before you publish." />
                                        {selectedProduct ? (
                                            <div className="mx-auto mt-5 max-w-[290px] rounded-[2rem] border border-[var(--ink)] bg-[var(--ink)] p-3 shadow-2xl">
                                                <div className="overflow-hidden rounded-[1.5rem] bg-white">
                                                    <div className="bg-[#0b8f63] px-4 py-3 text-white">
                                                        <p className="text-xs opacity-80">ORVA Store</p>
                                                        <p className="font-bold">Catalog preview</p>
                                                    </div>
                                                    <div className="p-3">
                                                        <div className="aspect-square rounded-xl bg-[var(--surface)] bg-cover bg-center" style={selectedProduct.cleaned_image_url || selectedProduct.image_url ? { backgroundImage: `url(${selectedProduct.cleaned_image_url || selectedProduct.image_url})` } : undefined}>
                                                            {selectedProduct.cleaned_image_url || selectedProduct.image_url ? null : <div className="flex h-full items-center justify-center text-[var(--muted)]"><ImageIcon className="h-8 w-8" /></div>}
                                                        </div>
                                                        <p className="mt-3 font-bold">{productName(selectedProduct)}</p>
                                                        <div className="mt-2 flex items-center justify-between gap-3">
                                                            <span className="font-bold text-[var(--accent)]">{formatINR(selectedProduct.price || 0)}</span>
                                                            <span className={`dashboard-badge ${statusBadge(selectedProduct.status)}`}>{formatInventoryStatus(selectedProduct.status)}</span>
                                                        </div>
                                                        <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--mid)]">{selectedProduct.description || selectedProduct.notes || "Product details will appear here for customers before they message to order."}</p>
                                                        <button type="button" className="mt-4 w-full rounded-xl bg-[#16A46D] px-4 py-3 text-sm font-bold text-white">Message to order</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </section>

                                    <section className="dashboard-panel p-5">
                                        <SectionHeading title="Publish selected product" description="Review the copy before anything goes live." />
                                        <div className="mt-4 grid gap-2">
                                            <button type="button" className="btn-secondary justify-center" disabled={!selectedProduct || !onboarding.active} onClick={() => openPublisher(selectedProduct, "instagram")}><Camera className="h-4 w-4" />Instagram Post</button>
                                            <button type="button" className="btn-primary justify-center" disabled={!selectedProduct || !onboarding.active} onClick={() => openPublisher(selectedProduct, "facebook")}><ShoppingBag className="h-4 w-4" />Facebook Page</button>
                                            <button type="button" className="btn-secondary justify-center" disabled={!products.length || !onboarding.active || requestingWhatsApp || whatsappRequested} onClick={requestWhatsAppCatalog}>{requestingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChannelLogo channel="whatsapp" />}{whatsappRequested ? "WhatsApp Catalog Requested" : "Request WhatsApp Catalog Setup"}</button>
                                        </div>
                                    </section>
                                </div>
                            </section>
                        )}

                        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
                            <div className="dashboard-panel p-6">
                                <SectionHeading title="Channels" description="Connect accounts once. Publish only after you review each product." />
                                <div className="grid gap-3 sm:grid-cols-2">{channels.map((channel) => {
                                    const connection = connections.find((item) => item.channel === channel.id);
                                    const status = connection?.status || (channel.id === "online_store" ? "manual_setup" : "not_connected");
                                    return <div key={channel.id} className="rounded-xl border border-[var(--border)] bg-white p-4"><p className="text-sm font-bold">{channel.name}</p><span className={`dashboard-badge mt-3 ${connectionBadge(status)}`}>{prettyStatus(status)}</span>{connection?.external_account_name ? <p className="mt-2 truncate text-xs text-[var(--mid)]">{connection.external_account_name}</p> : null}</div>;
                                })}</div>
                                <Link href="/dashboard/connections" className="btn-secondary mt-5 inline-flex">Manage connections</Link>
                            </div>

                            <div className="dashboard-panel p-6">
                                <SectionHeading title="Update queue" description="When stock or price changes, ORVA tracks what needs to be updated." />
                                {!pendingTasks.length ? <p className="text-sm text-[var(--mid)]">No pending updates. Your catalog is tidy.</p> : <div className="space-y-3">{pendingTasks.map((task) => <div key={task.id} className="rounded-xl border border-[var(--border)] bg-white p-4"><p className="text-sm font-bold">{task.title}</p><div className="mt-2 flex flex-wrap gap-2"><span className="dashboard-badge badge-blue">{prettyStatus(task.channel)}</span><span className={`dashboard-badge ${syncBadge(task.status)}`}>{prettyStatus(task.status)}</span></div></div>)}</div>}
                                <Link href="/dashboard/update-tasks" className="btn-secondary mt-5 inline-flex">View all updates</Link>
                            </div>
                        </section>
                        {publishProduct ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,18,35,0.64)] p-4" role="dialog" aria-modal="true" aria-labelledby="dashboard-publish-title">
                            <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-2xl">
                                <div className="flex items-start justify-between gap-4">
                                    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{publishDetails.eyebrow}</p><h2 id="dashboard-publish-title" className="mt-2 text-2xl font-bold">{publishDetails.title}</h2></div>
                                    <button type="button" className="rounded-lg p-2 text-[var(--mid)] transition hover:bg-[var(--surface)]" aria-label="Close publish preview" onClick={() => setPublishProduct(null)}><X className="h-5 w-5" /></button>
                                </div>
                                <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr]">
                                    <div className="space-y-3">
                                        {publishProduct.cleaned_image_url || publishProduct.image_url ? <div className="aspect-square rounded-xl border border-[var(--border)] bg-cover bg-center" style={{ backgroundImage: `url(${publishProduct.cleaned_image_url || publishProduct.image_url})` }} /> : <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]"><ImageIcon className="h-8 w-8 text-[var(--muted)]" /></div>}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">{productName(publishProduct)}</h3>
                                        <div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="dashboard-badge badge-blue">{formatINR(publishProduct.price || 0)}</span><span className={`dashboard-badge ${statusBadge(publishProduct.status)}`}>{formatInventoryStatus(publishProduct.status)}</span></div>
                                        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Review copy</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={writingAI} onClick={writeWithAi}>{writingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{writingAI ? "Writing..." : "Write with AI"}</button>
                                                    <button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={savingCaption} onClick={saveCurrentCaption}>{savingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{savingCaption ? "Saving..." : "Save Caption"}</button>
                                                    <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setEditingCopy((current) => !current)}><Pencil className="h-3.5 w-3.5" />{editingCopy ? "Preview" : "Edit"}</button>
                                                </div>
                                            </div>
                                            {editingCopy ? <textarea className="form-field min-h-44 bg-white text-sm leading-6" value={editedCopy} onChange={(event) => setEditedCopy(event.target.value)} placeholder="Write the caption or catalog text..." /> : <p className="whitespace-pre-line text-sm leading-6 text-[var(--mid)]">{editedCopy || publishDetails.copy}</p>}
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{publishDetails.note}</p>
                                <div className="mt-5 flex flex-wrap justify-end gap-2">
                                    <button type="button" className="btn-secondary" onClick={copyPublishCopy}><Copy className="h-4 w-4" />{publishDetails.copyLabel}</button>
                                    <button type="button" className="btn-secondary" onClick={() => setPublishProduct(null)}>Cancel</button>
                                    <button type="button" className="btn-primary" disabled={publishing} onClick={publishSelectedProduct}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{publishing ? "Publishing..." : publishDetails.actionLabel}</button>
                                </div>
                            </section>
                        </div> : null}
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}

export function ProductsPage() {
    const getToken = useToken();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const [onboarding, setOnboarding] = useState({ active: false });
    const [pendingDeleteId, setPendingDeleteId] = useState("");
    const [workingId, setWorkingId] = useState("");
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [facebookProduct, setFacebookProduct] = useState(null);
    const [publishChannel, setPublishChannel] = useState("facebook");
    const [publishing, setPublishing] = useState(false);
    const [editedCopy, setEditedCopy] = useState("");
    const [editingCopy, setEditingCopy] = useState(false);
    const [writingAI, setWritingAI] = useState(false);
    const [savingCaption, setSavingCaption] = useState(false);
    const [requestingWhatsApp, setRequestingWhatsApp] = useState(false);
    const [whatsappRequested, setWhatsappRequested] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [response, onboardingResponse, tasksResponse] = await Promise.all([
            fetch("/api/inventory", { headers }),
            fetch("/api/onboarding/application", { headers }),
            fetch("/api/update-tasks", { headers }),
        ]);
        const [result, onboardingResult, tasksResult] = await Promise.all([readJson(response), readJson(onboardingResponse), readJson(tasksResponse)]);
        const nextProducts = result.products || [];
        setProducts(nextProducts);
        setOnboarding(onboardingResponse.ok ? onboardingResult : { active: false });
        setWhatsappRequested(tasksResponse.ok ? hasOpenWhatsAppCatalogRequest(tasksResult.tasks || []) : false);
        setSelectedProductIds((current) => current.filter((id) => nextProducts.some((product) => product.id === id)));
        setError(response.ok ? "" : result.error || "Could not load products.");
        setLoading(false);
    }, [getToken]);
    useEffect(() => { queueMicrotask(load); }, [load]);

    const allProductsSelected = products.length > 0 && selectedProductIds.length === products.length;
    const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));

    const toggleProductSelection = (productId) => {
        setBulkDeleteConfirm(false);
        setSelectedProductIds((current) =>
            current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId]
        );
    };

    const toggleSelectAll = () => {
        setBulkDeleteConfirm(false);
        setSelectedProductIds(allProductsSelected ? [] : products.map((product) => product.id));
    };

    const deleteProduct = async (product) => {
        if (pendingDeleteId !== product.id) {
            setPendingDeleteId(product.id);
            setMessage({ type: "error", text: `Click Confirm Delete to remove ${productName(product)}.` });
            return;
        }
        setWorkingId(product.id);
        const token = await getToken();
        const response = await fetch(`/api/inventory/${product.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        setWorkingId("");
        setPendingDeleteId("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not delete product." });
        setProducts((current) => current.filter((item) => item.id !== product.id));
        setSelectedProductIds((current) => current.filter((id) => id !== product.id));
        setMessage({ type: "success", text: "Product deleted." });
    };

    const deleteSelectedProducts = async () => {
        if (!selectedProductIds.length) {
            setMessage({ type: "error", text: "Select products before deleting." });
            return;
        }

        if (!bulkDeleteConfirm) {
            setBulkDeleteConfirm(true);
            setMessage({ type: "error", text: `Click Confirm Delete Selected to remove ${selectedProductIds.length} product${selectedProductIds.length === 1 ? "" : "s"}.` });
            return;
        }

        setBulkDeleting(true);
        const token = await getToken();
        const deletedIds = [];
        const failures = [];

        for (const product of selectedProducts) {
            const response = await fetch(`/api/inventory/${product.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await readJson(response);
            if (response.ok) deletedIds.push(product.id);
            else failures.push(result.error || `Could not delete ${productName(product)}.`);
        }

        setBulkDeleting(false);
        setBulkDeleteConfirm(false);
        setProducts((current) => current.filter((product) => !deletedIds.includes(product.id)));
        setSelectedProductIds((current) => current.filter((id) => !deletedIds.includes(id)));
        setMessage(failures.length
            ? { type: "error", text: `${deletedIds.length} deleted. ${failures[0]}` }
            : { type: "success", text: `${deletedIds.length} product${deletedIds.length === 1 ? "" : "s"} deleted.` }
        );
    };

    const requestWhatsAppCatalog = async () => {
        setRequestingWhatsApp(true);
        const result = await requestWhatsAppCatalogSetup(getToken, selectedProductIds);
        setRequestingWhatsApp(false);
        if (!result.ok) return setMessage({ type: "error", text: result.error || "Could not create WhatsApp catalog task." });
        setWhatsappRequested(true);
        setMessage({
            type: "success",
            text: selectedProductIds.length
                ? `WhatsApp catalog task created for ${selectedProductIds.length} selected product${selectedProductIds.length === 1 ? "" : "s"}.`
                : result.message || "WhatsApp catalog task created for admin review.",
        });
    };

    const publishDetails = publishChannel === "instagram"
        ? {
            eyebrow: "Instagram Post Export",
            title: "Preview Instagram post",
            copy: publishCopyForChannel(publishChannel, facebookProduct || {}),
            copyLabel: "Copy Caption",
            actionLabel: "Publish Instagram Post",
            endpoint: "/api/instagram/publish-product",
            note: "This publishes one reviewed image post to the Instagram professional account linked to your connected Facebook Page.",
        }
        : {
            eyebrow: "Facebook Page Export",
            title: "Preview Facebook post",
            copy: publishCopyForChannel(publishChannel, facebookProduct || {}),
            copyLabel: "Copy Caption",
            actionLabel: "Publish Facebook Post",
            endpoint: "/api/facebook/page/publish-product",
            note: "This publishes one reviewed post to your connected Facebook Page. Marketplace publishing is not included.",
        };

    const openPublisher = async (product, channel) => {
        setPublishChannel(channel);
        setFacebookProduct(product);
        const fallback = publishCopyForChannel(channel, product);
        setEditedCopy(fallback);
        setEditingCopy(false);
        const saved = await loadSavedPublishCopy(getToken, product.id, channel);
        if (saved.ok && saved.copy) {
            setEditedCopy(saved.copy);
        }
    };

    const copyFacebookCaption = async () => {
        if (!facebookProduct) return;
        try {
            await navigator.clipboard.writeText(editedCopy || publishDetails.copy);
            setMessage({ type: "success", text: `${publishDetails.copyLabel.replace("Copy ", "")} copied.` });
        } catch {
            setMessage({ type: "error", text: "Could not copy automatically. Please select and copy the caption manually." });
        }
    };

    const writeWithAi = async () => {
        if (!facebookProduct) return;
        setWritingAI(true);
        const token = await getToken();
        const response = await fetch("/api/social-content/write-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                productId: facebookProduct.id,
                channel: publishChannel,
                currentText: editedCopy || publishDetails.copy,
            }),
        });
        const result = await readJson(response);
        setWritingAI(false);
        if (!response.ok) {
            return setMessage({ type: "error", text: result.error || "Could not write with AI right now." });
        }
        setEditedCopy(result.copy || editedCopy || publishDetails.copy);
        setEditingCopy(true);
        setMessage({ type: result.configured === false ? "error" : "success", text: result.warning || "AI draft ready. Review it before publishing." });
    };

    const saveCurrentCaption = async () => {
        if (!facebookProduct) return;
        setSavingCaption(true);
        const result = await savePublishCopy(getToken, facebookProduct.id, publishChannel, editedCopy || publishDetails.copy);
        setSavingCaption(false);
        if (!result.ok) {
            return setMessage({ type: "error", text: result.error || "Could not save caption." });
        }
        setEditedCopy(result.copy || editedCopy || publishDetails.copy);
        setMessage({ type: "success", text: result.message || "Caption saved for this product." });
    };

    const publishFacebookProduct = async () => {
        if (!facebookProduct) return;
        setPublishing(true);
        const token = await getToken();
        const response = await fetch(publishDetails.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ productId: facebookProduct.id, caption: editedCopy || publishDetails.copy }),
        });
        const result = await readJson(response);
        setPublishing(false);
        if (!response.ok) {
            return setMessage({ type: "error", text: result.error || "Could not publish this product. Copy the prepared text and complete the update manually." });
        }
        setFacebookProduct(null);
        setMessage({ type: "success", text: result.message || "Product published successfully." });
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Catalog" title="Products" description="Keep your master inventory accurate. ORVA tracks the channel updates for you.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {!onboarding.active ? (
                    <section className="dashboard-panel mb-5 border-l-4 border-l-amber-400 p-5">
                        <p className="font-bold">Publishing is locked until your ORVA account is activated.</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--mid)]">You can add and edit products now. Facebook and Instagram publishing unlock after manual account activation.</p>
                        <Link href="/dashboard/onboarding" className="btn-primary mt-4 inline-flex">Complete onboarding</Link>
                    </section>
                ) : null}
                <section className="dashboard-panel overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
                        <div><h2 className="text-xl font-bold">Product list</h2><p className="mt-1 text-sm text-[var(--mid)]">Update details once. ORVA adds the required channel work to your queue.</p></div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-secondary" disabled={!products.length || !onboarding.active || requestingWhatsApp || whatsappRequested} onClick={requestWhatsAppCatalog}>
                                {requestingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChannelLogo channel="whatsapp" />}
                                {whatsappRequested ? "WhatsApp Catalog Requested" : selectedProductIds.length ? "Request WhatsApp for Selected" : "Request WhatsApp Catalog"}
                            </button>
                            <Link href="/dashboard/products/new" className="btn-primary"><Plus className="h-4 w-4" />Add product</Link>
                        </div>
                    </div>
                    {loading ? <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : error ? <ErrorState title="Could not load products" message={error} onRetry={load} className="m-5" /> : !products.length ? (
                        <EmptyState title="No products yet" description="Upload a CSV or add your first product." action={<Link href="/dashboard/upload-inventory" className="btn-primary mt-6 inline-flex">Upload inventory</Link>} className="m-5" />
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
                                <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                                    <input
                                        type="checkbox"
                                        checked={allProductsSelected}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-[var(--border)]"
                                    />
                                    Select all
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-sm font-semibold text-[var(--mid)]">{selectedProductIds.length} selected</span>
                                    {selectedProductIds.length ? (
                                        <button
                                            type="button"
                                            className={`btn-secondary px-3 py-2 ${bulkDeleteConfirm ? "border-red-200 bg-red-50 text-red-700" : ""}`}
                                            disabled={bulkDeleting}
                                            onClick={deleteSelectedProducts}
                                        >
                                            {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            {bulkDeleteConfirm ? "Confirm Delete Selected" : "Delete Selected"}
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            <table className="data-table min-w-[1160px]">
                                <thead><tr><th>Select</th><th>Image</th><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>{products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.includes(product.id)}
                                                onChange={() => toggleProductSelection(product.id)}
                                                aria-label={`Select ${productName(product)}`}
                                                className="h-4 w-4 rounded border-[var(--border)]"
                                            />
                                        </td>
                                        <td><ProductThumb product={product} /></td>
                                        <td className="font-semibold">{productName(product)}</td>
                                        <td>{productCode(product) || "-"}</td>
                                        <td>{product.category || "-"}</td>
                                        <td>{formatINR(product.price || 0)}</td>
                                        <td>{productStock(product)}</td>
                                        <td><span className={`dashboard-badge ${statusBadge(product.status)}`}>{prettyStatus(product.status)}</span></td>
                                        <td><div className="grid min-w-[420px] grid-cols-4 gap-2">
                                            <Link href={`/dashboard/products/${product.id}`} className="btn-secondary justify-center px-3 py-2" title="Edit product"><Pencil className="h-4 w-4" />Edit</Link>
                                            <button type="button" className="btn-secondary justify-center px-3 py-2" title="Publish to Instagram" aria-label={`Publish ${productName(product)} to Instagram`} disabled={!onboarding.active} onClick={() => openPublisher(product, "instagram")}><ChannelLogo channel="instagram" />Publish</button>
                                            <button type="button" className="btn-secondary justify-center px-3 py-2" title="Publish to Facebook Page" aria-label={`Publish ${productName(product)} to Facebook Page`} disabled={!onboarding.active} onClick={() => openPublisher(product, "facebook")}><ChannelLogo channel="facebook" />Publish</button>
                                            <button type="button" className={`btn-secondary justify-center px-3 py-2 ${pendingDeleteId === product.id ? "border-red-200 bg-red-50 text-red-700" : ""}`} title="Delete product" disabled={workingId === product.id} onClick={() => deleteProduct(product)}><Trash2 className="h-4 w-4" />{pendingDeleteId === product.id ? "Confirm" : "Delete"}</button>
                                        </div></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </section>
                {facebookProduct ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,18,35,0.64)] p-4" role="dialog" aria-modal="true" aria-labelledby="facebook-export-title">
                    <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{publishDetails.eyebrow}</p><h2 id="facebook-export-title" className="mt-2 text-2xl font-bold">{publishDetails.title}</h2></div>
                            <button type="button" className="rounded-lg p-2 text-[var(--mid)] transition hover:bg-[var(--surface)]" aria-label="Close Facebook export preview" onClick={() => setFacebookProduct(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr]">
                            <div className="space-y-3">
                                {facebookProduct.cleaned_image_url || facebookProduct.image_url ? <div className="aspect-square rounded-xl border border-[var(--border)] bg-cover bg-center" style={{ backgroundImage: `url(${facebookProduct.cleaned_image_url || facebookProduct.image_url})` }} /> : <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]"><ImageIcon className="h-8 w-8 text-[var(--muted)]" /></div>}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{productName(facebookProduct)}</h3>
                                <div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="dashboard-badge badge-blue">{formatINR(facebookProduct.price || 0)}</span><span className={`dashboard-badge ${statusBadge(facebookProduct.status)}`}>{formatInventoryStatus(facebookProduct.status)}</span></div>
                                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Review copy</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={writingAI} onClick={writeWithAi}>
                                                {writingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                {writingAI ? "Writing..." : "Write with AI"}
                                            </button>
                                            <button type="button" className="btn-secondary px-3 py-2 text-xs" disabled={savingCaption} onClick={saveCurrentCaption}>
                                                {savingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                {savingCaption ? "Saving..." : "Save Caption"}
                                            </button>
                                            <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setEditingCopy((current) => !current)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                                {editingCopy ? "Preview" : "Edit"}
                                            </button>
                                        </div>
                                    </div>
                                    {editingCopy ? (
                                        <textarea
                                            className="form-field min-h-44 bg-white text-sm leading-6"
                                            value={editedCopy}
                                            onChange={(event) => setEditedCopy(event.target.value)}
                                            placeholder="Write the caption or catalog text..."
                                        />
                                    ) : (
                                        <p className="whitespace-pre-line text-sm leading-6 text-[var(--mid)]">{editedCopy || publishDetails.copy}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{publishDetails.note}</p>
                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button type="button" className="btn-secondary" onClick={copyFacebookCaption}><Copy className="h-4 w-4" />{publishDetails.copyLabel}</button>
                            <button type="button" className="btn-secondary" onClick={() => setFacebookProduct(null)}>Cancel</button>
                            <button type="button" className="btn-primary" disabled={publishing} onClick={publishFacebookProduct}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{publishing ? "Publishing..." : publishDetails.actionLabel}</button>
                        </div>
                    </section>
                </div> : null}
            </DashboardShell>
        </AuthGate>
    );
}

function parseCsvLine(line) {
    const cells = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
        else if (char === '"') quoted = !quoted;
        else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
        else value += char;
    }
    cells.push(value.trim());
    return cells;
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().trim());
    return lines.slice(1).map((line, index) => {
        const row = Object.fromEntries(headers.map((header, cellIndex) => [header, parseCsvLine(line)[cellIndex] || ""]));
        const product = {
            row: index + 2,
            name: row.name || row["product name"] || "",
            sku: row.sku || row["product code"] || "",
            category: row.category || "",
            price: row.price || "",
            stock: row.stock || "",
            description: row.description || row.notes || "",
            image_url: row.image_url || row["image url"] || "",
        };
        const errors = [];
        if (!product.name) errors.push("name is required");
        if (product.price === "" || Number.isNaN(Number(product.price))) errors.push("price must be numeric");
        if (product.stock === "" || Number.isNaN(Number(product.stock))) errors.push("stock must be numeric");
        return { ...product, errors };
    });
}

export function UploadInventoryPage() {
    const getToken = useToken();
    const [rows, setRows] = useState([]);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [importing, setImporting] = useState(false);
    const validRows = rows.filter((row) => !row.errors.length);
    const failedRows = rows.filter((row) => row.errors.length);

    const importRows = async () => {
        if (!validRows.length) return setMessage({ type: "error", text: "Upload a CSV with valid products first." });
        setImporting(true);
        const token = await getToken();
        const response = await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ products: validRows }),
        });
        const result = await readJson(response);
        setImporting(false);
        setMessage(response.ok ? { type: "success", text: `${result.products?.length || 0} products imported.` } : { type: "error", text: result.error || "Could not import products." });
        if (response.ok) setRows([]);
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Catalog" title="Upload Inventory" description="Import your existing inventory list in a few minutes.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="dashboard-panel p-6">
                    <SectionHeading title="Upload CSV" description="Columns: name, sku, category, price, stock, description, image_url" />
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center transition hover:border-[var(--accent)] hover:bg-white">
                        <FileSpreadsheet className="h-8 w-8 text-[var(--accent)]" />
                        <span className="mt-3 font-semibold">Choose inventory CSV</span>
                        <span className="mt-1 text-sm text-[var(--mid)]">Required: name, price, stock</span>
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (file) setRows(parseCsv(await file.text()));
                            event.target.value = "";
                        }} />
                    </label>
                </section>
                {rows.length ? <section className="dashboard-panel mt-6 p-6">
                    <SectionHeading title="Import preview" description={`${rows.length} total rows · ${validRows.length} ready · ${failedRows.length} failed`} action={<button type="button" className="btn-primary" disabled={importing || !validRows.length} onClick={importRows}>{importing ? "Importing..." : "Import valid rows"}</button>} />
                    <div className="overflow-x-auto"><table className="data-table min-w-[760px]"><thead><tr><th>Row</th><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Validation</th></tr></thead><tbody>{rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.name || "-"}</td><td>{row.sku || "Auto"}</td><td>{row.price}</td><td>{row.stock}</td><td className={row.errors.length ? "text-red-700" : "text-emerald-700"}>{row.errors.length ? row.errors.join(", ") : "Ready"}</td></tr>)}</tbody></table></div>
                </section> : null}
            </DashboardShell>
        </AuthGate>
    );
}

export function ConnectionsPage() {
    const getToken = useToken();
    const [connections, setConnections] = useState([]);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const timeoutRef = useRef({});
    const metaMockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    const facebookTimeoutMessage = "Meta connection failed. For local testing, add localhost in App Domains and add the exact OAuth redirect URI in Facebook Login settings.";

    const load = useCallback(async () => {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const connectionResponse = await fetch("/api/connections", { headers });
        const connectionResult = await readJson(connectionResponse);
        if (connectionResponse.ok) {
            setConnections(connectionResult.connections || []);
            if (connectionResult.configuration_error) setMessage({ type: "error", text: connectionResult.configuration_error });
        }
        else setMessage({ type: "error", text: connectionResult.error || "Could not load connections." });
    }, [getToken]);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const facebookStatus = params.get("facebook");
        const callbackMessage = params.get("message");
        queueMicrotask(() => {
            if (facebookStatus === "connected") setMessage({ type: "success", text: "Facebook connected successfully." });
            if (facebookStatus === "failed") setMessage({ type: "error", text: callbackMessage || "Facebook connection failed. Please try again." });
            load();
        });
    }, [load]);

    const setConnection = (connection) => {
        if (!connection?.channel) return;
        setConnections((current) => [...current.filter((item) => item.channel !== connection.channel), connection]);
    };

    const clearConnectionTimeout = (channel) => {
        if (!timeoutRef.current[channel]) return;
        window.clearTimeout(timeoutRef.current[channel]);
        delete timeoutRef.current[channel];
    };

    const failConnection = useCallback((channel, text) => {
        setWorking((current) => current === channel ? "" : current);
        setConnections((current) => current.map((item) => item.channel === channel ? { ...item, status: "failed" } : item));
        setMessage({ type: "error", text });
    }, []);

    const startConnectionTimeout = useCallback((channel, delay = 15000, onTimeout, timeoutMessage = "Connection could not be completed. Please try again.") => {
        if (timeoutRef.current[channel]) window.clearTimeout(timeoutRef.current[channel]);
        timeoutRef.current[channel] = window.setTimeout(() => {
            delete timeoutRef.current[channel];
            onTimeout?.();
            failConnection(channel, timeoutMessage);
        }, Math.max(0, delay));
    }, [failConnection]);

    useEffect(() => {
        const pendingFacebook = connections.find((item) => item.channel === "facebook" && item.status === "connecting");
        if (!pendingFacebook || working === "facebook" || timeoutRef.current.facebook) return;
        const elapsed = Date.now() - new Date(pendingFacebook.updated_at || 0).getTime();
        startConnectionTimeout("facebook", 15000 - elapsed, undefined, facebookTimeoutMessage);
    }, [connections, facebookTimeoutMessage, startConnectionTimeout, working]);

    useEffect(() => () => {
        Object.values(timeoutRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    }, []);

    const connect = async (channel) => {
        setWorking(channel);
        setConnection({ channel, status: "connecting" });
        setMessage({ type: "", text: "" });
        const controller = new AbortController();
        startConnectionTimeout(channel, 15000, () => controller.abort(), channel === "facebook" ? facebookTimeoutMessage : undefined);
        let redirecting = false;
        try {
            if (channel === "facebook" && metaMockMode) {
                await new Promise((resolve) => window.setTimeout(resolve, 1000));
                clearConnectionTimeout(channel);
                setConnection({ channel, provider: "meta", status: "connected", external_account_name: "ORVA Demo Facebook Page" });
                setMessage({ type: "success", text: "Facebook connected in demo mode." });
                return;
            }
            const token = await getToken();
            const endpoint = channel === "whatsapp"
                ? "/api/whatsapp/embedded-signup"
                : channel === "facebook" || channel === "instagram"
                    ? "/api/auth/facebook/login"
                    : `/api/meta/login?channel=${channel}`;
            const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Could not connect channel.");
            if (result.authorization_url) {
                redirecting = true;
                window.location.assign(result.authorization_url);
                return;
            }
            clearConnectionTimeout(channel);
            if (result.connection) setConnection(result.connection);
            setMessage({ type: "success", text: `${channels.find((item) => item.id === channel)?.name} connected.` });
        } catch (error) {
            clearConnectionTimeout(channel);
            failConnection(channel, channel === "facebook" ? `${facebookTimeoutMessage} ${error.message || ""}`.trim() : error.message || "Could not connect channel.");
        } finally {
            if (!redirecting) {
                clearConnectionTimeout(channel);
                setWorking((current) => current === channel ? "" : current);
            }
        }
    };

    const retry = (channel) => {
        clearConnectionTimeout(channel);
        setWorking("");
        setConnection({ channel, status: "not_connected" });
        setMessage({ type: "", text: "" });
    };

    const disconnect = async (channel) => {
        setWorking(channel);
        const token = await getToken();
        const response = await fetch("/api/connections/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ channel }),
        });
        const result = await readJson(response);
        setWorking("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not disconnect channel." });
        setConnection(result.connection);
        setMessage({ type: "success", text: `${channels.find((item) => item.id === channel)?.name} disconnected.` });
    };

    const verifyInstagram = async () => {
        setWorking("verify-instagram");
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch("/api/instagram/verify", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJson(response);
        setWorking("");
        if (!response.ok) {
            setConnection({ channel: "instagram", status: "failed", external_account_name: "Instagram verification failed" });
            return setMessage({ type: "error", text: result.error || "Could not verify Instagram Business." });
        }
        if (result.account?.username) {
            setConnection({ channel: "instagram", provider: "meta", status: "connected", external_account_name: `@${result.account.username}` });
        }
        setMessage({ type: "success", text: result.message || "Instagram Business verified." });
        load();
    };

    return <AuthGate allowedRoles="client"><DashboardShell role="client" eyebrow="Channels" title="Connections" description="Connect the places where customers find your products.">
        <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
        <section className="dashboard-panel mb-5 border-l-4 border-l-[var(--accent)] p-5 text-sm leading-6 text-[var(--mid)]">ORVA can publish reviewed posts to connected Instagram and Facebook accounts. WhatsApp catalog updates are handled as manual catalog-ready support until Meta catalog access is fully approved for each business.</section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{channels.map((channel) => {
            const Icon = channel.icon;
            const connection = connections.find((item) => item.channel === channel.id);
            const status = channel.id === "whatsapp" ? "manual_setup" : connection?.status || "manual_setup";
            const connected = status === "connected";
            const connecting = status === "connecting" || working === channel.id;
            const connectLabel = channel.id === "whatsapp"
                ? "Connect WhatsApp Business"
                : channel.id === "facebook"
                    ? "Connect Facebook"
                    : "Connect Meta";
            return <section key={channel.id} className="dashboard-panel p-6"><Icon className="h-6 w-6 text-[var(--accent)]" /><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{channel.name}</h2><span className={`dashboard-badge ${connectionBadge(status)}`}>{prettyStatus(status)}</span></div>{channel.id === "facebook" && metaMockMode ? <span className="dashboard-badge badge-blue mt-3">Demo Mode</span> : null}<p className="mt-3 text-sm leading-6 text-[var(--mid)]">{channel.description}</p>{connection?.external_account_name && channel.id !== "whatsapp" ? <p className="mt-3 text-sm font-semibold">{connection.external_account_name}</p> : null}{channel.id === "whatsapp" ? <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--mid)]">Catalog-ready support only</div> : channel.id === "online_store" ? <Link href="/dashboard/preview-studio" className="btn-secondary mt-6 w-full">Open preview</Link> : connected && channel.id === "instagram" ? <div className="mt-6 grid gap-2"><button type="button" className="btn-primary w-full justify-center" disabled={working === "verify-instagram"} onClick={verifyInstagram}>{working === "verify-instagram" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{working === "verify-instagram" ? "Verifying..." : "Verify Instagram"}</button><button type="button" className="btn-secondary w-full" disabled={working === channel.id} onClick={() => disconnect(channel.id)}>Disconnect</button></div> : connected ? <button type="button" className="btn-secondary mt-6 w-full" disabled={working === channel.id} onClick={() => disconnect(channel.id)}>Disconnect</button> : status === "failed" ? <button type="button" className="btn-secondary mt-6 w-full" onClick={() => retry(channel.id)}>Retry</button> : <button type="button" className="btn-secondary mt-6 w-full" disabled={connecting} onClick={() => connect(channel.id)}>{connecting ? "Connecting..." : connectLabel}</button>}</section>;
        })}</div>
    </DashboardShell></AuthGate>;
}

export function SyncCenterPage() {
    const getToken = useToken();
    const [logs, setLogs] = useState([]);
    const [working, setWorking] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const load = useCallback(async () => {
        const token = await getToken();
        const response = await fetch("/api/sync", { headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        if (response.ok) setLogs(result.logs || []);
        else setMessage({ type: "error", text: result.error || "Could not load sync logs." });
    }, [getToken]);
    useEffect(() => { queueMicrotask(load); }, [load]);

    const runSync = async () => {
        setWorking("all");
        const token = await getToken();
        const response = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}" });
        const result = await readJson(response);
        setWorking("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not sync products." });
        setLogs((current) => [...(result.logs || []), ...current]);
        setMessage({ type: "success", text: "Product sync finished." });
    };
    const retry = async (logId) => {
        setWorking(logId);
        const token = await getToken();
        const response = await fetch(`/api/sync/${logId}/retry`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        setWorking("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not retry sync." });
        setLogs((current) => current.map((log) => log.id === logId ? { ...log, ...result.log } : log));
        setMessage({ type: "success", text: "Sync retried." });
    };

    return <AuthGate allowedRoles="client"><DashboardShell role="client" eyebrow="Channels" title="Sync Center" description="Review channel updates and retry anything that needs attention.">
        <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
        <section className="dashboard-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="text-xl font-bold">Sync logs</h2><p className="mt-1 text-sm text-[var(--mid)]">Mock sync results for Instagram and Facebook.</p></div><button type="button" className="btn-primary" disabled={working === "all"} onClick={runSync}><RefreshCw className={`h-4 w-4 ${working === "all" ? "animate-spin" : ""}`} />Sync all products</button></div>
        {!logs.length ? <EmptyState title="No syncs yet" description="Add products, then run your first sync." action={<Link href="/dashboard/products" className="btn-primary mt-6 inline-flex">View products</Link>} className="m-5" /> : <div className="overflow-x-auto"><table className="data-table min-w-[820px]"><thead><tr><th>Product</th><th>Channel</th><th>Status</th><th>Last synced</th><th>Error</th><th>Action</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td className="font-semibold">{log.products?.name || log.products?.product_name || "Product"}</td><td className="capitalize">{log.channel}</td><td><span className={`dashboard-badge ${syncBadge(log.status)}`}>{prettyStatus(log.status)}</span></td><td>{log.last_synced_at ? formatStableDateTime(log.last_synced_at) : "-"}</td><td>{log.error_message || "-"}</td><td>{log.status === "failed" ? <button type="button" className="btn-secondary px-3 py-2" disabled={working === log.id} onClick={() => retry(log.id)}>Retry</button> : "-"}</td></tr>)}</tbody></table></div>}</section>
    </DashboardShell></AuthGate>;
}

export function SettingsPage() {
    return <AuthGate allowedRoles="client"><DashboardShell role="client" eyebrow="Workspace" title="Settings" description="Keep your ORVA workspace simple and ready to sync.">
        <section className="dashboard-panel p-6"><SectionHeading title="Workspace settings" description="Your authentication and product data stay connected to Supabase." /><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-[var(--border)] bg-white p-4"><Settings className="h-5 w-5 text-[var(--accent)]" /><p className="mt-4 font-semibold">Catalog update mode</p><p className="mt-1 text-sm text-[var(--mid)]">Hybrid tracking is enabled. ORVA creates channel update tasks after product changes.</p></div><div className="rounded-xl border border-[var(--border)] bg-white p-4"><ExternalLink className="h-5 w-5 text-[var(--accent)]" /><p className="mt-4 font-semibold">Meta integrations</p><p className="mt-1 text-sm text-[var(--mid)]">Real-time APIs can be enabled after platform approval. Manual completion works now.</p></div></div></section>
    </DashboardShell></AuthGate>;
}
