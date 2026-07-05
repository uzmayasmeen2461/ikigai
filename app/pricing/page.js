import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    ImageIcon,
    Package,
    RefreshCw,
    Sparkles,
    Store,
} from "lucide-react";
import { formatINR } from "../lib/pricing";

const plans = [
    {
        name: "Free Trial",
        price: 0,
        period: "7 days",
        badge: "Start free",
        description: "For businesses that want to try ORVA with real inventory, previews, and basic publishing before paying.",
        icon: Package,
        features: [
            "7 days free access",
            "Upload inventory or product photos",
            "Create product workspace",
            "Preview catalog and social posts",
            "Basic AI captions",
        ],
        cta: "Start Free Trial",
        featured: false,
    },
    {
        name: "Initial Setup",
        price: 2000,
        period: "one-time",
        badge: "First setup",
        description: "For shops that need ORVA configured, inventory cleaned, and their first digital catalog workspace prepared.",
        icon: Sparkles,
        features: [
            "ORVA workspace setup",
            "Inventory list or photo + price onboarding",
            "AI image-to-product matching",
            "Product titles and descriptions",
            "Store and social preview setup",
            "Manual approval after payment",
        ],
        cta: "Start Setup",
        featured: true,
    },
    {
        name: "Catalog Management",
        price: 7000,
        period: "/month",
        badge: "Human-assisted",
        description: "For businesses that want ORVA to help with WhatsApp catalog management and regular manual channel updates.",
        icon: RefreshCw,
        features: [
            "WhatsApp catalog management support",
            "Manual Instagram and Facebook update tasks",
            "Monthly catalog cleanup",
            "Product updates and corrections",
            "Digital setup specialist support",
            "Publishing issue tracking",
        ],
        cta: "Request Managed Plan",
        featured: false,
    },
    {
        name: "Advanced Automation",
        price: 15000,
        period: "/month",
        badge: "Advanced",
        description: "For businesses that want advanced automation, messaging workflows, and stronger growth support.",
        icon: RefreshCw,
        features: [
            "Advanced automation features",
            "Automated campaign scheduling",
            "Automated messaging where available",
            "Priority publishing support",
            "Growth recommendations",
            "Admin review and exception tracking",
        ],
        cta: "Talk to ORVA",
        featured: false,
    },
];

const addons = [
    {
        title: "No inventory list? No problem.",
        price: 2000,
        description: "Upload product photos with prices and ORVA helps create clean product records during initial setup.",
        points: ["Photos + prices", "AI-generated titles", "Review before saving"],
        icon: ImageIcon,
    },
    {
        title: "Manual channel support",
        price: 7000,
        description: "For businesses that want ORVA specialists to help keep WhatsApp, Instagram, and Facebook updates moving.",
        points: ["WhatsApp catalog help", "Manual update tasks", "Monthly cleanup"],
        icon: Store,
    },
];

function PlanCard({ plan }) {
    const Icon = plan.icon;
    return (
        <article
            className={[
                "interactive-tile flex h-full flex-col rounded-2xl border bg-white p-6 transition duration-200",
                plan.featured
                    ? "border-[var(--accent)] shadow-2xl shadow-[rgba(27,79,216,0.16)]"
                    : "border-[var(--border)] shadow-sm",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                    <Icon className="h-6 w-6" />
                </div>
                <span className={plan.featured ? "badge badge-blue" : "badge badge-gray"}>
                    {plan.badge}
                </span>
            </div>

            <h2 className="mt-6 text-2xl font-bold tracking-[-0.04em] text-[var(--ink)]">{plan.name}</h2>
            <p className="mt-3 min-h-16 text-sm leading-6 text-[var(--mid)]">{plan.description}</p>

            <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-bold tracking-[-0.05em] text-[var(--ink)]">{formatINR(plan.price)}</span>
                <span className="pb-1 text-sm font-semibold text-[var(--muted)]">{plan.period}</span>
            </div>

            <div className="mt-6 grid gap-3">
                {plan.features.map((feature) => (
                    <p key={feature} className="flex items-start gap-2 text-sm font-medium leading-6 text-[var(--ink3)]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                        {feature}
                    </p>
                ))}
            </div>

            <Link href="/auth" className={plan.featured ? "btn-primary mt-8 w-full" : "btn-secondary mt-8 w-full"}>
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </article>
    );
}

export default function PricingPage() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="hero-section px-6 py-16 md:px-10 md:py-20">
                <div className="hero-grid-bg" />
                <div className="relative mx-auto max-w-5xl">
                    <div className="hero-pill">
                        <div className="hero-pulse" />
                        Pricing
                    </div>
                    <h1 className="hero-h1 max-w-4xl md:text-6xl">
                        Simple pricing for<br />
                        <span>digital product selling.</span>
                    </h1>
                    <p className="hero-sub max-w-2xl">
                        Start with a 7-day free trial. After that, ORVA pricing is confirmed manually based on setup, catalog management, and automation needs.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        {["No forced Meta API dependency", "Review before publishing", "Photos-to-inventory support", "Built for small businesses"].map((item) => (
                            <span key={item} className="badge badge-blue bg-white/10 text-[#7BA7F0]">
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
                <div className="mb-8 max-w-2xl">
                    <p className="section-tag">Plans</p>
                    <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
                        Pick the level of automation you need
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--mid)]">
                        Try ORVA first. Then continue with a one-time setup plan, monthly managed catalog support, or advanced automation.
                    </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
                    {plans.map((plan) => <PlanCard key={plan.name} plan={plan} />)}
                </div>
            </section>

            <section className="border-y border-[var(--border)] bg-white">
                <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
                    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                        <div>
                            <p className="section-tag">Optional help</p>
                            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--ink)]">
                                For shops without a clean inventory list
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-[var(--mid)]">
                                Many local businesses only have product photos and prices. ORVA supports that too: upload photos, add prices, let AI create draft inventory, then review before saving.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {addons.map((addon) => {
                                const Icon = addon.icon;
                                return (
                                    <article key={addon.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[var(--accent)] shadow-sm">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-4 text-xl font-bold text-[var(--ink)]">{addon.title}</h3>
                                        <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--ink)]">{formatINR(addon.price)}</p>
                                        <p className="mt-3 text-sm leading-6 text-[var(--mid)]">{addon.description}</p>
                                        <div className="mt-4 grid gap-2">
                                            {addon.points.map((point) => (
                                                <span key={point} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink3)]">
                                                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                                                    {point}
                                                </span>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-12 md:px-10">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--ink)] p-8 text-white md:p-10">
                    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7BA7F0]">Start demo</p>
                            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] md:text-4xl">Try ORVA with your products</h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                                Upload a CSV if you have one. If not, upload product photos with prices and ORVA will create a reviewable inventory list.
                            </p>
                        </div>
                        <Link href="/auth" className="btn-primary justify-center px-6 py-3">
                            Start Demo
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
