"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "../app/lib/supabase";

const skippedRoutes = ["/admin"];

function shouldTrack(pathname = "") {
    if (!pathname) return false;
    if (skippedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return false;
    return true;
}

function appContext() {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    return standalone ? "installed_app" : "browser";
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
        window.setTimeout(async () => {
            const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
            const session = data?.session;
            fetch("/api/analytics/visit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                signal: controller.signal,
                keepalive: true,
                body: JSON.stringify({
                    eventType: "page_view",
                    sessionId: sessionId(),
                    path,
                    title: document.title,
                    referrer: document.referrer,
                    appContext: appContext(),
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

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        async function trackInstall() {
            const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
            const session = data?.session;
            fetch("/api/analytics/visit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                keepalive: true,
                body: JSON.stringify({
                    eventType: "app_install",
                    sessionId: sessionId(),
                    path: `${window.location.pathname}${window.location.search || ""}`,
                    title: document.title,
                    referrer: document.referrer,
                    appContext: "install_prompt",
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    screen: {
                        width: window.screen?.width,
                        height: window.screen?.height,
                    },
                }),
            }).catch(() => null);
        }

        window.addEventListener("appinstalled", trackInstall);
        return () => window.removeEventListener("appinstalled", trackInstall);
    }, []);

    return null;
}
