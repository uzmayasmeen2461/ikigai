import Image from "next/image";
import { CheckCircle2, Clock3, Store } from "lucide-react";
import { formatINR } from "../app/lib/pricing";
import { ServiceStartButton } from "./ServiceStartButton";

const services = [
    {
        title: "Website / Store Setup",
        serviceType: "website",
        price: 7999,
        turnaround: "7-10 days",
        benefit: "Launch a clean business website that builds trust and brings enquiries.",
        included: ["Main pages", "Mobile-ready layout", "Contact setup"],
        details: ["Logo", "Business summary", "Products/services", "Contact details"],
        featured: true,
        logo: "/service-logos/chrome.png",
    },
    {
        title: "WhatsApp Business Catalog Setup",
        serviceType: "whatsapp",
        price: 2000,
        turnaround: "2-3 days",
        benefit: "Set up WhatsApp to sell faster.",
        included: ["Profile setup", "Catalog support", "Reply setup"],
        details: ["Business name", "Phone number", "Logo", "Product photos", "Prices"],
        logo: "/service-logos/whatsapp.jpeg",
    },
    {
        title: "Product Listing Setup",
        serviceType: "listing",
        price: 1999,
        turnaround: "3-5 days",
        benefit: "Get products ready to publish.",
        included: ["Titles", "Descriptions", "Category setup"],
        details: ["Product images", "Names", "Prices", "Categories"],
        logo: "/service-logos/amazon.png",
    },
    {
        title: "Restaurant Listing Support",
        serviceType: "restaurant",
        price: 3499,
        turnaround: "4-6 days",
        benefit: "Prepare your restaurant for online orders.",
        included: ["Menu setup", "Listing inputs", "Document checklist"],
        details: ["Menu", "Photos", "Address", "FSSAI", "Bank details"],
        logo: "/service-logos/swiggy.png",
    },
    {
        title: "Cloud Kitchen Setup",
        serviceType: "cloud_kitchen",
        price: 4999,
        turnaround: "5-7 days",
        benefit: "Launch your kitchen online.",
        included: ["Kitchen profile", "Menu setup", "Delivery readiness"],
        details: ["Kitchen name", "Menu", "Photos", "FSSAI", "Bank details"],
        logo: "/service-logos/cloud-kitchen.avif",
        logoWidth: 52,
        logoHeight: 52,
        logoClassName: "h-12 w-12",
        tileClassName: "h-20 w-20 rounded-[1.6rem]",
    },
    {
        title: "Instagram / Facebook Business Setup",
        serviceType: "instagram",
        price: 2499,
        turnaround: "3-4 days",
        benefit: "Make your page look business-ready.",
        included: ["Bio update", "Contact setup", "Highlight plan"],
        details: ["Logo", "Business info", "Photos", "Products or services"],
        logo: "/service-logos/instagram.jpeg",
    },
];

const steps = ["Service selected", "Share details", "Pay & Start"];

function ServiceIcon({ service }) {
    if (service.logo) {
        return (
            <Image
                src={service.logo}
                alt={`${service.title} logo`}
                width={service.logoWidth || 40}
                height={service.logoHeight || 40}
                className={`${service.logoClassName || "h-10 w-10"} object-contain`}
            />
        );
    }

    return <Store className="h-6 w-6" />;
}

export function SimpleServicesPage() {
    return (
        <main className="gradient-page overflow-hidden">
            <section className="px-6 pb-12 pt-10 md:pb-16 md:pt-14">
                <div className="mx-auto max-w-[1440px] rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-2xl shadow-slate-200/40 backdrop-blur-xl md:p-12">
                    <p className="eyebrow">Services</p>
                    <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 md:text-6xl">
                        Pick a service and start quickly
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                        Clear pricing, simple steps, and secure payment.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        {["GST invoice available", "Secure Razorpay payments", "Fast turnaround", "Hyderabad support"].map((item) => (
                            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30">
                    <p className="text-sm font-semibold text-slate-500">Simple flow</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {steps.map((step, index) => (
                            <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-blue-700">Step {index + 1}</p>
                                <p className="mt-2 text-xl font-semibold text-slate-950">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-12">
                <div className="grid gap-5 xl:grid-cols-2">
                    {services.map((service) => {
                        return (
                            <div
                                key={service.title}
                                className={`rounded-[1.75rem] border bg-white p-6 shadow-lg shadow-slate-200/35 ${
                                    service.featured
                                        ? "border-blue-200 bg-gradient-to-br from-white via-blue-50/50 to-white xl:col-span-2"
                                        : "border-slate-200"
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`flex items-center justify-center border shadow-sm ${
                                            service.tileClassName || "h-16 w-16 rounded-[1.35rem]"
                                        } ${
                                            service.featured
                                                ? "border-blue-200 bg-white text-blue-700 shadow-blue-100/70"
                                                : "border-slate-200 bg-slate-50 text-blue-700 shadow-slate-200/70"
                                        }`}>
                                            <ServiceIcon service={service} />
                                        </div>
                                        <div>
                                            {service.featured ? (
                                                <span className="inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                                    Featured service
                                                </span>
                                            ) : null}
                                            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{service.title}</h2>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">{service.benefit}</p>
                                        </div>
                                    </div>
                                    <div className={`rounded-2xl px-4 py-3 text-right ${
                                        service.featured
                                            ? "border border-blue-200 bg-white shadow-sm shadow-blue-100/50"
                                            : "border border-blue-100 bg-blue-50"
                                    }`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Starting at</p>
                                        <p className="mt-1 text-2xl font-semibold text-slate-950">{formatINR(service.price)}</p>
                                        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                                            <Clock3 className="h-3.5 w-3.5 text-blue-600" />
                                            {service.turnaround}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-2">
                                    {service.included.map((item) => (
                                        <p key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                            {item}
                                        </p>
                                    ))}
                                </div>

                                <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">View details</summary>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {service.details.map((item) => (
                                            <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </details>

                                <div className="mt-5">
                                    <ServiceStartButton
                                        serviceType={service.serviceType}
                                        serviceTitle={service.title}
                                        included={service.included}
                                        requiredDetails={service.details}
                                        turnaround={service.turnaround}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
