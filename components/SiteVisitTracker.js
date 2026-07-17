"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const trackedRoutes = ["/", "/pricing", "/services", "/partners", "/contact", "/business"];
const appRoutes = ["/admin", "/dashboard", "/worker", "/partner", "/training", "/payment", "/preview", "/auth", "/login", "/signup"];

function shouldTrack(pathname = "") {
    if (!pathname) return false;
    if (appRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return false;
    if (trackedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return true;
    return pathname === "/" || pathname.startsWith("/catalog/");
}

function sessionId() {
    const key = "orva_site_session_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, next);
    return next;
}

export function SiteVisitTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!shouldTrack(pathname)) return;
        const controller = new AbortController();
        const search = window.location.search ? window.location.search.slice(1) : "";
        const path = `${pathname}${search ? `?${search}` : ""}`;
        window.setTimeout(() => {
            fetch("/api/analytics/visit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                keepalive: true,
                body: JSON.stringify({
                    sessionId: sessionId(),
                    path,
                    title: document.title,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    screen: {
                        width: window.screen?.width,
                        height: window.screen?.height,
                    },
                }),
            }).catch(() => null);
        }, 600);
        return () => controller.abort();
    }, [pathname]);

    return null;
}
