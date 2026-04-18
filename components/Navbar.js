"use client";

import { supabase } from "../app/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { dashboardForRole, getUserRole } from "../app/lib/authRouting";

const navItems = [
    { label: "Home", href: "/", match: "/" },
    { label: "Services", href: "/services", match: "/services", primary: true },
    { label: "For Business", href: "/business", match: "/business", primary: true },
    { label: "Partner With Us", href: "/partners", match: "/partners", subtle: true },
    { label: "Pricing", href: "/#pricing", match: "/#pricing" },
    { label: "Contact", href: "/contact", match: "/contact" },
];

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const loadUserRole = async (currentUser) => {
        if (!currentUser) {
            setRole(null);
            return;
        }

        const nextRole = await getUserRole(currentUser.id);
        setRole(nextRole);
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            loadUserRole(data.user);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_, session) => {
                const currentUser = session?.user || null;
                setUser(currentUser);
                loadUserRole(currentUser);
            }
        );

        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 8);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll);

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        setMenuOpen(false);
        router.push("/auth");
    };

    const dashboardPath = dashboardForRole(role);

    const isActive = (item) => {
        if (item.match === "/") return pathname === "/";
        return pathname === item.match || (item.match === "/partners" && pathname === "/workers");
    };

    const navLinkClass = (item) => {
        const active = isActive(item);
        return [
            "rounded-full px-4 py-2 text-sm font-medium transition duration-200",
            active
                ? "bg-slate-950 text-white shadow-sm"
                : item.primary
                    ? "text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            item.subtle && !active ? "lg:text-slate-500" : "",
        ].join(" ");
    };

    const closeMenu = () => setMenuOpen(false);

    const renderAuthActions = (mobile = false) => (
        <div className={mobile ? "grid gap-3" : "hidden items-center gap-3 lg:flex"}>
            {user ? (
                <>
                    <span className="hidden max-w-48 truncate text-sm text-slate-500 xl:block">
                        {user.email}
                    </span>
                    <Link
                        href={dashboardPath}
                        onClick={closeMenu}
                        className="btn-primary justify-center px-5 py-2.5 text-sm"
                    >
                        Dashboard
                    </Link>
                    <button
                        onClick={logout}
                        className="rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                        Logout
                    </button>
                </>
            ) : (
                <>
                    <Link
                        href="/auth"
                        onClick={closeMenu}
                        className="rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                        Login
                    </Link>
                    <Link
                        href="/services"
                        onClick={closeMenu}
                        className="btn-primary justify-center px-5 py-2.5 text-sm"
                    >
                        Get Started
                    </Link>
                </>
            )}
        </div>
    );

    return (
        <header
            className={`sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-2xl transition duration-300 ${
                scrolled ? "shadow-lg shadow-slate-200/60" : "shadow-sm shadow-slate-100/50"
            }`}
        >
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
                <div className="flex items-center justify-between gap-4 py-3">
                    <Link
                        href="/"
                        onClick={closeMenu}
                        className="group inline-flex items-center gap-3 rounded-full pr-3 transition"
                        aria-label="IKIGAI home"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-300/60 transition duration-200 group-hover:scale-105 group-hover:shadow-blue-200">
                            IK
                        </span>
                        <span className="bg-gradient-to-r from-slate-950 via-slate-800 to-blue-700 bg-clip-text text-lg font-semibold tracking-[-0.03em] text-transparent">
                            IKIGAI
                        </span>
                    </Link>

                    <nav className="hidden items-center rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-sm shadow-slate-100/80 lg:flex">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href} className={navLinkClass(item)}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        {renderAuthActions()}
                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-700 shadow-sm transition duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
                            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {menuOpen && (
                    <div className="pb-4 lg:hidden">
                        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-xl shadow-slate-200/70">
                            <nav className="grid gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={closeMenu}
                                        className={[
                                            "rounded-2xl px-4 py-3 text-sm font-medium transition duration-200",
                                            isActive(item)
                                                ? "bg-slate-950 text-white"
                                                : item.primary
                                                    ? "text-slate-900 hover:bg-blue-50 hover:text-blue-700"
                                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                                        ].join(" ")}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>

                            <div className="mt-3 border-t border-slate-100 pt-3">
                                {renderAuthActions(true)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
