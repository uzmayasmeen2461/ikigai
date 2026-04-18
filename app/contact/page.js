import {
    Clock3,
    Mail,
    MapPin,
    MessageCircle,
    ReceiptText,
    ShieldCheck,
} from "lucide-react";

const contactCards = [
    {
        title: "Business Support Email",
        value: "support@ikigai.in",
        href: "mailto:support@ikigai.in",
        icon: Mail,
    },
    {
        title: "Business Address",
        value: "Hyderabad, Telangana, India",
        href: "#address",
        icon: MapPin,
    },
    {
        title: "Support Hours",
        value: "Monday to Saturday, 10 AM - 7 PM",
        href: "#support",
        icon: Clock3,
    },
];

const trustItems = [
    { label: "Secure payments via Razorpay", icon: ShieldCheck },
    { label: "GST invoice available", icon: ReceiptText },
    { label: "WhatsApp-friendly support", icon: MessageCircle },
];

export default function ContactPage() {
    return (
        <main className="gradient-page overflow-hidden px-6 py-16">
            <section className="mx-auto max-w-[1180px]">
                <div className="premium-panel hero-noise relative overflow-hidden p-8 shadow-2xl shadow-blue-100/40 md:p-12">
                    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />
                    <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <p className="eyebrow">Contact Us</p>
                            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-[-0.05em] text-slate-950 md:text-6xl">
                                Talk to IKIGAI support
                            </h1>
                            <p className="mt-5 text-lg leading-8 text-slate-600">
                                Need help before starting a service? Reach us for business setup, payments, invoices, and task updates.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                {trustItems.map((item) => (
                                    <span
                                        key={item.label}
                                        className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {contactCards.map((card) => (
                                <a
                                    key={card.title}
                                    href={card.href}
                                    className="group rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-lg shadow-slate-200/45 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100/70"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/50">
                                            <card.icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                {card.title}
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-950">{card.value}</p>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <div id="address" className="mt-8 rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-lg shadow-slate-200/45">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Registered business address
                    </p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">
                        Hyderabad, Telangana, India
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Full business address and GST details can be updated here when finalized.
                    </p>
                </div>
            </section>
        </main>
    );
}
