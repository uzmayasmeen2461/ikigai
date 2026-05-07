import {
    BadgeCheck,
    CheckCircle2,
    CreditCard,
    MessageCircle,
    PackageCheck,
    Sparkles,
    Store,
    Globe2,
    Camera,
    Utensils,
} from "lucide-react";
import { formatINR } from "../app/lib/pricing";
import { ServiceStartButton } from "./ServiceStartButton";

const services = [
    { title: "WhatsApp Catalog", serviceType: "whatsapp", price: 2000, benefit: "Sell on WhatsApp faster.", icon: MessageCircle },
    { title: "Product Listing", serviceType: "listing", price: 1999, benefit: "Get products ready to publish.", icon: PackageCheck },
    { title: "Restaurant Setup", serviceType: "restaurant", price: 3499, benefit: "Start online delivery setup.", icon: Utensils },
    { title: "Cloud Kitchen Setup", serviceType: "cloud_kitchen", price: 4999, benefit: "Launch your kitchen online.", icon: Store },
    { title: "Social Media Setup", serviceType: "instagram", price: 2499, benefit: "Make your page look business-ready.", icon: Camera },
    { title: "Website Setup", serviceType: "website", price: 7999, benefit: "Get a simple business website.", icon: Globe2 },
];

const trust = ["Secure payments", "Invoice available", "Hyderabad support", "Fast delivery"];

const steps = [
    { title: "Choose service", detail: "Pick what you need." },
    { title: "Share details", detail: "Add your business info." },
    { title: "Pay & track", detail: "We start after payment." },
];

export function SimpleHomeLanding() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="px-6 pb-14 pt-10 md:pb-20 md:pt-16">
                <div className="mx-auto max-w-[1440px]">
                    <div className="grid items-center gap-10 rounded-[2rem] border border-slate-200/80 bg-white/85 p-8 shadow-2xl shadow-slate-200/45 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                                <Sparkles className="h-4 w-4" />
                                Simple business setup
                            </div>
                            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 md:text-7xl">
                                Get Your Business Online, Without Stress
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                                WhatsApp catalogs, product listings, restaurant setup, websites, and digital support — done for you.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <a href="/services" className="btn-primary px-7 py-4">
                                    Start a Service
                                </a>
                                <a href="/services#pricing" className="btn-secondary px-7 py-4">
                                    View Pricing
                                </a>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                {trust.map((item) => (
                                    <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/40">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Start quickly</p>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                {services.slice(0, 4).map((service) => {
                                    const Icon = service.icon;
                                    return (
                                        <div key={service.title} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                            <Icon className="h-5 w-5 text-blue-200" />
                                            <p className="mt-3 font-semibold">{service.title}</p>
                                            <p className="mt-1 text-sm text-slate-300">{formatINR(service.price)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="eyebrow">Popular services</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Start with one service</h2>
                    </div>
                    <a href="/services" className="hidden text-sm font-semibold text-blue-700 md:inline-flex">
                        View all
                    </a>
                </div>

                <div id="pricing" className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {services.map((service) => {
                        const Icon = service.icon;
                        return (
                            <div key={service.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        From {formatINR(service.price)}
                                    </span>
                                </div>
                                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{service.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{service.benefit}</p>
                                <div className="mt-5">
                                    <ServiceStartButton
                                        serviceType={service.serviceType}
                                        serviceTitle={service.title}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/35">
                    <p className="eyebrow">How it works</p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {steps.map((step, index) => (
                            <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                                    {index + 1}
                                </span>
                                <p className="mt-4 text-xl font-semibold text-slate-950">{step.title}</p>
                                <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/35 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                        <p className="eyebrow">Partner</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">Want to earn with ikigaidigital?</h2>
                        <p className="mt-3 text-base text-slate-600">Join as a Partner and complete simple digital tasks.</p>
                    </div>
                    <a href="/partners" className="btn-secondary px-7 py-4">
                        Join as Partner
                    </a>
                </div>
            </section>
        </main>
    );
}
