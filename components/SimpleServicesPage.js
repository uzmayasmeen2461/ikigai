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
            <section className="hero-section px-6 py-16 md:px-10 md:py-20">
                <div className="hero-grid-bg" />
                <div className="relative mx-auto max-w-5xl">
                    <div className="hero-pill">
                        <div className="hero-pulse" />
                        Services
                    </div>
                    <h1 className="hero-h1 max-w-4xl md:text-6xl">
                        Pick a service and<br />
                        <span>start quickly.</span>
                    </h1>
                    <p className="hero-sub max-w-xl">
                        Clear pricing, simple steps, and secure payment.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        {["GST invoice available", "Secure Razorpay payments", "Fast turnaround", "Hyderabad support"].map((item) => (
                            <span key={item} className="badge badge-blue bg-white/10 text-[#7BA7F0]">
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-b border-[var(--border)] bg-white">
                <div className="mx-auto max-w-5xl px-6 py-12 md:px-10">
                    <p className="section-tag">Simple flow</p>
                    <div className="mt-5 grid gap-px overflow-hidden rounded-xl bg-[var(--border)] md:grid-cols-3">
                        {steps.map((step, index) => (
                            <div key={step} className="bg-white p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Step 0{index + 1}</p>
                                <p className="mt-2 text-xl font-bold text-[var(--ink)]">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-5xl px-6 py-12 md:px-10">
                <div className="grid gap-5 xl:grid-cols-2">
                    {services.map((service) => {
                        return (
                            <div
                                key={service.title}
                                className={`card-hover p-6 ${
                                    service.featured
                                        ? "border-[var(--accent)] xl:col-span-2"
                                        : ""
                                }`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`flex items-center justify-center border shadow-sm ${
                                            service.tileClassName || "h-16 w-16 rounded-xl"
                                        } ${
                                            service.featured
                                                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]"
                                        }`}>
                                            <ServiceIcon service={service} />
                                        </div>
                                        <div>
                                            {service.featured ? (
                                                <span className="badge badge-blue mb-2 uppercase tracking-[0.14em]">
                                                    Featured service
                                                </span>
                                            ) : null}
                                            <h2 className="text-2xl font-bold text-[var(--ink)]">{service.title}</h2>
                                            <p className="mt-2 text-sm leading-6 text-[var(--mid)]">{service.benefit}</p>
                                        </div>
                                    </div>
                                    <div className={`rounded-xl px-4 py-3 text-right ${
                                        service.featured
                                            ? "border border-[var(--accent)] bg-white"
                                            : "border border-[rgba(27,79,216,0.15)] bg-[var(--accent-light)]"
                                    }`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Starting at</p>
                                        <p className="mt-1 text-2xl font-bold text-[var(--ink)]">{formatINR(service.price)}</p>
                                        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--mid)]">
                                            <Clock3 className="h-3.5 w-3.5 text-[var(--accent)]" />
                                            {service.turnaround}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-2">
                                    {service.included.map((item) => (
                                        <p key={item} className="flex items-center gap-2 text-sm font-medium text-[var(--ink3)]">
                                            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                                            {item}
                                        </p>
                                    ))}
                                </div>

                                <details className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">View details</summary>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {service.details.map((item) => (
                                            <span key={item} className="badge badge-gray bg-white">
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
