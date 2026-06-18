import {
    CheckCircle2,
    PackageCheck,
    RefreshCw,
    Send,
    Sparkles,
} from "lucide-react";

const homeVideo = {
    src: "/ikigai-explainer.mp4",
    poster: "/ikigai-explainer-poster.svg",
};

const channels = ["WhatsApp Catalog", "Instagram posts", "Facebook Page", "Online store preview"];
const trust = ["CSV upload if you have it", "Photos + prices if you do not", "Review before publishing", "Human help where APIs are limited"];

const steps = [
    { title: "Add your products", detail: "Upload a CSV, or send product photos with prices so ORVA can build the inventory." },
    { title: "Check the customer view", detail: "Preview a mobile catalog before anything goes live." },
    { title: "Publish product updates", detail: "Send reviewed product posts to Facebook, Instagram, and WhatsApp where connected." },
    { title: "Keep stock accurate", detail: "When price or stock changes, ORVA tracks what needs updating." },
];

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
                                Start Demo
                            </a>
                            <a href="/dashboard/preview-studio" className="btn border border-white/15 bg-transparent text-white/60 hover:border-white/35 hover:text-white">
                                View Preview
                            </a>
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
                        <div className="premium-float product-os-card rounded-2xl p-5">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <p className="section-tag text-[#7BA7F0]">ORVA Digital Presence</p>
                                    <p className="mt-2 text-xl font-bold text-white">Inventory, preview, publish</p>
                                </div>
                                <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[var(--accent)]">
                                    Hybrid
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {[
                                    { icon: PackageCheck, title: "Products captured", meta: "CSV import or photo conversion" },
                                    { icon: Sparkles, title: "Preview ready", meta: "See the mobile storefront first" },
                                    { icon: Send, title: "Publish after review", meta: "Facebook, Instagram, WhatsApp" },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.title} className="interactive-tile rounded-xl border border-white/10 bg-white/[0.06] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[var(--accent)]">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{item.title}</p>
                                                    <p className="mt-1 text-xs text-white/40">{item.meta}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {channels.map((channel) => (
                                    <div key={channel} className="interactive-tile rounded-xl border border-white/10 bg-white/[0.05] p-3">
                                        <p className="text-xs font-semibold text-white">{channel}</p>
                                        <p className="mt-1 text-xs text-white/35">Review-ready workflow</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-white/55">
                                        <RefreshCw className="h-4 w-4 text-[#7BA7F0]" />
                                        Stock and channel update trail
                                    </div>
                                    <span className="h-2 w-20 overflow-hidden rounded-full bg-white/10">
                                        <span className="block h-full w-3/4 rounded-full bg-[#7BA7F0]" />
                                    </span>
                                </div>
                            </div>
                        </div>
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
                    <div className="mt-10 grid gap-px overflow-hidden rounded-xl bg-[var(--border)] md:grid-cols-4">
                        {steps.map((step, index) => (
                            <div key={step.title} className="bg-white p-8">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Step 0{index + 1}</p>
                                <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-sm font-bold text-[var(--accent)]">
                                    {index + 1}
                                </div>
                                <p className="mt-4 text-lg font-bold text-[var(--ink)]">{step.title}</p>
                                <p className="mt-2 text-sm font-light leading-6 text-[var(--mid)]">{step.detail}</p>
                            </div>
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
