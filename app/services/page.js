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
    LockKeyhole,
    Mail,
    MessageCircle,
    PackageCheck,
    ReceiptText,
    ShieldCheck,
    Sparkles,
    Star,
    Store,
    Utensils,
    WalletCards,
    Zap,
} from "lucide-react";
import { formatINR } from "../lib/pricing";
import { ServiceStartButton } from "../../components/ServiceStartButton";

const services = [
    {
        title: "WhatsApp Business Setup",
        serviceType: "whatsapp",
        price: 2000,
        turnaround: "2-3 working days",
        description: "Set up WhatsApp to sell, reply, and look trusted.",
        included: ["Business profile setup", "Catalog structure", "Product names and prices", "Greeting and quick replies"],
        for: "Retailers, home businesses, service providers, WhatsApp sellers",
        needs: ["Business name", "Active phone number", "Logo", "Product photos", "Product names and prices"],
        icon: MessageCircle,
    },
    {
        title: "Product Listing Across Platforms",
        serviceType: "listing",
        price: 1999,
        turnaround: "3-5 working days",
        description: "Make your products ready to publish and sell.",
        included: ["Listing titles", "Descriptions", "Category mapping", "Price and variant formatting"],
        for: "Instagram sellers, boutiques, retailers, product-led businesses",
        needs: ["Product images", "Titles", "Descriptions", "Prices", "Categories"],
        icon: PackageCheck,
    },
    {
        title: "Restaurant Listing / Delivery App Setup",
        serviceType: "restaurant",
        price: 3499,
        turnaround: "4-6 working days",
        description: "Prepare your restaurant for online orders.",
        included: ["Menu formatting", "Pricing structure", "Restaurant details", "Document checklist"],
        for: "Restaurants, cafes, bakeries, tiffin services, food brands",
        needs: ["Menu", "Food images", "Address", "FSSAI", "GST if applicable", "Bank details"],
        icon: Utensils,
    },
    {
        title: "Cloud Kitchen Digital Setup",
        serviceType: "cloud_kitchen",
        price: 4999,
        turnaround: "5-7 working days",
        description: "Get your cloud kitchen ready for customers.",
        included: ["Kitchen profile", "Menu asset organization", "Delivery readiness", "Customer contact setup"],
        for: "Cloud kitchens, home chefs, delivery-only food brands",
        needs: ["Kitchen name", "FSSAI", "Menu and prices", "Food photos", "Service area", "Bank details"],
        icon: Store,
    },
    {
        title: "Instagram / Facebook Business Setup",
        serviceType: "instagram",
        price: 2499,
        turnaround: "3-4 working days",
        description: "Make your social page look business-ready.",
        included: ["Profile optimization", "Bio and contact buttons", "Highlight structure", "Starter content direction"],
        for: "Instagram sellers, salons, local services, creators, consultants",
        needs: ["Logo or profile image", "Business description", "Contact details", "Photos", "Product or service list"],
        icon: Camera,
    },
    {
        title: "Website / Web Store Setup",
        serviceType: "website",
        price: 7999,
        turnaround: "7-10 working days",
        description: "Launch a simple, credible website or store.",
        included: ["Core website sections", "Mobile-friendly layout", "Product or service pages", "Inquiry CTA setup"],
        for: "Businesses needing a website, landing page, catalog, or store",
        needs: ["Business summary", "Logo", "Services or products", "Contact details", "Images"],
        icon: Globe2,
    },
];

const trustPoints = [
    "GST Invoice Available",
    "Secure Razorpay Payments",
    "Fast Turnaround",
    "Hyderabad Support",
];

const prepCards = [
    {
        title: "WhatsApp Business Setup",
        icon: MessageCircle,
        items: ["Business name", "Active phone number", "Logo", "Product photos", "Product names and prices"],
    },
    {
        title: "Product Listing",
        icon: PackageCheck,
        items: ["Product images", "Titles", "Descriptions", "Prices", "Categories"],
    },
    {
        title: "Restaurant / Cloud Kitchen Setup",
        icon: Utensils,
        items: ["Menu", "Food images", "Address", "FSSAI", "GST if applicable", "Bank details"],
    },
    {
        title: "Social Media Business Setup",
        icon: Camera,
        items: ["Logo", "Bio", "Contact details", "Photos", "Service or product list"],
    },
    {
        title: "Website Setup",
        icon: Globe2,
        items: ["Business summary", "Logo", "Services/products", "Contact details", "Images"],
    },
];

const purchaseSteps = [
    { title: "Choose service", desc: "Pick what you need.", icon: BadgeCheck },
    { title: "Share details", desc: "Add notes and assets.", icon: FileText },
    { title: "Pay securely", desc: "Checkout with Razorpay.", icon: CreditCard },
    { title: "We execute", desc: "IKIGAI manages the task.", icon: Zap },
    { title: "Track progress", desc: "See dashboard updates.", icon: Clock3 },
];

const reasons = [
    { title: "No full-time hiring", desc: "Pay for the service, not payroll.", icon: Handshake },
    { title: "Fixed pricing", desc: "Clear cost before checkout.", icon: WalletCards },
    { title: "Managed by IKIGAI", desc: "One structured execution flow.", icon: ShieldCheck },
    { title: "Verified partners", desc: "Trained support behind the work.", icon: BadgeCheck },
    { title: "Progress tracking", desc: "Updates in your dashboard.", icon: Clock3 },
    { title: "GST + Razorpay", desc: "Invoice-ready secure payment.", icon: ReceiptText },
];

const testimonials = [
    {
        name: "Ayesha",
        role: "Boutique Owner",
        quote: "Our WhatsApp catalog looked professional in days.",
    },
    {
        name: "Ravi",
        role: "Restaurant Owner",
        quote: "Our delivery listing felt simple and organized.",
    },
    {
        name: "Farhan",
        role: "Home Business Owner",
        quote: "Clear pricing and quick support after payment.",
    },
];

const faqs = [
    ["How fast can service start?", "Most services start within 24 hours after payment and required details."],
    ["Is payment secure?", "Yes. Payments are processed through Razorpay checkout."],
    ["Will I get an invoice?", "Yes. GST invoice information is available after successful payment."],
    ["Do you support Hyderabad businesses?", "Yes. IKIGAI supports Hyderabad SMBs and Indian small businesses."],
    ["What if I need help after purchase?", "You can contact IKIGAI support and track updates from your dashboard."],
    ["Can I track my service status?", "Yes. Paid tasks appear in your client dashboard with status and updates."],
];

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

export default function ServicesPage() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="relative px-6 pb-14 pt-10 md:pb-20 md:pt-16">
                <div className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(circle_at_24%_8%,rgba(37,99,235,0.22),transparent_30rem),radial-gradient(circle_at_78%_18%,rgba(99,102,241,0.16),transparent_30rem)]" />
                <div className="absolute left-1/2 top-14 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/35 blur-3xl" />

                <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="animate-fade-up">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm backdrop-blur-xl">
                            <Sparkles className="h-4 w-4" />
                            Done-for-you digital services
                        </div>
                        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-slate-950 md:text-7xl">
                            Choose the digital services your business actually needs
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                            Fixed-price digital setup for WhatsApp, listings, delivery apps, social pages, and websites.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <a href="#service-list" className="btn-primary px-7 py-4">
                                Start Your First Service <ArrowRight className="ml-2 h-5 w-5" />
                            </a>
                            <a href="/contact" className="btn-secondary px-7 py-4">
                                Talk to IKIGAI
                            </a>
                        </div>

                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            {trustPoints.map((point) => (
                                <div key={point} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-200/55 backdrop-blur-xl">
                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                    {point}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="animate-fade-up-delay">
                        <div className="premium-panel hero-noise relative overflow-hidden p-6 shadow-2xl shadow-blue-100/50">
                            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-100/90 blur-3xl" />
                            <div className="relative rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/60">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Checkout-ready services
                                </p>
                                <div className="mt-5 grid gap-4">
                                    {services.slice(0, 3).map((service) => (
                                        <div key={service.title} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <IconBadge icon={service.icon} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-950">{service.title}</p>
                                                        <p className="text-xs text-slate-500">{service.turnaround}</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-semibold text-blue-700">{formatINR(service.price)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
                                    <p className="text-sm font-semibold">Pay securely. Get invoices. Track progress.</p>
                                    <p className="mt-2 text-xs leading-5 text-slate-300">
                                        Built for small business owners.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="service-list" className="section-space relative mx-auto max-w-[1440px] px-6">
                <div className="absolute -left-24 top-20 -z-10 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />
                <SectionHeader
                    eyebrow="Services"
                    title="Pick a service and start securely"
                    desc="Clear scope, price, timeline, and checkout."
                />

                <div className="mt-12 grid gap-5 xl:grid-cols-2">
                    {services.map((service) => (
                        <article key={service.title} className="group relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/45 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-200/35 md:p-6">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-200" />
                            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-100/70 blur-3xl transition duration-300 group-hover:bg-indigo-100/80" />

                            <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                                <div className="flex gap-4">
                                    <IconBadge icon={service.icon} />
                                    <div className="min-w-0">
                                        <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                            Done-for-you service
                                        </span>
                                        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
                                            {service.title}
                                        </h3>
                                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{service.description}</p>
                                    </div>
                                </div>

                                <div className="rounded-[1.35rem] border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-lg shadow-blue-100/40 md:min-w-44 md:text-right">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                        Starts at
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-950 md:text-2xl">
                                        {formatINR(service.price)}
                                    </p>
                                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                                        <Clock3 className="h-3.5 w-3.5 text-blue-600" />
                                        {service.turnaround}
                                    </p>
                                </div>
                            </div>

                            <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.8fr_1fr]">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/85 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        Included
                                    </p>
                                    <div className="mt-3 grid gap-2">
                                        {service.included.map((item) => (
                                            <p key={item} className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                                                {item}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-white/75 p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        Best for
                                    </p>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">{service.for}</p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-white/75 p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        Keep ready
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2.5">
                                        {service.needs.map((item) => (
                                            <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="relative mt-5 grid gap-4 rounded-[1.35rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50/70 p-4 shadow-lg shadow-blue-100/35 md:grid-cols-[1fr_auto] md:items-center md:p-5">
                                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
                                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs text-white shadow-sm">
                                        Premium pricing
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
                                        <ReceiptText className="h-4 w-4 text-blue-600" />
                                        GST applicable
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                        Razorpay secure
                                    </span>
                                </div>
                                <ServiceStartButton
                                    serviceType={service.serviceType}
                                    serviceTitle={service.title}
                                    included={service.included}
                                    requiredDetails={service.needs}
                                    turnaround={service.turnaround}
                                    className="w-full md:min-w-56"
                                />
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="Before Checkout"
                    title="What to keep ready"
                    desc="Start faster with the right details."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                    {prepCards.map((card) => (
                        <div key={card.title} className="ui-card ui-card-hover">
                            <IconBadge icon={card.icon} />
                            <h3 className="mt-6 text-lg font-semibold tracking-[-0.02em] text-slate-950">{card.title}</h3>
                            <div className="mt-5 space-y-3">
                                {card.items.map((item) => (
                                    <div key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="premium-dark-panel hero-noise relative overflow-hidden p-8 text-white shadow-2xl shadow-blue-950/30 md:p-12">
                    <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="relative">
                        <div className="max-w-3xl">
                            <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                                How Purchase Works
                            </p>
                            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                                Buy once. Track clearly.
                            </h2>
                            <p className="mt-4 text-lg leading-8 text-slate-300">
                                From checkout to delivery, without confusion.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-4 lg:grid-cols-5">
                            {purchaseSteps.map((step, index) => (
                                <div key={step.title} className="group rounded-3xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:bg-white/15">
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

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="Trust"
                    title="Why buy from IKIGAI"
                    desc="Clear pricing, managed execution, secure payment."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {reasons.map((reason) => (
                        <div key={reason.title} className="group rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-200/35">
                            <IconBadge icon={reason.icon} />
                            <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-slate-950">{reason.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{reason.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="Stories"
                    title="Built for real business owners"
                    desc="Simple outcomes. Less back-and-forth."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-3">
                    {testimonials.map((item) => (
                        <div key={item.name} className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-xl">
                            <div className="flex gap-1 text-yellow-500">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="mt-5 text-xl font-semibold leading-8 tracking-[-0.02em] text-slate-950">
                                “{item.quote}”
                            </p>
                            <div className="mt-6">
                                <p className="font-semibold text-slate-950">{item.name}</p>
                                <p className="text-sm text-slate-500">{item.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="FAQ"
                    title="Questions before you pay"
                    desc="Know the basics before checkout."
                />

                <div className="mx-auto mt-12 grid max-w-4xl gap-4">
                    {faqs.map(([q, a]) => (
                        <details key={q} className="group rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-lg shadow-slate-200/45 backdrop-blur-xl transition duration-300 open:border-blue-200 open:shadow-blue-100/60">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-slate-950">
                                {q}
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition duration-300 group-open:rotate-45">
                                    +
                                </span>
                            </summary>
                            <p className="mt-4 text-sm leading-6 text-slate-600">{a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-20">
                <div className="premium-dark-panel hero-noise relative overflow-hidden p-8 text-center text-white shadow-2xl shadow-blue-950/30 md:p-14">
                    <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="relative">
                        <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            Start Today
                        </p>
                        <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
                            Ready to get your business digitally set up?
                        </h2>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                            Choose a service. Pay securely. Track progress.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                            <a href="#service-list" className="btn-primary bg-white px-8 py-4 text-slate-950 shadow-white/15 hover:bg-slate-100">
                                Start Now
                            </a>
                            <a href="/contact" className="btn-secondary border-white/15 bg-white/10 px-8 py-4 text-white hover:bg-white/15">
                                Contact IKIGAI
                            </a>
                        </div>
                        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold text-blue-100">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                                <LockKeyhole className="h-4 w-4" />
                                Secure payments
                            </span>
                            <a href="mailto:support@ikigai.in" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 transition hover:bg-white/15">
                                <Mail className="h-4 w-4" />
                                support@ikigai.in
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
