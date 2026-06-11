"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import Navbar from "./Navbar";
import { OrvaInteractionEffects } from "./OrvaInteractionEffects";
import { WhatsAppButton } from "./WhatsAppButton";

const appRoutes = ["/admin", "/dashboard", "/worker", "/partner", "/training", "/payment", "/preview"];

export function SiteChrome({ children }) {
    const pathname = usePathname();
    const isAppRoute = appRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isAppRoute) {
        return (
            <div className="min-h-screen">
                <OrvaInteractionEffects />
                {children}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <OrvaInteractionEffects />
            <Navbar />
            <div className="flex-grow">{children}</div>
            <WhatsAppButton />
            <Footer />
        </div>
    );
}
