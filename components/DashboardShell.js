"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    ClipboardList,
    FileText,
    Film,
    Lightbulb,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
    Bell,
    MessageSquareText,
    Package,
    PanelLeft,
    RefreshCw,
    Settings,
    ShieldCheck,
    UserCheck,
    UsersRound,
    Upload,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { BRAND } from "../config/branding";
import { BrandLogo } from "./BrandLogo";
import { FooterCreditBar } from "./FooterCreditBar";

const navConfig = {
    admin: [
        { label: "Operations", href: "/admin/orders", icon: LayoutDashboard },
        { label: "Applications", href: "/admin/applications", icon: ClipboardList },
        { label: "Specialists", href: "/admin/partners", icon: UsersRound },
        { label: "Intelligence", href: "/admin/inventory-intelligence", icon: Lightbulb },
        { label: "Social Exports", href: "/admin/social-exports", icon: MessageSquareText },
        { label: "Reel Usage", href: "/admin/reel-usage", icon: Film },
        { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
    adminLegacy: [
        { label: "Orders", href: "/admin/orders", icon: LayoutDashboard },
        { label: "Applications", href: "/admin/applications", icon: ClipboardList },
        { label: "Exceptions", href: "/admin/exceptions", icon: ClipboardList },
        { label: "Assignments", href: "/admin/assignments", icon: UserCheck },
        { label: "Payments", href: "/admin/payments", icon: ShieldCheck },
        { label: "Partner Payouts", href: "/admin/partner-payouts", icon: FileText },
        { label: "Partners", href: "/admin/partners", icon: UsersRound },
        { label: "Inventory", href: "/admin/inventory", icon: ClipboardList },
        { label: "Update Tasks", href: "/admin/update-tasks", icon: RefreshCw },
        { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
    client: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Onboarding", href: "/dashboard/onboarding", icon: ShieldCheck },
        { label: "Products", href: "/dashboard/products", icon: Package },
        { label: "Add Inventory", href: "/dashboard/upload-inventory", icon: Upload },
        { label: "Intelligence", href: "/dashboard/inventory-intelligence", icon: Lightbulb },
        { label: "Reel Studio", href: "/dashboard/reel-studio", icon: Film },
        { label: "Connections", href: "/dashboard/connections", icon: ClipboardList },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
    partner: [
        { label: "My Tasks", href: "/partner/tasks", icon: LayoutDashboard },
    ],
};

const roleLabels = {
    admin: "Admin",
    client: "Client",
    partner: "Worker",
};

export function DashboardShell({
    role = "client",
    eyebrow = "Workspace",
    title,
    description,
    children,
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [notifications, setNotifications] = useState([]);
    const [activeHref, setActiveHref] = useState(pathname);

    const navItems = useMemo(() => navConfig[role] || navConfig.client, [role]);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            setEmail(data.user?.email || "");
            if (!data.user) return;

            const { data: notificationData, error } = await supabase
                .from("notifications")
                .select("*")
                .or(`user_id.eq.${data.user.id},role.eq.${role}`)
                .order("created_at", { ascending: false })
                .limit(3);

            if (error) {
                console.warn("Could not load notifications.", error.message);
                return;
            }

            setNotifications(notificationData || []);
        }).catch((error) => {
            console.warn("Could not load dashboard session.", error?.message || error);
        });
    }, [role]);

    useEffect(() => {
        const syncActiveHref = () => {
            setActiveHref(`${window.location.pathname}${window.location.hash}`);
        };

        syncActiveHref();
        window.addEventListener("hashchange", syncActiveHref);

        return () => window.removeEventListener("hashchange", syncActiveHref);
    }, [pathname]);

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/auth");
    };

    const isActive = (href) => {
        const base = href.split("#")[0];
        if (href.includes("#")) return activeHref === href;
        return (pathname === base || pathname.startsWith(`${base}/`)) && !activeHref.includes("#");
    };

    const sidebar = (
        <aside className="flex h-full flex-col bg-[radial-gradient(circle_at_20%_0%,rgba(74,114,232,0.22),transparent_34%),linear-gradient(180deg,var(--ink2),var(--ink))]">
            <div className="border-b border-white/10 p-5">
                <Link href="/" className="group flex items-center gap-3">
                    <BrandLogo size="compact" />
                </Link>
                <p className="mt-2 pl-[2.75rem] text-xs font-medium text-white/30">Product workspace</p>
            </div>

            <nav className="flex-1 space-y-1 p-3">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150 ${
                                active
                                    ? "bg-[rgba(27,79,216,0.25)] text-[#7BA7F0]"
                                    : "text-white/40 hover:bg-white/[0.06] hover:text-white"
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 p-3">
                <Link
                    href="/"
                    className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                >
                    <Home className="h-5 w-5" />
                    Marketing site
                </Link>
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </aside>
    );

    return (
        <div className="min-h-screen bg-[var(--page)] text-[var(--ink)]">
            <div className="fixed inset-y-0 left-0 z-40 hidden w-56 bg-[var(--ink2)] lg:block">
                {sidebar}
            </div>

            {menuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setMenuOpen(false)}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                    />
                    <div className="relative h-full w-72 max-w-[86vw] bg-[var(--ink2)] shadow-2xl">
                        {sidebar}
                    </div>
                </div>
            )}

            <div className="lg:pl-56">
                <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/88 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMenuOpen(true)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] lg:hidden"
                                aria-label="Open sidebar"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                    {eyebrow}
                                </p>
                                <h1 className="mt-1 text-xl font-bold tracking-[-0.01em] text-[var(--ink)] sm:text-2xl">
                                    {title}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="badge badge-blue hidden sm:inline-flex">
                                {roleLabels[role] || roleLabels.client}
                            </span>
                            <div className="hidden text-right md:block">
                                <p className="text-xs font-medium text-[var(--muted)]">Signed in</p>
                                <p className="max-w-48 truncate text-sm font-semibold text-[var(--ink3)]">
                                    {email || `${BRAND.name} user`}
                                </p>
                            </div>
                            <button
                                onClick={logout}
                                className="btn btn-secondary hidden sm:inline-flex"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <section className="dashboard-panel hero-noise relative mb-8 overflow-hidden p-6">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[#7BA7F0] to-[var(--success)]" />
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="dashboard-eyebrow">
                                    <PanelLeft className="h-3.5 w-3.5" />
                                    {roleLabels[role] || roleLabels.client}
                                </div>
                                <h2 className="mt-4 text-3xl font-bold tracking-[-0.01em] text-[var(--ink)] md:text-4xl">
                                    {title}
                                </h2>
                                {description && (
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--mid)] md:text-base">
                                        {description}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                                <div className="interactive-tile rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                                    <BarChart3 className="mb-2 h-4 w-4 text-[var(--accent)]" />
                                    <p className="font-semibold text-[var(--ink)]">Live</p>
                                    <p className="text-xs text-[var(--mid)]">Workspace</p>
                                </div>
                                <div className="interactive-tile rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                                    <ShieldCheck className="mb-2 h-4 w-4 text-[var(--accent)]" />
                                    <p className="font-semibold text-[var(--ink)]">Managed</p>
                                    <p className="text-xs text-[var(--mid)]">Access</p>
                                </div>
                                <div className="interactive-tile hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:block">
                                    <FileText className="mb-2 h-4 w-4 text-[var(--accent)]" />
                                    <p className="font-semibold text-[var(--ink)]">Clear</p>
                                    <p className="text-xs text-[var(--mid)]">Updates</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {children}
                    {notifications.length > 0 ? (
                        <section className="mt-8 rounded-xl border border-[rgba(27,79,216,0.15)] bg-[var(--accent-light)] p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                                <Bell className="h-4 w-4" />
                                Recent updates
                            </div>
                            <div className="grid gap-2">
                                {notifications.map((item) => (
                                    <div key={item.id} className="rounded-lg bg-white px-4 py-3 text-sm text-[var(--mid)]">
                                        <span className="font-semibold text-[var(--ink)]">{item.title}</span>
                                        {item.message ? <span> - {item.message}</span> : null}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <footer className="mt-10 rounded-2xl bg-[var(--ink)] px-4 py-4">
                        <FooterCreditBar />
                    </footer>
                </main>
            </div>
        </div>
    );
}
