import Link from "next/link";
import {
    ArrowRight,
    BadgeCheck,
    BookOpenCheck,
    BriefcaseBusiness,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    Globe2,
    GraduationCap,
    Handshake,
    Laptop,
    Layers3,
    MessageSquareText,
    Route,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    UsersRound,
    Wifi,
} from "lucide-react";

const benefits = [
    {
        title: "Earn flexibly",
        desc: "Contribute to real business tasks with availability that fits your routine and pace.",
        icon: CalendarClock,
    },
    {
        title: "Build digital confidence",
        desc: "Work on practical services like listings, business pages, catalog setup, and client updates.",
        icon: TrendingUp,
    },
    {
        title: "Be part of a curated network",
        desc: "IKIGAI brings together reliable partners who care about clarity, consistency, and quality.",
        icon: UsersRound,
    },
    {
        title: "Work with structure",
        desc: "Tasks are guided through IKIGAI so expectations, updates, and completion steps stay clear.",
        icon: Layers3,
    },
];

const taskTypes = [
    { title: "WhatsApp Business setup", desc: "Business profile details, catalog entries, and messaging setup support.", icon: MessageSquareText },
    { title: "Product listing support", desc: "Clean titles, descriptions, pricing, categories, and image organization.", icon: ClipboardCheck },
    { title: "Restaurant onboarding support", desc: "Menu formatting, listing details, and document readiness checks.", icon: BriefcaseBusiness },
    { title: "Social media page setup", desc: "Profile basics, bio structure, highlights, contact details, and starter organization.", icon: Globe2 },
    { title: "Website content entry", desc: "Simple page content, product or service details, and inquiry-focused information.", icon: Laptop },
    { title: "Client progress updates", desc: "Clear task notes, status updates, and completion communication.", icon: Route },
];

const support = [
    {
        title: "Training before assignments",
        desc: "Get guidance on task standards before taking on client-facing digital work.",
        icon: GraduationCap,
    },
    {
        title: "Clear task instructions",
        desc: "Each assignment is structured so you know what to do, what to update, and when to complete it.",
        icon: Target,
    },
    {
        title: "Managed quality process",
        desc: "IKIGAI keeps the network professional through review, task structure, and communication expectations.",
        icon: ShieldCheck,
    },
];

const flexibility = [
    "Remote-first digital contribution",
    "Assignments based on task fit and availability",
    "Progress at a pace that supports reliable delivery",
    "Professional communication through IKIGAI’s managed flow",
];

function IconBadge({ icon: Icon }) {
    return (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/50">
            <Icon className="h-6 w-6" />
        </div>
    );
}

function SectionHeader({ eyebrow, title, desc }) {
    return (
        <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                {title}
            </h2>
            {desc && <p className="mt-4 text-lg leading-8 text-slate-600">{desc}</p>}
        </div>
    );
}

export default function PartnersPage() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="relative px-6 py-16 md:py-24">
                <div className="absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/50 blur-3xl" />
                <div className="absolute right-16 top-28 -z-10 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

                <div className="premium-panel mx-auto grid max-w-[1440px] gap-10 p-8 md:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm">
                            <Sparkles className="h-4 w-4" />
                            Curated partner network
                        </div>
                        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight tracking-[-0.045em] text-slate-950 md:text-7xl">
                            Earn with IKIGAI, at your own pace.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                            Join IKIGAI as a partner and contribute to meaningful digital setup tasks for small
                            businesses through a professional, guided, and flexible network.
                        </p>
                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link href="/workers/apply" className="btn-primary px-7 py-4">
                                Join as a Partner <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                            <a href="#partner-network" className="btn-secondary px-7 py-4">
                                Explore the network
                            </a>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-200/70">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Designed for flexible contribution
                        </p>
                        <div className="mt-6 grid gap-4">
                            {[
                                "Respectful digital assignments",
                                "Training before client tasks",
                                "Remote-friendly task flow",
                                "Professional IKIGAI-managed process",
                            ].map((point) => (
                                <div key={point} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-medium text-slate-700">{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="partner-network" className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="Why Become A Partner"
                    title="A professional way to earn through digital contribution"
                    desc="IKIGAI partners support real business execution while working through a clear, managed, and respectful task system."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {benefits.map((benefit) => (
                        <div key={benefit.title} className="ui-card ui-card-hover">
                            <IconBadge icon={benefit.icon} />
                            <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                                {benefit.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div>
                        <p className="eyebrow">Digital Tasks</p>
                        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                            Support businesses with practical digital execution.
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-slate-600">
                            Partners may help with structured tasks that move small businesses forward, from digital
                            setup to clean updates and completion notes.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {taskTypes.map((task) => (
                            <div key={task.title} className="ui-card ui-card-hover p-5">
                                <IconBadge icon={task.icon} />
                                <h3 className="mt-5 text-lg font-semibold text-slate-950">{task.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{task.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="premium-dark-panel relative overflow-hidden p-8 text-white md:p-12">
                    <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

                    <div className="relative grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                        <div>
                            <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                                Training & Support
                            </p>
                            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                                Guidance before assignments, clarity during execution.
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-slate-300">
                                IKIGAI supports partners with expectations, training, and structured task flow so the
                                work feels focused rather than confusing.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {support.map((item) => (
                                <div key={item.title} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                    <div className="ui-card p-8 md:p-10">
                        <IconBadge icon={Clock3} />
                        <h2 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                            Flexible work, handled professionally.
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-slate-600">
                            IKIGAI is for people who want flexible earning opportunities without losing the dignity
                            of professional standards. You contribute when your availability and task fit align.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        {flexibility.map((item) => (
                            <div key={item} className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50">
                                <BadgeCheck className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-medium text-slate-700">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="premium-panel p-8 text-center md:p-12">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/50">
                        <Handshake className="h-7 w-7" />
                    </div>
                    <p className="eyebrow mt-6">Join IKIGAI</p>
                    <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                        Become part of a curated partner network.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                        Apply to join IKIGAI and start with guided digital tasks that match your skills, reliability,
                        and availability.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link href="/workers/apply" className="btn-primary px-8 py-4">
                            Apply to Join
                        </Link>
                        <a href="#partner-network" className="btn-secondary px-8 py-4">
                            Review Benefits
                        </a>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                        Training and task guidance are part of the IKIGAI partner experience.
                    </p>
                </div>
            </section>
        </main>
    );
}
