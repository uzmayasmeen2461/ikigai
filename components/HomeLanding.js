import {
    ArrowRight,
    BadgeCheck,
    Camera,
    CheckCircle2,
    Clock3,
    CreditCard,
    FileText,
    Globe2,
    Handshake,
    Landmark,
    LockKeyhole,
    Mail,
    MapPin,
    MessageCircle,
    PackageCheck,
    ReceiptText,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    TrendingUp,
    Utensils,
    WalletCards,
    Zap,
} from "lucide-react";
import { formatINR } from "../app/lib/pricing";
import { ServiceStartButton } from "./ServiceStartButton";

const services = [
    {
        title: "WhatsApp Business Setup",
        serviceType: "whatsapp",
        desc: "Launch a polished profile customers can trust.",
        bullets: ["Profile setup", "Catalog guidance", "Customer enquiry flow"],
        price: 2000,
        turnaround: "2-3 working days",
        icon: MessageCircle,
    },
    {
        title: "Product Listing Setup",
        serviceType: "listing",
        desc: "Make products ready for online selling.",
        bullets: ["Product copy", "Pricing structure", "Image readiness"],
        price: 1999,
        turnaround: "3-5 working days",
        icon: PackageCheck,
    },
    {
        title: "Restaurant Zomato / Swiggy Listing",
        serviceType: "restaurant",
        desc: "Prepare your restaurant for delivery platforms.",
        bullets: ["Menu structure", "Document checklist", "Listing inputs"],
        price: 3499,
        turnaround: "4-6 working days",
        icon: Utensils,
    },
    {
        title: "Cloud Kitchen Launch Setup",
        serviceType: "cloud_kitchen",
        desc: "Get your cloud kitchen launch-ready.",
        bullets: ["Kitchen profile", "Menu assets", "Delivery readiness"],
        price: 4999,
        turnaround: "5-7 working days",
        icon: Store,
    },
    {
        title: "Instagram Business Page Setup",
        serviceType: "instagram",
        desc: "Turn Instagram into a sharper business front.",
        bullets: ["Bio optimization", "Highlight plan", "Contact setup"],
        price: 2499,
        turnaround: "3-4 working days",
        icon: Camera,
    },
    {
        title: "Website / Online Store Setup",
        serviceType: "website",
        desc: "Create a credible home for your business online.",
        bullets: ["Essential pages", "Mobile-ready flow", "Lead or store CTA"],
        price: 7999,
        turnaround: "7-10 working days",
        icon: Globe2,
    },
];

const trustBadges = [
    "GST Invoice Available",
    "Secure Payments via Razorpay",
    "Fast Turnaround",
    "Hyderabad Support Team",
];

const approvalSignals = [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Contact Us", href: "/contact" },
];

const businessTypes = [
    "Retail Store",
    "Cloud Kitchen",
    "Salon",
    "Boutique",
    "Restaurant",
    "Home Business",
];

const metrics = [
    { value: "100+", label: "Tasks Completed" },
    { value: "50+", label: "Partners" },
    { value: "24h", label: "Avg Response Time" },
    { value: "4.8/5", label: "Satisfaction" },
];

const steps = [
    { title: "Choose Service", desc: "Select the setup your business needs.", icon: ShoppingBag },
    { title: "Secure Payment", desc: "Pay safely through Razorpay checkout.", icon: CreditCard },
    { title: "Upload Details", desc: "Share documents, images, and instructions.", icon: FileText },
    { title: "IKIGAI Executes Task", desc: "Trained partners work through a managed process.", icon: Zap },
    { title: "Get Delivery + Support", desc: "Track updates and receive final delivery.", icon: BadgeCheck },
];

const reasons = [
    {
        title: "No Hiring Needed",
        desc: "Digital support without payroll.",
        icon: Handshake,
    },
    {
        title: "Affordable Fixed Pricing",
        desc: "Clear starting prices upfront.",
        icon: WalletCards,
    },
    {
        title: "Verified Execution Partners",
        desc: "Trained partners, managed by IKIGAI.",
        icon: ShieldCheck,
    },
    {
        title: "Human Support on WhatsApp",
        desc: "Local help when you need clarity.",
        icon: MessageCircle,
    },
];

const paymentTrust = [
    { title: "UPI / Card / Netbanking", desc: "Pay the way India pays.", icon: Landmark },
    { title: "GST Invoice Generated", desc: "Clean records after payment.", icon: ReceiptText },
    { title: "Instant Confirmation", desc: "Status updates after verification.", icon: CheckCircle2 },
    { title: "Invoice PDF", desc: "Download when available.", icon: FileText },
    { title: "Secure Checkout", desc: "Protected by Razorpay.", icon: LockKeyhole },
];

const testimonials = [
    {
        name: "Ayesha",
        role: "Boutique Owner",
        quote: "WhatsApp catalog was live in 2 days.",
    },
    {
        name: "Ravi",
        role: "Restaurant Owner",
        quote: "Helped us list on delivery apps quickly.",
    },
    {
        name: "Farhan",
        role: "Home Business",
        quote: "Saved time and money.",
    },
];

const faqs = [
    {
        q: "How fast is service?",
        a: "Most services start within 24 hours after payment and details.",
    },
    {
        q: "Do I get invoice?",
        a: "Yes. You get invoice details after successful payment.",
    },
    {
        q: "Can I pay via UPI?",
        a: "Yes. Razorpay supports UPI, cards, and netbanking.",
    },
    {
        q: "Do you support Hyderabad businesses?",
        a: "Yes. IKIGAI is built for Hyderabad and Indian small businesses.",
    },
    {
        q: "Can I track task progress?",
        a: "Yes. Track status, notes, payment, and delivery updates.",
    },
];

function SectionHeader({ eyebrow, title, desc }) {
    return (
        <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
                {title}
            </h2>
            {desc && <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">{desc}</p>}
        </div>
    );
}

function IconBadge({ icon: Icon, dark = false }) {
    return (
        <div
            className={[
                "flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition duration-300 group-hover:scale-105",
                dark
                    ? "bg-white/10 text-blue-100 shadow-black/20 ring-1 ring-white/10"
                    : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-200/50",
            ].join(" ")}
        >
            <Icon className="h-6 w-6" />
        </div>
    );
}

function HeroMockup() {
    return (
        <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-6 top-10 h-52 w-52 rounded-full bg-blue-300/30 blur-3xl" />
            <div className="absolute -right-8 bottom-4 h-60 w-60 rounded-full bg-indigo-300/30 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-2xl shadow-blue-200/55 backdrop-blur-2xl">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-xl shadow-slate-300/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                                IKIGAI Dashboard
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                                Business setup progress
                            </h3>
                        </div>
                        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
                            Paid
                        </span>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                            ["₹2,000", "Starting price"],
                            ["24h", "Response"],
                            ["GST", "Invoice ready"],
                        ].map(([value, label]) => (
                            <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                <p className="text-lg font-semibold">{value}</p>
                                <p className="mt-1 text-xs text-slate-300">{label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-white p-4 text-slate-950">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold">WhatsApp Business Setup</p>
                                <p className="mt-1 text-xs text-slate-500">Catalog, profile, and enquiry flow</p>
                            </div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                In progress
                            </span>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-slate-100">
                            <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_0.8fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-950">Ready for customers</p>
                                <p className="text-xs text-slate-500">Digital presence setup</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-yellow-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-4 w-4 fill-current" />
                            ))}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-950">4.8/5 satisfaction</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HomeLanding() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="relative px-6 pb-16 pt-8 md:pb-24 md:pt-12">
                <div className="absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_24%_12%,rgba(37,99,235,0.22),transparent_30rem),radial-gradient(circle_at_76%_18%,rgba(99,102,241,0.18),transparent_32rem)]" />
                <div className="absolute left-1/2 top-16 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-200/35 blur-3xl" />
                <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-white/70" />

                <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
                    <div className="animate-fade-up">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/85 px-5 py-2 text-sm font-semibold text-blue-800 shadow-lg shadow-blue-100/70 backdrop-blur-xl">
                            <Sparkles className="h-4 w-4" />
                            Managed digital setup for Indian small businesses
                        </div>

                        <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-slate-950 md:text-7xl">
                            Launch Your Business Online Without Hiring a Full Team
                        </h1>

                        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
                            WhatsApp, listings, delivery apps, websites, and digital tasks handled by trained execution partners.
                        </p>

                        <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                            <a href="/services" className="btn-primary px-8 py-4 text-base md:text-lg">
                                Start Your First Service <ArrowRight className="ml-2 h-5 w-5" />
                            </a>
                            <a href="#pricing" className="btn-secondary px-8 py-4 text-base md:text-lg">
                                See Pricing
                            </a>
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-2">
                            {trustBadges.map((item) => (
                                <div
                                    key={item}
                                    className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-200/55 backdrop-blur-xl"
                                >
                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {approvalSignals.map((signal) => (
                                <a
                                    key={signal.href}
                                    href={signal.href}
                                    className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-xl transition duration-200 hover:border-blue-200 hover:text-blue-700"
                                >
                                    {signal.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="animate-fade-up-delay">
                        <HeroMockup />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-12 md:py-16">
                <div className="premium-panel hero-noise relative overflow-hidden p-6 shadow-2xl shadow-blue-100/40 md:p-8">
                    <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-100/80 blur-3xl" />
                    <div className="relative">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="eyebrow">Trusted by Growing Businesses</p>
                                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-4xl">
                                    Built for business owners who want things done.
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {businessTypes.map((type) => (
                                    <div
                                        key={type}
                                        className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 text-center text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-xl"
                                    >
                                        {type}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 grid overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-lg shadow-slate-200/50 sm:grid-cols-2 lg:grid-cols-4">
                            {metrics.map((metric) => (
                                <div key={metric.label} className="border-slate-200/80 p-6 text-center sm:border-r last:border-r-0">
                                    <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                                        {metric.value}
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-500">{metric.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="pricing" className="section-space relative mx-auto max-w-[1440px] px-6">
                <div className="absolute -left-24 top-20 -z-10 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />
                <div className="absolute -right-24 bottom-10 -z-10 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
                <SectionHeader
                    eyebrow="Services & Pricing"
                    title="Everything Your Business Needs To Go Digital"
                    desc="Pick a service. Pay securely. Track the work."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {services.map((service) => (
                        <div
                            key={service.title}
                            className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-200/35"
                        >
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-transparent" />
                            <div className="absolute right-0 top-0 h-28 w-28 translate-x-10 -translate-y-10 rounded-full bg-blue-100/70 blur-2xl transition duration-300 group-hover:bg-indigo-100" />

                            <div className="relative flex items-start justify-between gap-4">
                                <IconBadge icon={service.icon} />
                                <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                                    Premium pricing
                                </span>
                            </div>

                            <h3 className="relative mt-6 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                                {service.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{service.desc}</p>

                            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                                <p className="text-sm font-semibold text-slate-500">Starting at</p>
                                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                                    <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                                        {formatINR(service.price)}
                                    </p>
                                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
                                        GST applicable
                                    </span>
                                </div>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                                    <Clock3 className="h-4 w-4 text-blue-600" />
                                    Turnaround: {service.turnaround}
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                {service.bullets.map((item) => (
                                    <div key={item} className="flex items-center gap-2 rounded-2xl bg-slate-50/90 px-3 py-2 text-sm font-medium text-slate-600">
                                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <ServiceStartButton
                                serviceType={service.serviceType}
                                serviceTitle={service.title}
                                included={service.bullets}
                                turnaround={service.turnaround}
                                className="mt-6"
                            />
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="premium-dark-panel hero-noise relative overflow-hidden p-8 text-white shadow-2xl shadow-blue-950/30 md:p-12">
                    <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="relative">
                        <div className="max-w-3xl">
                            <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                                How It Works
                            </p>
                            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                                Simple. Fast. Done For You.
                            </h2>
                            <p className="mt-4 text-lg leading-8 text-slate-300">
                                Choose, pay, share details, and track delivery.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-4 lg:grid-cols-5">
                            {steps.map((step, index) => (
                                <div
                                    key={step.title}
                                    className="group relative rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:bg-white/15"
                                >
                                    {index < steps.length - 1 && (
                                        <div className="absolute left-[calc(100%-0.25rem)] top-12 hidden h-px w-6 bg-blue-300/40 lg:block" />
                                    )}
                                    <IconBadge icon={step.icon} dark />
                                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                                        Step {index + 1}
                                    </p>
                                    <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-300">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-space relative mx-auto max-w-[1440px] px-6">
                <div className="absolute left-12 top-16 -z-10 h-80 w-80 rounded-full bg-indigo-100/70 blur-3xl" />
                <SectionHeader
                    eyebrow="Why IKIGAI"
                    title="Why Businesses Choose IKIGAI"
                    desc="Digital execution without operational clutter."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {reasons.map((reason) => (
                        <div
                            key={reason.title}
                            className="group rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-200/35"
                        >
                            <IconBadge icon={reason.icon} />
                            <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                                {reason.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{reason.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="premium-panel relative overflow-hidden p-8 shadow-2xl shadow-blue-100/40 md:p-10">
                    <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />
                    <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                        <div>
                            <p className="eyebrow">Razorpay Ready</p>
                            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
                                Safe & Transparent Payments
                            </h2>
                            <p className="mt-4 text-lg leading-8 text-slate-600">
                                Clear pricing, secure checkout, invoice-ready records.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                {["UPI", "Card", "Netbanking"].map((method) => (
                                    <span key={method} className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                                        {method}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-700">
                                <a href="mailto:support@ikigai.in" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm transition duration-200 hover:border-blue-200 hover:text-blue-700">
                                    <Mail className="h-4 w-4 text-blue-600" />
                                    Business support: support@ikigai.in
                                </a>
                                <a href="/contact" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm transition duration-200 hover:border-blue-200 hover:text-blue-700">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    Hyderabad, Telangana, India
                                </a>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {paymentTrust.map((item) => (
                                <div key={item.title} className="group rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-200/45 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60">
                                    <div className="flex items-start gap-4">
                                        <IconBadge icon={item.icon} />
                                        <div>
                                            <h3 className="font-semibold text-slate-950">{item.title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="Customer Stories"
                    title="Small wins that move businesses forward"
                    desc="Quick setup. Clearer selling. Better trust."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-3">
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.name} className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-xl">
                            <div className="flex items-center gap-1 text-yellow-500">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="mt-5 text-xl font-semibold leading-8 tracking-[-0.02em] text-slate-950">
                                “{testimonial.quote}”
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white">
                                    {testimonial.name[0]}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-950">{testimonial.name}</p>
                                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-10">
                <div className="premium-panel relative grid gap-6 overflow-hidden p-8 shadow-2xl shadow-slate-200/50 md:grid-cols-[1fr_auto] md:items-center md:p-10">
                    <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-100/80 blur-3xl" />
                    <div className="relative">
                        <p className="eyebrow">Partner With IKIGAI</p>
                        <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                            Earn With IKIGAI On Your Schedule
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Complete trained digital tasks remotely.
                        </p>
                    </div>
                    <a href="/partners" className="btn-secondary relative">
                        Become a Partner <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="FAQ"
                    title="Questions business owners ask before starting"
                    desc="Fast answers before your first service."
                />

                <div className="mx-auto mt-12 grid max-w-4xl gap-4">
                    {faqs.map((faq) => (
                        <details
                            key={faq.q}
                            className="group rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-lg shadow-slate-200/45 backdrop-blur-xl transition duration-300 open:border-blue-200 open:shadow-blue-100/60"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-slate-950">
                                {faq.q}
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition duration-300 group-open:rotate-45">
                                    +
                                </span>
                            </summary>
                            <p className="mt-4 text-sm leading-6 text-slate-600">{faq.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-20">
                <div className="premium-dark-panel hero-noise relative overflow-hidden p-8 text-center text-white shadow-2xl shadow-blue-950/30 md:p-14">
                    <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
                    <div className="relative">
                        <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            Start With IKIGAI
                        </p>
                        <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
                            Ready to set up your business online?
                        </h2>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                            Choose a service and let IKIGAI handle the execution.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                            <a href="/services" className="btn-primary bg-white px-8 py-4 text-slate-950 shadow-white/15 hover:bg-slate-100">
                                Start Your First Service
                            </a>
                            <a href="#pricing" className="btn-secondary border-white/15 bg-white/10 px-8 py-4 text-white hover:bg-white/15">
                                See Pricing
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 p-3 shadow-2xl shadow-slate-300/60 backdrop-blur-2xl md:hidden">
                <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
                    <a href="#pricing" className="btn-secondary py-3 text-xs">See Pricing</a>
                    <a href="/services" className="btn-primary py-3 text-xs">Get Started</a>
                </div>
            </div>
        </main>
    );
}
