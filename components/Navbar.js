"use client";

import { supabase } from "../app/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { dashboardForRole, getUserRole } from "../app/lib/authRouting";
import { BRAND } from "../config/branding";
import { BrandLogo } from "./BrandLogo";

const navItems = [
    { label: "Home", href: "/", match: "/" },
    { label: "Pricing", href: "/pricing", match: "/pricing" },
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
            "rounded-lg px-3.5 py-2 text-sm font-medium transition duration-150",
            active
                ? "bg-white/10 text-white"
                : item.primary
                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                    : "text-white/50 hover:bg-white/10 hover:text-white",
            item.subtle && !active ? "lg:text-white/45" : "",
        ].join(" ");
    };

    const closeMenu = () => setMenuOpen(false);

    const renderAuthActions = (mobile = false) => (
        <div className={mobile ? "grid gap-3" : "hidden items-center gap-3 lg:flex"}>
            {user ? (
                <>
                    <span className="hidden max-w-48 truncate text-sm text-white/45 xl:block">
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
                        className="rounded-lg border border-white/15 bg-transparent px-5 py-2.5 text-sm font-medium text-white/70 transition duration-150 hover:border-white/35 hover:text-white"
                    >
                        Logout
                    </button>
                </>
            ) : (
                <>
                    <Link
                        href="/auth"
                        onClick={closeMenu}
                        className="rounded-lg border border-white/15 bg-transparent px-5 py-2.5 text-sm font-medium text-white/75 transition duration-150 hover:border-white/35 hover:text-white"
                    >
                        Login
                    </Link>
                    <Link
                        href="/auth"
                        onClick={closeMenu}
                        className="btn-primary justify-center px-5 py-2.5 text-sm"
                    >
                        Get started
                    </Link>
                </>
            )}
        </div>
    );

    return (
        <header
            className={`sticky top-0 z-50 bg-[var(--ink)] transition duration-300 ${
                scrolled ? "shadow-lg shadow-slate-950/15" : ""
            }`}
        >
            <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
                <div className="flex h-14 items-center justify-between gap-4">
                    <Link
                        href="/"
                        onClick={closeMenu}
                        className="group inline-flex items-center gap-3 pr-3 transition"
                        aria-label={`${BRAND.name} home`}
                    >
                        <BrandLogo size="compact" />
                    </Link>

                    <nav className="hidden items-center gap-1 lg:flex">
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
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-transparent text-white/80 transition duration-150 hover:border-white/35 hover:text-white lg:hidden"
                            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {menuOpen && (
                    <div className="pb-4 lg:hidden">
                        <div className="rounded-xl border border-white/10 bg-[var(--ink2)] p-3 shadow-xl shadow-slate-950/20">
                            <nav className="grid gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={closeMenu}
                                        className={[
                                            "rounded-lg px-4 py-3 text-sm font-medium transition duration-150",
                                            isActive(item)
                                                ? "bg-white/10 text-white"
                                                : item.primary
                                                    ? "text-white/80 hover:bg-white/10 hover:text-white"
                                                    : "text-white/50 hover:bg-white/10 hover:text-white",
                                        ].join(" ")}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>

                            <div className="mt-3 border-t border-white/10 pt-3">
                                {renderAuthActions(true)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
