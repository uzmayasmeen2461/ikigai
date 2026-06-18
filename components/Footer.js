import { BRAND } from "../config/branding";
import { BrandLogo } from "./BrandLogo";
import { FooterCreditBar } from "./FooterCreditBar";

const footerGroups = [
    {
        title: "Company",
        links: [
            { label: "Home", href: "/" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Contact Us", href: "/contact" },
        ],
    },
    {
        title: "Platform",
        links: [
            { label: "Products", href: "/dashboard/products" },
            { label: "Upload Inventory", href: "/dashboard/upload-inventory" },
            { label: "Connections", href: "/dashboard/connections" },
            { label: "Settings", href: "/dashboard/settings" },
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
            { label: BRAND.supportEmail, href: `mailto:${BRAND.supportEmail}` },
            { label: "Hyderabad, Telangana, India", href: "/contact" },
            { label: "Open Connections", href: "/dashboard/connections" },
        ],
    },
];

export function Footer() {
    return (
        <footer id="contact" className="bg-[var(--ink2)]">
            <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_1.5fr] lg:items-start">
                    <div>
                        <BrandLogo showTagline />
                        <p className="mt-5 max-w-md text-sm font-light leading-6 text-white/35">
                            Upload a product list, or send photos with prices. ORVA prepares your inventory,
                            storefront preview, social content, and channel update workflow.
                        </p>
                        <div className="mt-5 grid gap-2 text-sm text-white/35">
                            <span>Business support: {BRAND.supportEmail}</span>
                            <span>Address: Hyderabad, Telangana, India</span>
                            <span>Manual today. API-ready as channel access becomes available.</span>
                        </div>
                        <a
                            href="/auth"
                            className="btn btn-primary mt-6"
                        >
                            Start Demo
                        </a>
                    </div>

                    <nav className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {footerGroups.map((group) => (
                            <div key={group.title}>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/25">
                                    {group.title}
                                </p>
                                <div className="mt-4 grid gap-3">
                                    {group.links.map((link) => (
                                        <a
                                            key={`${group.title}-${link.label}`}
                                            href={link.href}
                                            className="text-sm font-medium text-white/45 transition duration-150 hover:text-white"
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                <FooterCreditBar className="mt-10 border-t border-white/10 pt-6" />
            </div>
        </footer>
    );
}
