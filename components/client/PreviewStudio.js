"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    ArrowLeft,
    Heart,
    ImageIcon,
    Images,
    Loader2,
    Menu,
    MessageCircle,
    MoreHorizontal,
    RefreshCw,
    Search,
    Send,
    Share2,
    Smartphone,
    Sparkles,
    Store,
    ThumbsUp,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { buildInstagramCaption, formatInventoryStatus, productName, productNotes, productStock } from "../../app/lib/inventory";
import { formatINR } from "../../app/lib/pricing";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage } from "../DashboardUI";

const tabs = [
    { id: "instagram_post", label: "Instagram Post", icon: Images },
    { id: "instagram_reel", label: "Instagram Reel", icon: Smartphone },
    { id: "whatsapp_catalog", label: "WhatsApp Catalog", icon: MessageCircle },
    { id: "whatsapp_status", label: "WhatsApp Status", icon: Store },
];

function previewImage(product, className = "") {
    const image = product?.cleaned_image_url || product?.image_url;
    if (!image) {
        return <div className={`flex items-center justify-center bg-[#EEF3FB] text-[#7E91AF] ${className}`}><ImageIcon className="h-7 w-7" /></div>;
    }
    return <div className={`bg-cover bg-center ${className}`} style={{ backgroundImage: `url(${image})` }} />;
}

function whatsappText(product) {
    return productNotes(product) || `${productName(product)} is available now. Send us a message to place your order.`;
}

function facebookText(product) {
    return `${productName(product)} is now available${product.category ? ` in ${product.category}` : ""}. ${productNotes(product) || "Message us for details and ordering."}`;
}

function PhoneFrame({ children, tone = "light" }) {
    return (
        <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[38px] border-[9px] border-[#101820] bg-white shadow-[0_28px_70px_rgba(16,32,46,0.24)]">
            <div className={`flex h-7 items-center justify-between px-5 text-[10px] font-bold ${tone === "dark" ? "bg-[#075E54] text-white" : "bg-white text-[#1D2939]"}`}>
                <span>9:41</span>
                <span className={`h-4 w-20 rounded-full ${tone === "dark" ? "bg-black/25" : "bg-[#101820]"}`} />
                <span>5G ▰</span>
            </div>
            <div className="h-[690px] overflow-y-auto bg-white">
                {children}
            </div>
            <div className="flex h-6 items-center justify-center bg-white"><span className="h-1 w-28 rounded-full bg-[#101820]/80" /></div>
        </div>
    );
}

function StorePreview({ products, selectedId, brand }) {
    return (
        <PhoneFrame>
            <div className="px-5 pb-5 pt-6 text-white" style={{ background: `linear-gradient(135deg, ${brand.accent_color}, #102E5A)` }}>
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">ORVA Store</p>
                    <Menu className="h-5 w-5 text-white/80" />
                </div>
                <h3 className="mt-5 text-2xl font-bold">{brand.business_name}</h3>
                <p className="mt-1 text-sm text-white/75">{brand.tagline}</p>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 text-xs text-white/75 backdrop-blur">
                    <Search className="h-4 w-4" /> Search products
                </div>
            </div>
            <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#10202E]">Available products</p>
                    <span className="text-xs font-semibold text-[#6C7C91]">{products.length} items</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {products.slice(0, 6).map((product) => (
                        <div key={product.id} className={`overflow-hidden rounded-xl border bg-white transition ${selectedId === product.id ? "border-[#86A8FF] ring-2 ring-[#DCE7FF]" : "border-[#E1E8F2]"}`}>
                            {previewImage(product, "aspect-square")}
                            <div className="p-2.5">
                                <p className="truncate text-xs font-bold text-[#10202E]">{productName(product)}</p>
                                <p className="mt-1 text-xs font-bold" style={{ color: brand.accent_color }}>{formatINR(product.price || 0)}</p>
                                <p className="mt-1 text-[10px] font-semibold text-[#6C7C91]">{formatInventoryStatus(product.status)}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <a href={brand.whatsapp_number ? `https://wa.me/${brand.whatsapp_number.replace(/\D/g, "")}` : "#"} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#16A46D] px-4 py-3 text-sm font-bold text-white">
                    <MessageCircle className="h-4 w-4" /> Order on WhatsApp
                </a>
            </div>
        </PhoneFrame>
    );
}

function WhatsAppPreview({ products, selectedId, onSelect, brand }) {
    const product = products.find((item) => item.id === selectedId) || products[0];
    return (
        <PhoneFrame tone="dark">
            <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
                <ArrowLeft className="h-5 w-5" />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">{brand.business_name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{brand.business_name}</p><p className="text-xs text-white/65">Business account</p></div>
                <Search className="h-5 w-5" />
                <MoreHorizontal className="h-5 w-5" />
            </div>
            <div className="min-h-full bg-[#ECE5DD] p-3">
                <div className="mb-3 rounded-lg bg-[#D9FDD3] p-3 text-xs leading-5 text-[#34443F] shadow-sm">
                    Browse our catalog and message us to order.
                </div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#54716B]">Catalog</p>
                <div className="grid grid-cols-2 gap-2.5">
                    {products.slice(0, 6).map((product) => (
                        <button key={product.id} type="button" onClick={() => onSelect(product.id)} className={`overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 ${selectedId === product.id ? "border-[#25D366] ring-2 ring-[#25D366]/20" : "border-white"}`}>
                            {previewImage(product, "aspect-[1.16]")}
                            <div className="p-3">
                                <p className="truncate text-xs font-bold text-[#1A2B2A]">{productName(product)}</p>
                                <p className="mt-1 text-xs font-bold text-[#075E54]">{formatINR(product.price || 0)}</p>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="mt-3 rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-xs font-bold text-[#1A2B2A]">{productName(product)}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#667085]">{whatsappText(product)}</p>
                    <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#25D366] px-3 py-2 text-xs font-bold text-[#087B61]"><MessageCircle className="h-3.5 w-3.5" /> Message business</button>
                </div>
            </div>
        </PhoneFrame>
    );
}

function InstagramPreview({ product, brand }) {
    const caption = buildInstagramCaption(product);
    const handle = brand.business_name.toLowerCase().replace(/\s+/g, ".");
    return (
        <PhoneFrame>
            <div className="flex items-center justify-between border-b border-[#EAECF0] px-4 py-3">
                <p className="text-base font-bold tracking-tight">Photo feed</p>
                <div className="flex items-center gap-4"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /></div>
            </div>
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F7B32B,#D62976,#6441A5)] p-[2px]">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-bold text-[#10202E]">{brand.business_name.slice(0, 1)}</div>
                    </div>
                    <p className="text-sm font-bold">{handle}</p>
                </div>
                <MoreHorizontal className="h-5 w-5" />
            </div>
            {previewImage(product, "aspect-square")}
            <div className="p-4">
                <div className="flex items-center justify-between"><div className="flex gap-4"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Send className="h-5 w-5" /></div><span className="text-lg">⌑</span></div>
                <p className="mt-3 text-xs font-bold">Liked by local shoppers</p>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[#1D2939]"><strong>{handle}</strong> {caption}</p>
                <button type="button" className="mt-3 flex w-full items-center justify-between rounded-lg bg-[#F2F4F7] px-3 py-2.5 text-xs font-bold text-[#344054]"><span>Shop now · {formatINR(product.price || 0)}</span><ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
        </PhoneFrame>
    );
}

function FacebookPreview({ product, brand }) {
    return (
        <PhoneFrame>
            <div className="flex items-center justify-between border-b border-[#E4E7EC] px-4 py-3">
                <p className="text-lg font-bold text-[#1877F2]">Community feed</p>
                <div className="flex gap-2"><Search className="h-5 w-5" /><MessageCircle className="h-5 w-5" /></div>
            </div>
            <div className="my-2 border-y border-[#E4E7EC] bg-white">
            <div className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] font-bold text-white">{brand.business_name.slice(0, 1)}</div>
                <div className="flex-1"><p className="text-sm font-bold">{brand.business_name}</p><p className="text-xs text-[#667085]">Sponsored · Public</p></div>
                <MoreHorizontal className="h-5 w-5 text-[#667085]" />
            </div>
            <p className="px-4 pb-4 text-sm leading-6 text-[#1D2939]">{facebookText(product)}<br /><br /><strong>{formatINR(product.price || 0)}</strong></p>
            {previewImage(product, "aspect-[1.2]")}
            <button type="button" className="flex w-full items-center justify-center gap-2 border-b border-[#E4E7EC] bg-[#F7F9FC] px-4 py-3 text-sm font-bold text-[#1877F2]"><MessageCircle className="h-4 w-4" /> Message business</button>
            <div className="grid grid-cols-3 p-2 text-center text-xs font-semibold text-[#667085]"><span className="flex items-center justify-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> Like</span><span>Comment</span><span>Share</span></div>
            </div>
        </PhoneFrame>
    );
}

function InstagramReelPreview({ product, brand }) {
    const handle = brand.business_name.toLowerCase().replace(/\s+/g, ".");
    const caption = [
        product.reel_hook || "New arrival for you ✨",
        product.reel_caption || buildInstagramCaption(product),
        product.reel_cta || "DM to order",
        product.reel_hashtags || "#ShopLocal #SmallBusiness #NewArrival #ORVA",
    ].filter(Boolean).join("\n\n");
    return (
        <PhoneFrame tone="dark">
            <div className="relative min-h-full bg-[#070A12] text-white">
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 text-sm font-bold">
                    <span>Reels</span>
                    <ImageIcon className="h-5 w-5" />
                </div>
                <div className="relative aspect-[9/16] bg-[#101828]">
                    {product.reel_video_url ? (
                        <video src={product.reel_video_url} className="h-full w-full object-cover" controls playsInline />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/60">
                            <Smartphone className="h-10 w-10" />
                            <p className="max-w-48 text-sm font-semibold">Upload a product video from Product details.</p>
                        </div>
                    )}
                    <div className="absolute inset-x-4 bottom-5 rounded-2xl bg-black/45 p-3 backdrop-blur">
                        <p className="text-xs font-bold">@{handle}</p>
                        <p className="mt-1 text-base font-bold">{productName(product)}</p>
                        <p className="text-sm text-white/80">{formatINR(product.price || 0)} · {product.reel_cta || "DM to order"}</p>
                    </div>
                </div>
                <div className="grid gap-3 border-t border-white/10 p-4">
                    <p className="whitespace-pre-line text-xs leading-5 text-white/76">{caption}</p>
                    <div className="flex gap-4 text-white/75"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Share2 className="h-5 w-5" /></div>
                </div>
            </div>
        </PhoneFrame>
    );
}

function WhatsAppStatusPreview({ product, brand }) {
    return (
        <PhoneFrame tone="dark">
            <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
                <ArrowLeft className="h-5 w-5" />
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{brand.business_name.slice(0, 1)}</div>
                <div><p className="text-sm font-bold">{brand.business_name}</p><p className="text-xs text-white/60">Preview simulation</p></div>
            </div>
            <div className="relative h-full min-h-[640px] bg-[#111827]">
                {previewImage(product, "absolute inset-0 h-full w-full opacity-90")}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40" />
                <div className="absolute inset-x-5 bottom-8 rounded-2xl bg-black/38 p-4 text-white backdrop-blur">
                    <p className="text-2xl font-bold">{productName(product)}</p>
                    <p className="mt-1 text-lg font-bold text-[#8CF2C1]">{formatINR(product.price || 0)}</p>
                    <p className="mt-3 text-sm text-white/82">Message us to order. {formatInventoryStatus(product.status)}.</p>
                </div>
            </div>
        </PhoneFrame>
    );
}

function PreviewCanvas({ tab, products, selectedId, onSelect, brand }) {
    const product = products.find((item) => item.id === selectedId) || products[0] || {};
    if (tab === "instagram_reel") return <InstagramReelPreview product={product} brand={brand} />;
    if (tab === "whatsapp_catalog") return <WhatsAppPreview products={products} selectedId={product.id} onSelect={onSelect} brand={brand} />;
    if (tab === "whatsapp_status") return <WhatsAppStatusPreview product={product} brand={brand} />;
    return <InstagramPreview product={product} brand={brand} />;
}

export function PreviewStudio() {
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState("instagram_post");
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [brand, setBrand] = useState({ business_name: "My ORVA Store", tagline: "Fresh finds, ready to order", whatsapp_number: "", accent_color: "#1B4FD8" });

    const loadProducts = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const response = await fetch("/api/inventory", { headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } });
        const result = await response.json();
        setProducts(result.products || []);
        setSelectedId((current) => current || result.products?.[0]?.id || "");
        setLoading(false);
    }, []);

    useEffect(() => { queueMicrotask(loadProducts); }, [loadProducts]);
    useEffect(() => {
        const refresh = () => { if (document.visibilityState === "visible") loadProducts(); };
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [loadProducts]);

    const saveSharePreview = async () => {
        setSharing(true);
        const { data } = await supabase.auth.getSession();
        const response = await fetch("/api/previews", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
            body: JSON.stringify(brand),
        });
        const result = await response.json();
        setSharing(false);
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not create preview link." });
        const url = `${window.location.origin}${result.path}`;
        await navigator.clipboard?.writeText(url);
        setMessage({ type: "success", text: `Preview link copied: ${url}` });
    };

    const selectedProduct = products.find((item) => item.id === selectedId) || products[0];
    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Catalog" title="Preview Studio" description="See how your products will look before you publish.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="dashboard-panel overflow-hidden">
                    <div className="grid gap-5 border-b border-[var(--border)] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]"><Sparkles className="h-4 w-4" /> Live channel previews <span className="rounded-full border border-[#CAD8F7] bg-[#F2F6FF] px-2 py-1 text-[10px] tracking-[0.12em] text-[#5570A8]">Preview simulation</span></div>
                            <h2 className="mt-2 text-2xl font-bold">Shape the first impression</h2>
                            <p className="mt-1 text-sm text-[var(--mid)]">Changes to your brand settings and selected product appear instantly.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-secondary" onClick={() => { loadProducts(); setMessage({ type: "success", text: "Preview refreshed with your latest products." }); }}><RefreshCw className="h-4 w-4" />Generate Preview</button>
                            <button type="button" className="btn-primary" disabled={sharing || !products.length} onClick={saveSharePreview}>{sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}Share Preview Link</button>
                        </div>
                    </div>
                    <div className="grid xl:grid-cols-[290px_1fr]">
                        <aside className="border-b border-[var(--border)] bg-[var(--surface)] p-5 xl:border-b-0 xl:border-r">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Business branding</p>
                            <div className="mt-4 grid gap-3">
                                <label className="text-sm font-semibold">Business name<input className="form-field mt-1.5" value={brand.business_name} onChange={(event) => setBrand({ ...brand, business_name: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Short tagline<input className="form-field mt-1.5" value={brand.tagline} onChange={(event) => setBrand({ ...brand, tagline: event.target.value })} /></label>
                                <label className="text-sm font-semibold">WhatsApp number<input className="form-field mt-1.5" placeholder="+91..." value={brand.whatsapp_number} onChange={(event) => setBrand({ ...brand, whatsapp_number: event.target.value })} /></label>
                                <label className="text-sm font-semibold">Brand color<span className="mt-1.5 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-3 py-2"><input type="color" value={brand.accent_color} onChange={(event) => setBrand({ ...brand, accent_color: event.target.value })} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" /><span className="text-xs text-[var(--mid)]">{brand.accent_color}</span></span></label>
                            </div>
                            {selectedProduct ? <div className="mt-6">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Preview product</p>
                                <select value={selectedProduct.id} onChange={(event) => setSelectedId(event.target.value)} className="form-field mt-2">
                                    {products.map((product) => <option key={product.id} value={product.id}>{productName(product)}</option>)}
                                </select>
                                <p className="mt-2 text-xs leading-5 text-[var(--mid)]">This selection updates every channel preview.</p>
                            </div> : null}
                        </aside>
                        <div className="min-w-0">
                            <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-white p-2">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${activeTab === tab.id ? "bg-[#EAF1FF] text-[var(--accent)]" : "text-[var(--mid)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"}`}><Icon className="h-4 w-4" />{tab.label}</button>;
                                })}
                            </div>
                            <div className="min-h-[650px] bg-[radial-gradient(circle_at_top,#F7FAFF,#EEF3F8)] p-5 sm:p-9">
                                {loading ? <div className="flex min-h-[480px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /></div> : !products.length ? (
                                    <EmptyState title="Add products to start previewing" description="Your uploaded inventory and product images will appear here." action={<Link href="/dashboard/products/new" className="btn-primary mt-6 inline-flex">Add product<ArrowRight className="h-4 w-4" /></Link>} />
                                ) : <PreviewCanvas tab={activeTab} products={products} selectedId={selectedId} onSelect={setSelectedId} brand={brand} />}
                            </div>
                        </div>
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}

export function PublicCatalogPreview({ businessSlug }) {
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        fetch(`/api/previews/${encodeURIComponent(businessSlug)}`)
            .then(async (response) => ({ ok: response.ok, result: await response.json() }))
            .then(({ ok, result }) => { if (!ok) setError(result.error || "Preview not found."); else setPreview(result.preview); })
            .catch(() => setError("Could not load this preview."));
    }, [businessSlug]);
    const products = useMemo(() => preview?.products || [], [preview]);

    if (error) return <div className="flex min-h-screen items-center justify-center bg-[#F2F6FB] p-6 text-center"><div><h1 className="text-2xl font-bold">Preview unavailable</h1><p className="mt-2 text-sm text-[#667085]">{error}</p></div></div>;
    if (!preview) return <div className="flex min-h-screen items-center justify-center bg-[#F2F6FB]"><Loader2 className="h-7 w-7 animate-spin text-[#1B4FD8]" /></div>;
    return (
        <main className="min-h-screen bg-[#F2F6FB]">
            <header className="border-b border-[#DDE6F2] bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><strong className="text-lg">ORVA</strong><span className="rounded-full bg-[#EAF1FF] px-3 py-1 text-xs font-bold text-[#1B4FD8]">Catalog Preview</span></div>
            </header>
            <section className="px-5 py-12 text-white" style={{ background: `linear-gradient(135deg, ${preview.accent_color}, #102E5A)` }}>
                <div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Product collection</p><h1 className="mt-3 text-4xl font-bold">{preview.business_name}</h1><p className="mt-2 text-white/75">{preview.tagline}</p></div>
            </section>
            <section className="mx-auto max-w-6xl px-5 py-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => <article key={product.id} className="overflow-hidden rounded-xl border border-[#E1E8F2] bg-white shadow-sm">
                        {previewImage(product, "aspect-square")}
                        <div className="p-4"><p className="font-bold">{product.name}</p><p className="mt-1 text-sm font-bold" style={{ color: preview.accent_color }}>{formatINR(product.price || 0)}</p><p className="mt-2 text-xs text-[#667085]">{formatInventoryStatus(product.status)}</p></div>
                    </article>)}
                </div>
                {!products.length ? <p className="rounded-xl border border-[#E1E8F2] bg-white p-6 text-sm text-[#667085]">No products are available yet.</p> : null}
            </section>
            {preview.whatsapp_number ? <a href={`https://wa.me/${String(preview.whatsapp_number).replace(/\D/g, "")}`} className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-[#16A46D] px-5 py-3 text-sm font-bold text-white shadow-lg"><MessageCircle className="h-5 w-5" /> Order on WhatsApp</a> : null}
        </main>
    );
}
