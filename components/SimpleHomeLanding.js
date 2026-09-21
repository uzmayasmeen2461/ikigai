import Image from "next/image";
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    FileSpreadsheet,
    RefreshCw,
    Send,
    Sparkles,
} from "lucide-react";
import { PwaInstallButton } from "./PwaInstallButton";

const homeVideo = {
    src: "/ikigai-explainer.mp4",
    poster: "/ikigai-explainer-poster.svg",
};

const trust = ["CSV upload if you have it", "Photos + prices if you do not", "Review before publishing", "Human help where APIs are limited"];

const heroShowcase = [
    {
        title: "Product photos + prices",
        image: "/orva-social-posts/orva-08-photo-to-inventory.png",
        alt: "ORVA turns product photos and prices into inventory",
    },
    {
        title: "Catalog and social posts",
        image: "/orva-social-posts/orva-01-inventory-to-sales.png",
        alt: "ORVA turns inventory into catalog and online sales posts",
    },
    {
        title: "Schedule growth posts",
        image: "/orva-social-posts/orva-04-growth-autopilot.png",
        alt: "ORVA Growth Autopilot schedules product posts",
    },
];

const offers = [
    {
        title: "Upload products from photos or CSV",
        detail: "Start with what you already have. ORVA builds a reviewable inventory list with product names, prices, and images.",
        image: "/orva-social-posts/orva-07-upload-inventory.png",
        alt: "Upload inventory into ORVA",
    },
    {
        title: "Preview the customer catalog",
        detail: "Check how products look on mobile before anything goes live.",
        image: "/orva-social-posts/orva-09-preview-studio.png",
        alt: "Preview ORVA mobile catalog",
    },
    {
        title: "Create captions and post content",
        detail: "Edit captions, descriptions, offers, and hashtags from your product list.",
        image: "/orva-social-posts/orva-10-social-content.png",
        alt: "Create social content with ORVA",
    },
    {
        title: "Schedule posts in Growth Autopilot",
        detail: "Plan product posts for Instagram, Facebook, and WhatsApp-ready reminders.",
        image: "/orva-social-posts/orva-04-growth-autopilot.png",
        alt: "Schedule posts with ORVA Growth Autopilot",
    },
];

const steps = [
    {
        title: "Add your products",
        detail: "Upload a CSV, or send product photos with prices so ORVA can build the inventory.",
        icon: FileSpreadsheet,
        image: "/orva-flow/add-products.png",
        alt: "Shop owner uploading product photos and a spreadsheet into an ORVA catalog",
    },
    {
        title: "Check the customer view",
        detail: "Preview a mobile catalog before anything goes live.",
        icon: Eye,
        image: "/orva-flow/customer-preview.png",
        alt: "Business owner checking a mobile product catalog preview before publishing",
    },
    {
        title: "Publish product updates",
        detail: "Send reviewed product posts to Facebook, Instagram, and WhatsApp where connected.",
        icon: Send,
        image: "/orva-flow/publish-updates.png",
        alt: "Reviewed product card being published to social and messaging channels",
    },
    {
        title: "Keep stock accurate",
        detail: "When price or stock changes, ORVA tracks what needs updating.",
        icon: RefreshCw,
        image: "/orva-flow/stock-sync.png",
        alt: "Inventory dashboard syncing stock and price updates across phone and store screens",
    },
];

function FlowVisual({ step, index }) {
    const Icon = step.icon;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(216,226,234,0.9)] bg-white shadow-[0_18px_45px_rgba(15,25,35,0.08)]">
            <div className="relative aspect-square overflow-hidden bg-[var(--accent-light)]">
                <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,25,35,0)_55%,rgba(15,25,35,0.3))]" />
            </div>

            <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-[var(--accent)] shadow-[0_10px_24px_rgba(15,25,35,0.16)]">
                {index + 1}
            </div>
            <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-[var(--accent)] shadow-[0_12px_30px_rgba(15,25,35,0.14)] backdrop-blur">
                <Icon className="h-5 w-5" />
            </div>
        </div>
    );
}

export function SimpleHomeLanding() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="hero-section px-6 py-16 md:px-10 md:py-20">
                <div className="hero-grid-bg" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.82fr]">
                    <div className="animate-fade-up">
                        <div className="hero-pill">
                            <div className="hero-pulse" />
                            For local shops, boutiques, kitchens, and catalog sellers
                        </div>
                        <h1 className="hero-h1 max-w-4xl md:text-6xl">
                            Add products once.<br />
                            <span>Sell everywhere faster.</span>
                        </h1>
                        <p className="hero-sub max-w-xl">
                            ORVA turns your product list, or even product photos with prices, into a clean digital catalog, social-ready posts, and update tasks for WhatsApp, Instagram, Facebook, and your online store preview.
                        </p>

                        <div className="mb-14 flex flex-col gap-3 sm:flex-row">
                            <a href="/auth" className="btn btn-primary">
                                Start ORVA
                            </a>
                            <PwaInstallButton />
                        </div>

                        <div className="stats-strip">
                            {[
                                ["2", "Ways to start"],
                                ["3", "Social channels"],
                                ["0", "ERP complexity"],
                            ].map(([value, label]) => (
                                <div key={label} className="stats-cell">
                                    <div className="stats-n">{value}</div>
                                    <div className="stats-l">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="premium-stage animate-fade-up-delay">
                        <div className="premium-float overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/20 backdrop-blur">
                            <div className="grid gap-3 sm:grid-cols-[0.86fr_1fr]">
                                <div className="grid gap-3">
                                    {heroShowcase.slice(0, 2).map((item) => (
                                        <div key={item.title} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/10">
                                            <Image
                                                src={item.image}
                                                alt={item.alt}
                                                width={420}
                                                height={420}
                                                sizes="(max-width: 640px) 44vw, 220px"
                                                className="aspect-square w-full object-cover"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-3 pt-10">
                                                <p className="text-xs font-bold text-white">{item.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/10">
                                    <Image
                                        src={heroShowcase[2].image}
                                        alt={heroShowcase[2].alt}
                                        width={560}
                                        height={560}
                                        priority
                                        sizes="(max-width: 640px) 50vw, 300px"
                                        className="h-full min-h-[280px] w-full object-cover"
                                    />
                                    <div className="absolute left-3 top-3 rounded-xl bg-white px-3 py-2 text-xs font-black text-[var(--accent)] shadow-lg">
                                        ORVA output
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-4 pb-4 pt-16">
                                        <p className="text-lg font-bold leading-tight text-white">Inventory becomes scheduled product posts</p>
                                        <p className="mt-1 text-xs leading-5 text-white/65">Upload, edit, schedule, or publish from one workspace.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[
                                    ["Upload", FileSpreadsheet],
                                    ["Edit", Sparkles],
                                    ["Post", Send],
                                ].map(([label, Icon]) => (
                                    <div key={label} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.08] px-2 py-2 text-xs font-bold text-white">
                                        <Icon className="h-4 w-4 text-[#7BA7F0]" />
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-[var(--border)] bg-white">
                <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
                    <div className="max-w-3xl">
                        <p className="section-tag">What ORVA does</p>
                        <h2 className="mt-2 text-4xl font-bold text-[var(--ink)]">A product-selling workspace, shown step by step.</h2>
                    </div>
                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {offers.map((item) => (
                            <article key={item.title} className="interactive-tile overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_50px_rgba(15,25,35,0.08)]">
                                <div className="relative aspect-square overflow-hidden bg-white">
                                    <Image
                                        src={item.image}
                                        alt={item.alt}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                                        className="object-cover transition duration-500 hover:scale-105"
                                    />
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-bold leading-tight text-[var(--ink)]">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-[var(--mid)]">{item.detail}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-b border-[var(--border)] bg-white">
                <div className="mx-auto max-w-5xl px-6 py-16 md:px-10">
                    <div className="glass-panel overflow-hidden rounded-2xl p-3">
                        <video
                            className="block aspect-video w-full rounded-xl bg-[var(--ink)] object-cover"
                            src={homeVideo.src}
                            poster={homeVideo.poster}
                            controls
                            playsInline
                            preload="metadata"
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="mx-auto max-w-5xl px-6 py-16 md:px-10">
                    <p className="section-tag">How it works</p>
                    <h2 className="mt-2 text-4xl font-bold text-[var(--ink)]">A simple flow business owners understand</h2>
                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map((step, index) => (
                            <article key={step.title} className="interactive-tile group relative rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[0_20px_60px_rgba(15,25,35,0.08)]">
                                <FlowVisual step={step} index={index} />
                                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Step 0{index + 1}</p>
                                <h3 className="mt-2 text-xl font-bold leading-tight text-[var(--ink)]">{step.title}</h3>
                                <p className="mt-2 text-sm font-light leading-6 text-[var(--mid)]">{step.detail}</p>
                                {index < steps.length - 1 ? (
                                    <div className="pointer-events-none absolute -right-5 top-[38%] z-20 hidden h-10 w-10 items-center justify-center rounded-full border border-[rgba(27,79,216,0.16)] bg-white text-[var(--accent)] shadow-[0_14px_34px_rgba(15,25,35,0.12)] lg:flex">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                ) : null}
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white">
                <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-[1fr_0.7fr] md:items-center md:px-10">
                    <div>
                        <p className="section-tag">Start simple</p>
                        <h2 className="mt-2 text-4xl font-bold text-[var(--ink)]">Built for businesses that sell products, with or without a spreadsheet.</h2>
                        <p className="mt-3 text-sm font-light leading-6 text-[var(--mid)]">ORVA is not a complicated ERP. It is a practical workspace for shops that need product catalogs, social posts, and stock updates to stay consistent online. If you only have photos and prices, ORVA can help create the inventory first.</p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            {trust.map((item) => (
                                <span key={item} className="badge badge-blue">
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7">
                        <Sparkles className="h-8 w-8 text-[var(--accent)]" />
                        <p className="mt-4 text-base font-semibold text-[var(--ink)]">No inventory list? We can build it.</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--mid)]">Send product or shelf photos with prices and stock notes. ORVA creates clean product records that can be previewed and published to your digital channels.</p>
                        <a href="/auth" className="btn btn-primary mt-6">
                            Open ORVA
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
