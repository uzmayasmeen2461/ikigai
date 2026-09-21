"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, MoreVertical, Share2, Smartphone } from "lucide-react";

function isStandaloneDisplay() {
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIosDevice() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

function isAndroidDevice() {
    return /android/i.test(window.navigator.userAgent || "");
}

export function PwaInstallButton({ className = "" }) {
    const [installEvent, setInstallEvent] = useState(null);
    const [installed, setInstalled] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [platform, setPlatform] = useState("desktop");

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        setInstalled(isStandaloneDisplay());
        setPlatform(isIosDevice() ? "ios" : isAndroidDevice() ? "android" : "desktop");

        async function checkRelatedApps() {
            if (!navigator.getInstalledRelatedApps) return;
            const apps = await navigator.getInstalledRelatedApps().catch(() => []);
            if (apps?.length) setInstalled(true);
        }

        function handleBeforeInstallPrompt(event) {
            event.preventDefault();
            setInstallEvent(event);
            setShowHelp(false);
        }

        function handleInstalled() {
            setInstalled(true);
            setInstallEvent(null);
            setShowHelp(false);
            window.localStorage.setItem("orva-pwa-install-dismissed", "true");
        }

        checkRelatedApps();
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const help = useMemo(() => {
        if (platform === "ios") {
            return {
                icon: Share2,
                text: "On iPhone, tap Share in Safari, then choose Add to Home Screen.",
            };
        }
        if (platform === "android") {
            return {
                icon: MoreVertical,
                text: "If the install popup does not open, tap the browser menu and choose Install app or Add to Home screen.",
            };
        }
        return {
            icon: MoreVertical,
            text: "Open this site in Chrome or Edge, then use the browser menu to install ORVA as an app.",
        };
    }, [platform]);

    async function installApp() {
        if (installed) return;
        if (!installEvent) {
            setShowHelp(true);
            return;
        }

        installEvent.prompt();
        const choice = await installEvent.userChoice.catch(() => null);
        setInstallEvent(null);
        setShowHelp(choice?.outcome !== "accepted");
    }

    const HelpIcon = help.icon;

    return (
        <div className={`grid gap-2 ${className}`}>
            <button
                type="button"
                className={installed ? "btn border border-white/15 bg-white/10 text-white/55" : "btn border border-white/15 bg-transparent text-white/75 hover:border-white/35 hover:text-white"}
                onClick={installApp}
                disabled={installed}
                aria-disabled={installed}
            >
                {installed ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {installed ? "App installed" : "Download app"}
            </button>

            {showHelp && !installed ? (
                <div className="max-w-sm rounded-xl border border-white/10 bg-white/[0.08] p-3 text-left text-xs font-semibold leading-5 text-white/70 shadow-xl shadow-black/10 backdrop-blur">
                    <div className="flex gap-2">
                        <HelpIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#7AF5FF]" />
                        <span>{help.text}</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
