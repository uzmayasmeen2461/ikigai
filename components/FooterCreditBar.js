import { BRAND } from "../config/branding";
import { DesignCredit } from "./DesignCredit";

export function FooterCreditBar({ className = "" }) {
    return (
        <div
            className={[
                "flex flex-col items-center justify-center gap-3 text-xs font-semibold text-white sm:flex-row sm:justify-between",
                className,
            ].join(" ")}
        >
            <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 shadow-sm shadow-slate-950/10 backdrop-blur">
                © {BRAND.name}. All rights reserved.
            </span>
            <DesignCredit compact />
        </div>
    );
}
