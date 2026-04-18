const footerGroups = [
    {
        title: "Company",
        links: [
            { label: "Home", href: "/" },
            { label: "For Business", href: "/business" },
            { label: "Partner With Us", href: "/partners" },
            { label: "Contact Us", href: "/contact" },
        ],
    },
    {
        title: "Services",
        links: [
            { label: "WhatsApp Business Setup", href: "/services" },
            { label: "Product Listing", href: "/services" },
            { label: "Restaurant Listing", href: "/services" },
            { label: "Website / Store Setup", href: "/services" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Refund Policy", href: "/refund-policy" },
            { label: "Terms & Conditions", href: "/terms" },
        ],
    },
    {
        title: "Contact",
        links: [
            { label: "support@ikigai.in", href: "mailto:support@ikigai.in" },
            { label: "Hyderabad, Telangana, India", href: "/contact" },
            { label: "GST invoice available", href: "/services" },
        ],
    },
];

export function Footer() {
    return (
        <footer id="contact" className="mt-20 border-t border-slate-200/80 bg-white/85 backdrop-blur-2xl">
            <div className="mx-auto max-w-[1440px] px-6 py-12">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_1.5fr] lg:items-start">
                    <div>
                        <div className="inline-flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-300/60">
                                IK
                            </span>
                            <div>
                                <span className="block bg-gradient-to-r from-slate-950 via-slate-800 to-blue-700 bg-clip-text text-2xl font-semibold tracking-[-0.04em] text-transparent">
                                    IKIGAI
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Connecting Purpose with Productivity
                                </span>
                            </div>
                        </div>
                        <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">
                            Premium digital setup and execution support for Indian small businesses,
                            restaurants, cloud kitchens, retailers, and home brands.
                        </p>
                        <div className="mt-5 grid gap-2 text-sm text-slate-600">
                            <span>Business support: support@ikigai.in</span>
                            <span>Address: Hyderabad, Telangana, India</span>
                            <span>Secure payments via Razorpay. GST invoice available.</span>
                        </div>
                        <a
                            href="/services"
                            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300/60 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-200"
                        >
                            Start Your First Service
                        </a>
                    </div>

                    <nav className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {footerGroups.map((group) => (
                            <div key={group.title}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {group.title}
                                </p>
                                <div className="mt-4 grid gap-3">
                                    {group.links.map((link) => (
                                        <a
                                            key={`${group.title}-${link.label}`}
                                            href={link.href}
                                            className="text-sm font-medium text-slate-600 transition duration-200 hover:text-blue-700"
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>© IKIGAI. All rights reserved.</span>
                    <span>
                        Designed by <span className="font-semibold text-slate-900">UY</span>
                    </span>
                </div>
            </div>
        </footer>
    );
}
