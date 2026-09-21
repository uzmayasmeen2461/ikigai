"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share, X } from "lucide-react";

function isStandaloneDisplay() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIosDevice() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

function isMobileDevice() {
    return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

export function PwaInstallPrompt() {
    const [installEvent, setInstallEvent] = useState(null);
    const [visible, setVisible] = useState(() => false);
    const [dismissed, setDismissed] = useState(false);
    const [ios] = useState(() => {
        if (typeof window === "undefined") return false;
        return isIosDevice();
    });

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        if (isStandaloneDisplay()) return undefined;
        if (window.localStorage.getItem("orva-pwa-install-dismissed") === "true") return undefined;

        const mobile = isMobileDevice();

        function handleBeforeInstallPrompt(event) {
            event.preventDefault();
            setInstallEvent(event);
            setVisible(true);
        }

        function handleInstalled() {
            setVisible(false);
            window.localStorage.setItem("orva-pwa-install-dismissed", "true");
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        const fallbackTimer = window.setTimeout(() => {
            if (mobile && (ios || !installEvent)) setVisible(true);
        }, 2000);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
            window.clearTimeout(fallbackTimer);
        };
    }, [installEvent, ios]);

    const canInstall = Boolean(installEvent);
    const helperText = useMemo(() => {
        if (ios) return "Tap Share, then Add to Home Screen.";
        if (canInstall) return "Install ORVA on your phone for faster access.";
        return "Open the browser menu and choose Install app or Add to Home screen.";
    }, [canInstall, ios]);

    if (!visible || dismissed) return null;

    async function installApp() {
        if (!installEvent) return;
        installEvent.prompt();
        await installEvent.userChoice.catch(() => null);
        setInstallEvent(null);
        setVisible(false);
    }

    function dismiss() {
        setDismissed(true);
        window.localStorage.setItem("orva-pwa-install-dismissed", "true");
    }

    return (
        <div className="fixed inset-x-3 bottom-4 z-[80] mx-auto max-w-md rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl shadow-slate-950/20 sm:bottom-6">
            <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                    {ios ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-black text-[var(--ink)]">Install ORVA app</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--mid)]">{helperText}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {canInstall ? (
                            <button type="button" className="btn-primary" onClick={installApp}>
                                <Download className="h-4 w-4" />
                                Install
                            </button>
                        ) : null}
                        {ios ? (
                            <span className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--ink3)]">
                                Safari Share {"->"} Add to Home Screen
                            </span>
                        ) : null}
                    </div>
                </div>
                <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)]" onClick={dismiss} aria-label="Dismiss install prompt">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
