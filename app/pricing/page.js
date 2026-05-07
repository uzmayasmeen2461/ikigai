import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { formatINR } from "../lib/pricing";

const services = [
    ["WhatsApp Business Catalog Setup", 2000, "2-3 days"],
    ["Product Listing Setup", 1999, "3-5 days"],
    ["Restaurant Listing Support", 3499, "4-6 days"],
    ["Cloud Kitchen Setup", 4999, "5-7 days"],
    ["Instagram / Facebook Business Setup", 2499, "3-4 days"],
    ["Website / Store Setup", 7999, "7-10 days"],
];

export default function PricingPage() {
    return (
        <main className="gradient-page">
            <section className="mx-auto max-w-[1440px] px-6 py-16 md:py-20">
                <p className="eyebrow">Pricing</p>
                <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 md:text-6xl">
                    Clear prices for managed digital services
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                    Choose a service, share details, pay securely, and track progress from your dashboard.
                </p>

                <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {services.map(([name, price, turnaround]) => (
                        <article key={name} className="dashboard-card dashboard-card-hover p-6">
                            <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{name}</h2>
                            <p className="mt-4 text-3xl font-semibold text-slate-950">{formatINR(price)}</p>
                            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                                <Clock3 className="h-4 w-4 text-blue-600" />
                                {turnaround}
                            </p>
                            <div className="mt-5 grid gap-2 text-sm text-slate-600">
                                {["Managed setup", "Secure payment", "Invoice support"].map((item) => (
                                    <span key={item} className="inline-flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                            <Link href="/services" className="btn-primary mt-6 w-full">
                                Start service
                            </Link>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
