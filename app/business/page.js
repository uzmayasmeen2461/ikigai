"use client";

import { useState } from "react";
import {
    ArrowRight,
    BarChart3,
    BriefcaseBusiness,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock3,
    Eye,
    FileCheck2,
    Globe2,
    KeyRound,
    Layers3,
    LockKeyhole,
    MessageSquareText,
    PackageCheck,
    Route,
    ShieldCheck,
    Sparkles,
    Store,
    UsersRound,
    Utensils,
} from "lucide-react";

const serviceOptions = [
    "WhatsApp Business Setup",
    "Product Listing",
    "Restaurant Onboarding",
    "Cloud Kitchen Digital Setup",
    "Social Media Business Setup",
    "Website / Web Store Setup",
];

const services = [
    {
        title: "WhatsApp Business and catalog setup",
        desc: "Business profile, catalog structure, customer messaging basics, and organized product details.",
        icon: MessageSquareText,
    },
    {
        title: "Product listing support",
        desc: "Listing-ready titles, descriptions, pricing, images, categories, and platform-ready product information.",
        icon: PackageCheck,
    },
    {
        title: "Restaurant and cloud kitchen setup",
        desc: "Menu organization, document checklist, delivery platform readiness, and food business onboarding support.",
        icon: Utensils,
    },
    {
        title: "Website, store, and social setup",
        desc: "Clean digital presence across website, web store, Instagram, and other customer-facing channels.",
        icon: Globe2,
    },
];

const executionSteps = [
    {
        title: "Share your requirement",
        desc: "Tell IKIGAI what you want to set up, list, organize, or launch for your business.",
        icon: ClipboardList,
    },
    {
        title: "IKIGAI structures the task",
        desc: "We review your inputs, define the work clearly, and convert scattered details into an execution plan.",
        icon: Layers3,
    },
    {
        title: "Execution through trained partners",
        desc: "IKIGAI assigns trained partners to complete the work within the managed task workflow.",
        icon: UsersRound,
    },
    {
        title: "Progress is tracked",
        desc: "You can follow status, updates, and completion from your dashboard without managing people manually.",
        icon: BarChart3,
    },
];

const dashboardItems = [
    {
        title: "Task status",
        desc: "See whether a task is pending, assigned, in progress, or completed.",
        icon: Route,
    },
    {
        title: "Partner updates",
        desc: "Read structured notes and updates added during execution.",
        icon: MessageSquareText,
    },
    {
        title: "Service details",
        desc: "Keep each request tied to the selected service, description, and business need.",
        icon: FileCheck2,
    },
    {
        title: "Clear next steps",
        desc: "Know what is moving, what is complete, and where IKIGAI needs more information.",
        icon: Clock3,
    },
];

const trustPoints = [
    "No need to hire full-time digital staff for small setup tasks.",
    "IKIGAI manages execution, partner assignment, and task structure.",
    "Partners only work with the details required and permitted for the task.",
    "Client progress, notes, and task status stay visible in the dashboard.",
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

export default function Business() {
    const [form, setForm] = useState({
        name: "",
        business: "",
        platform: "",
        products: "",
        requirement: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
        setSubmitMessage({ type: "", text: "" });
    };

    const validate = () => {
        let newErrors = {};

        if (!form.name || form.name.trim().length < 3) {
            newErrors.name = "Enter a valid name";
        }

        if (!form.business || form.business.trim().length < 2) {
            newErrors.business = "Enter business name";
        }

        if (!form.platform || form.platform === "Select a Service") {
            newErrors.platform = "Select a service";
        }

        if (!form.products || Number(form.products) <= 0) {
            newErrors.products = "Enter a valid number";
        }

        if (!form.requirement || form.requirement.trim().length < 10) {
            newErrors.requirement = "Please describe your requirement";
        }

        const dummyWords = ["test", "abc", "asdf", "qwerty"];
        if (dummyWords.includes(form.name.toLowerCase())) {
            newErrors.name = "Please enter your real name";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSubmitMessage({ type: "", text: "" });

        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setSubmitMessage({
                type: "error",
                text: "Please fix the highlighted fields before submitting.",
            });
            setLoading(false);
            return;
        }

        setErrors({});

        try {
            const res = await fetch("/api/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                setSuccess(true);
                setForm({
                    name: "",
                    business: "",
                    platform: "",
                    products: "",
                    requirement: "",
                });
            } else {
                setSubmitMessage({
                    type: "error",
                    text: "Could not submit your requirement right now. Please try again.",
                });
            }
        } catch (error) {
            console.error(error);
            setSubmitMessage({
                type: "error",
                text: "Network issue while submitting your requirement. Please try again.",
            });
        }

        setLoading(false);
    };

    return (
        <main className="gradient-page overflow-hidden">
            <section className="relative px-6 py-16 md:py-24">
                <div className="absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/50 blur-3xl" />
                <div className="absolute right-12 top-28 -z-10 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

                <div className="premium-panel mx-auto grid max-w-[1440px] gap-10 p-8 md:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm">
                            <Sparkles className="h-4 w-4" />
                            For business owners
                        </div>
                        <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight tracking-[-0.045em] text-slate-950 md:text-7xl">
                            Get digital tasks executed without hiring full-time staff.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                            IKIGAI helps businesses request, structure, execute, and track digital setup tasks
                            through a managed system of trained partners.
                        </p>
                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <a href="#get-started" className="btn-primary px-7 py-4">
                                Get started <ArrowRight className="ml-2 h-5 w-5" />
                            </a>
                            <a href="/services" className="btn-secondary px-7 py-4">
                                View services
                            </a>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-200/70">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Managed execution model
                        </p>
                        <div className="mt-6 grid gap-4">
                            {trustPoints.map((point) => (
                                <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                    <span className="text-sm leading-6 text-slate-700">{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="What You Can Request"
                    title="Digital business tasks, structured for execution"
                    desc="IKIGAI is built for practical setup work that small businesses need but do not always want to hire full-time staff for."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {services.map((service) => (
                        <div key={service.title} className="ui-card ui-card-hover">
                            <IconBadge icon={service.icon} />
                            <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                                {service.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{service.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="premium-dark-panel relative overflow-hidden p-8 text-white md:p-12">
                    <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

                    <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                                How execution works
                            </p>
                            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                                IKIGAI manages the work, not just the handoff.
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-slate-300">
                                Your task is reviewed, structured, assigned, tracked, and completed through a managed workflow.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {executionSteps.map((step, index) => (
                                <div key={step.title} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                                            <step.icon className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-semibold text-blue-200">0{index + 1}</span>
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <SectionHeader
                    eyebrow="Client Dashboard"
                    title="Track the work without chasing updates"
                    desc="Your dashboard keeps the business task visible, structured, and easy to follow from request to completion."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {dashboardItems.map((item) => (
                        <div key={item.title} className="ui-card ui-card-hover">
                            <IconBadge icon={item.icon} />
                            <h3 className="mt-6 text-xl font-semibold text-slate-950">{item.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section-space mx-auto max-w-[1440px] px-6">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                    <div>
                        <p className="eyebrow">Confidentiality</p>
                        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                            Managed access for sensitive business information.
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-slate-600">
                            IKIGAI is designed so businesses can share task requirements with confidence.
                            Partner execution is managed through IKIGAI, and confidential details are not directly
                            exposed unless the system permits access for the specific task.
                        </p>
                    </div>

                    <div className="grid gap-5">
                        {[
                            { title: "Confidentiality first", desc: "Business documents, credentials, and sensitive details are treated as controlled information.", icon: LockKeyhole },
                            { title: "Managed partner access", desc: "Partners receive task-relevant information through IKIGAI’s execution process.", icon: KeyRound },
                            { title: "Client visibility", desc: "You still see the status, notes, and progress updates needed to stay in control.", icon: Eye },
                            { title: "Structured completion", desc: "The goal is not random outsourcing. It is organized execution under IKIGAI management.", icon: ShieldCheck },
                        ].map((item) => (
                            <div key={item.title} className="ui-card flex gap-4 p-5">
                                <IconBadge icon={item.icon} />
                                <div>
                                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="get-started" className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div className="premium-dark-panel sticky top-28 p-8 text-white">
                        <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            <ClipboardCheck className="h-4 w-4" />
                            Get started
                        </p>
                        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                            Submit your business requirement.
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-slate-300">
                            Tell us what you need. IKIGAI will review the request and help structure the next steps.
                        </p>
                        <a href="/signup" className="btn-secondary mt-8 border-white/20 bg-white/10 text-white hover:bg-white/15">
                            Create client account
                        </a>
                    </div>

                    {!success ? (
                        <form onSubmit={handleSubmit} className="ui-card space-y-5 p-7">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Your name</label>
                                <input
                                    name="name"
                                    placeholder="Enter your name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className={`form-field ${errors.name ? "border-red-500" : ""}`}
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Business name</label>
                                <input
                                    name="business"
                                    placeholder="Enter business name"
                                    value={form.business}
                                    onChange={handleChange}
                                    className={`form-field ${errors.business ? "border-red-500" : ""}`}
                                />
                                {errors.business && <p className="mt-1 text-sm text-red-500">{errors.business}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Select a service</label>
                                <select
                                    name="platform"
                                    value={form.platform}
                                    onChange={handleChange}
                                    className={`form-field ${errors.platform ? "border-red-500" : ""}`}
                                >
                                    <option>Select a Service</option>
                                    {serviceOptions.map((service) => (
                                        <option key={service}>{service}</option>
                                    ))}
                                </select>
                                {errors.platform && <p className="mt-1 text-sm text-red-500">{errors.platform}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Number of products, items, or menu entries
                                </label>
                                <input
                                    type="number"
                                    name="products"
                                    placeholder="Example: 12"
                                    value={form.products}
                                    onChange={handleChange}
                                    className={`form-field ${errors.products ? "border-red-500" : ""}`}
                                />
                                {errors.products && <p className="mt-1 text-sm text-red-500">{errors.products}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Describe your requirement</label>
                                <textarea
                                    name="requirement"
                                    placeholder="Tell us what you want IKIGAI to help set up or execute."
                                    value={form.requirement}
                                    onChange={handleChange}
                                    className={`form-field min-h-36 ${errors.requirement ? "border-red-500" : ""}`}
                                />
                                {errors.requirement && <p className="mt-1 text-sm text-red-500">{errors.requirement}</p>}
                            </div>

                            {submitMessage.text && (
                                <div
                                    className={`rounded-2xl border p-4 text-sm leading-6 ${
                                        submitMessage.type === "error"
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-green-200 bg-green-50 text-green-700"
                                    }`}
                                >
                                    {submitMessage.text}
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="btn-primary w-full">
                                {loading ? "Submitting..." : "Submit Requirement"}
                            </button>
                        </form>
                    ) : (
                        <div className="ui-card p-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <h2 className="mt-5 text-2xl font-semibold text-slate-950">
                                Thanks. IKIGAI will review your request.
                            </h2>
                            <p className="mt-2 text-slate-500">
                                Our team will contact you within 24 hours with the next steps.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
