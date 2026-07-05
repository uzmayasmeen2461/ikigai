"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CalendarDays,
    Clipboard,
    Copy,
    ImageIcon,
    Loader2,
    Megaphone,
    MessageCircle,
    PackageCheck,
    Sparkles,
    Tags,
    TrendingUp,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { buildGrowthAssistant } from "../../app/lib/growthAssistant";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

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

function ProductImage({ product, className = "h-16 w-16" }) {
    if (!product?.displayImage) {
        return (
            <div className={`flex shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] ${className}`}>
                <ImageIcon className="h-6 w-6" />
            </div>
        );
    }
    return <div className={`shrink-0 rounded-2xl border border-[var(--border)] bg-cover bg-center ${className}`} style={{ backgroundImage: `url(${product.displayImage})` }} />;
}

function CopyButton({ text, onCopied, label = "Copy" }) {
    return (
        <button
            type="button"
            className="btn-secondary px-3 py-2 text-xs"
            onClick={async () => {
                await navigator.clipboard?.writeText(text);
                onCopied();
            }}
        >
            <Copy className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}

function CampaignCard({ campaign }) {
    return (
        <article className="interactive-tile rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">{campaign.bestFor}</p>
                    <h3 className="mt-2 text-lg font-black text-[var(--ink)]">{campaign.title}</h3>
                </div>
                <Megaphone className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--mid)]">{campaign.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
                {campaign.channels.map((channel) => <span key={channel} className="dashboard-badge badge-blue">{channel}</span>)}
            </div>
        </article>
    );
}

export function GrowthAssistantPage() {
    const getToken = useToken();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });

    const assistant = useMemo(() => buildGrowthAssistant(products), [products]);

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const response = await fetch("/api/inventory", { headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not load products for Growth Assistant." });
        } else {
            setProducts(result.products || []);
        }
        setLoading(false);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const copied = (text = "Copied.") => setMessage({ type: "success", text });
    const hero = assistant.heroProduct;

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Growth" title="Growth Assistant" description="Know what to post, what to promote, and how to bring customers back.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>

                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : !products.length ? (
                    <EmptyState
                        icon={PackageCheck}
                        title="Add products to unlock growth ideas"
                        description="ORVA needs your products before it can suggest posts, offers, weekly plans, and sales messages."
                        action={<Link href="/dashboard/upload-inventory" className="btn-primary mt-6 inline-flex">Upload Inventory<ArrowRight className="h-4 w-4" /></Link>}
                    />
                ) : (
                    <div className="grid gap-6">
                        <section className="dashboard-panel overflow-hidden p-0">
                            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                                <div className="p-6">
                                    <p className="dashboard-eyebrow"><Sparkles className="h-3.5 w-3.5" />Today’s best move</p>
                                    <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[var(--ink)]">
                                        Promote {hero?.displayName || "your best product"} today.
                                    </h2>
                                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted)]">
                                        ORVA picked this because it {hero?.reason || "has the strongest selling signals in your inventory"}.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Link href={hero?.id ? `/dashboard/preview-studio?productId=${hero.id}` : "/dashboard/preview-studio"} className="btn-primary">
                                            Open Preview Studio<ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <Link href="/dashboard/social-content" className="btn-secondary">
                                            View Social Content
                                        </Link>
                                    </div>
                                </div>
                                <div className="border-t border-[var(--border)] bg-[radial-gradient(circle_at_20%_20%,rgba(27,79,216,0.14),transparent_34%),var(--surface)] p-6 lg:border-l lg:border-t-0">
                                    <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
                                        <ProductImage product={hero} className="aspect-square w-full" />
                                        <div className="mt-4 flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-xl font-black text-[var(--ink)]">{hero?.displayName || "Product"}</h3>
                                                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{hero?.displayPrice || ""} · Stock {hero?.displayStock ?? 0}</p>
                                            </div>
                                            <span className="dashboard-badge badge-green">{hero?.score || 0}% ready</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                            <StatCard label="Products" value={assistant.summary.totalProducts} icon={PackageCheck} accent="bg-blue-500" />
                            <StatCard label="In Stock" value={assistant.summary.inStock} icon={TrendingUp} accent="bg-emerald-500" />
                            <StatCard label="Low Stock" value={assistant.summary.lowStock} icon={Tags} accent="bg-amber-500" />
                            <StatCard label="Out of Stock" value={assistant.summary.outOfStock} icon={Clipboard} accent="bg-red-500" />
                            <StatCard label="Ready to Post" value={assistant.summary.readyToPost} icon={Megaphone} accent="bg-purple-500" />
                            <StatCard label="Not Promoted" value={assistant.summary.notPromoted} icon={Sparkles} accent="bg-sky-500" />
                        </div>

                        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                            <div className="dashboard-panel p-5">
                                <SectionHeading title="Recommended campaigns" description="Simple campaigns that can drive discovery and sales this week." />
                                <div className="grid gap-4 md:grid-cols-2">
                                    {assistant.campaigns.map((campaign) => <CampaignCard key={`${campaign.title}-${campaign.bestFor}`} campaign={campaign} />)}
                                </div>
                            </div>

                            <div className="dashboard-panel p-5">
                                <SectionHeading title="Needs attention" description="Fix these before pushing products heavily." />
                                {!assistant.attention.length ? (
                                    <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--mid)]">No urgent cleanup items. Your products are looking ready.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {assistant.attention.map((item) => (
                                            <article key={`${item.type}-${item.product.id}`} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                                <div className="flex gap-3">
                                                    <ProductImage product={item.product} />
                                                    <div className="min-w-0">
                                                        <span className="dashboard-badge badge-warn">{item.type}</span>
                                                        <h3 className="mt-2 font-black text-[var(--ink)]">{item.title}</h3>
                                                        <p className="mt-1 text-sm leading-6 text-[var(--mid)]">{item.description}</p>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="grid gap-6 xl:grid-cols-2">
                            <div className="dashboard-panel p-5">
                                <SectionHeading icon={CalendarDays} title="7-day content plan" description="A simple posting plan for the week." />
                                <div className="grid gap-3">
                                    {assistant.weeklyPlan.map((item) => (
                                        <article key={item.day} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:grid-cols-[92px_1fr]">
                                            <div>
                                                <p className="text-sm font-black text-[var(--accent)]">{item.day}</p>
                                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{item.theme}</p>
                                            </div>
                                            <p className="text-sm leading-6 text-[var(--mid)]">{item.task}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            <div className="dashboard-panel p-5">
                                <SectionHeading title="Offer ideas" description="Copy one, edit it, and post it on WhatsApp or Instagram." />
                                <div className="grid gap-3">
                                    {assistant.offers.map((offer) => (
                                        <article key={offer} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                            <p className="text-sm leading-6 text-[var(--mid)]">{offer}</p>
                                            <div className="mt-3">
                                                <CopyButton text={offer} onCopied={() => copied("Offer copied.")} />
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                    <p className="dashboard-eyebrow"><MessageCircle className="h-3.5 w-3.5" />Sales follow-up kit</p>
                                    <div className="mt-4 grid gap-3">
                                        {Object.entries(assistant.messages).map(([key, text]) => (
                                            <div key={key} className="rounded-xl border border-[var(--border)] bg-white p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{key.replace(/([A-Z])/g, " $1")}</p>
                                                    <CopyButton text={text} onCopied={() => copied("Message copied.")} label="Copy" />
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-[var(--mid)]">{text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
