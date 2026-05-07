"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    BookOpenCheck,
    BriefcaseBusiness,
    ClipboardList,
    FileText,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
    Bell,
    MessageSquareText,
    PanelLeft,
    ShieldCheck,
    UserCheck,
    UsersRound,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { BRAND } from "../config/branding";
import { BrandLogo } from "./BrandLogo";

const navConfig = {
    admin: [
        { label: "Orders", href: "/admin/orders", icon: LayoutDashboard },
        { label: "Exceptions", href: "/admin/exceptions", icon: ClipboardList },
        { label: "Assignments", href: "/admin/assignments", icon: UserCheck },
        { label: "Payments", href: "/admin/payments", icon: ShieldCheck },
        { label: "Partner Payouts", href: "/admin/partner-payouts", icon: FileText },
        { label: "Partners", href: "/admin/partners", icon: UsersRound },
        { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
    client: [
        { label: "My Requests", href: "/dashboard", icon: LayoutDashboard },
        { label: "Tasks", href: "/dashboard/tasks", icon: ClipboardList },
        { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
        { label: "Start Service", href: "/dashboard/start-service", icon: BriefcaseBusiness },
        { label: "Help", href: "/dashboard/help", icon: MessageSquareText },
    ],
    partner: [
        { label: "My Tasks", href: "/partner/tasks", icon: LayoutDashboard },
        { label: "Tools", href: "/partner/tools", icon: FileText },
        { label: "Training", href: "/partner/training", icon: BookOpenCheck },
        { label: "Project History", href: "/partner/project-history", icon: ClipboardList },
    ],
};

const roleLabels = {
    admin: "Admin",
    client: "Client",
    partner: `${BRAND.name} Partner`,
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

            const { data: notificationData } = await supabase
                .from("notifications")
                .select("*")
                .or(`user_id.eq.${data.user.id},role.eq.${role}`)
                .order("created_at", { ascending: false })
                .limit(3);

            setNotifications(notificationData || []);
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
        <aside className="flex h-full flex-col">
            <div className="border-b border-slate-200/80 p-5">
                <Link href="/" className="group flex items-center gap-3">
                    <BrandLogo size="compact" />
                </Link>
                <p className="mt-2 pl-[3.25rem] text-xs font-medium text-slate-400">Product workspace</p>
            </div>

            <nav className="flex-1 space-y-2 p-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 ${
                                active
                                    ? "bg-slate-950 text-white shadow-lg shadow-slate-300/70"
                                    : "text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm"
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-slate-200/80 p-4">
                <Link
                    href="/"
                    className="mb-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-950"
                >
                    <Home className="h-5 w-5" />
                    Marketing site
                </Link>
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </aside>
    );

    return (
        <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
            <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-2xl lg:block">
                {sidebar}
            </div>

            {menuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setMenuOpen(false)}
                        className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
                    />
                    <div className="relative h-full w-80 max-w-[86vw] border-r border-slate-200 bg-white shadow-2xl">
                        {sidebar}
                    </div>
                </div>
            )}

            <div className="lg:pl-72">
                <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/75 backdrop-blur-2xl">
                    <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMenuOpen(true)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 lg:hidden"
                                aria-label="Open sidebar"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {eyebrow}
                                </p>
                                <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                                    {title}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:inline-flex">
                                {roleLabels[role] || roleLabels.client}
                            </span>
                            <div className="hidden text-right md:block">
                                <p className="text-xs font-medium text-slate-400">Signed in</p>
                                <p className="max-w-48 truncate text-sm font-semibold text-slate-700">
                                    {email || `${BRAND.name} user`}
                                </p>
                            </div>
                            <button
                                onClick={logout}
                                className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-100 hover:bg-red-50 hover:text-red-700 sm:inline-flex"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <section className="dashboard-panel mb-8 p-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="dashboard-eyebrow">
                                    <PanelLeft className="h-3.5 w-3.5" />
                                    {roleLabels[role] || roleLabels.client}
                                </div>
                                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                                    {title}
                                </h2>
                                {description && (
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
                                        {description}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <BarChart3 className="mb-2 h-4 w-4 text-blue-600" />
                                    <p className="font-semibold text-slate-900">Live</p>
                                    <p className="text-xs text-slate-500">Workspace</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <ShieldCheck className="mb-2 h-4 w-4 text-blue-600" />
                                    <p className="font-semibold text-slate-900">Managed</p>
                                    <p className="text-xs text-slate-500">Access</p>
                                </div>
                                <div className="hidden rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 sm:block">
                                    <FileText className="mb-2 h-4 w-4 text-blue-600" />
                                    <p className="font-semibold text-slate-900">Clear</p>
                                    <p className="text-xs text-slate-500">Updates</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {children}
                    {notifications.length > 0 ? (
                        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
                                <Bell className="h-4 w-4" />
                                Recent updates
                            </div>
                            <div className="grid gap-2">
                                {notifications.map((item) => (
                                    <div key={item.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                                        <span className="font-semibold text-slate-950">{item.title}</span>
                                        {item.message ? <span> - {item.message}</span> : null}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </main>
            </div>
        </div>
    );
}
