"use client";

import { useEffect } from "react";

export function PwaRegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV !== "production") return;

        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => registration.update().catch(() => {}))
                .catch(() => {});
        });
    }, []);

    return null;
}
