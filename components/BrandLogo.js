import Image from "next/image";
import { BRAND } from "../config/branding";

export function BrandLogo({ size = "default", showTagline = false, className = "" }) {
    const compact = size === "compact";
    const markSize = compact ? 34 : 42;

    return (
        <div className={`inline-flex items-center gap-3 ${className}`}>
            <Image
                src="/orva-logo-mark.svg"
                alt=""
                width={markSize}
                height={markSize}
                className={[
                    "shrink-0 rounded-lg object-cover shadow-sm shadow-cyan-400/10 ring-1 ring-white/10 transition duration-150 group-hover:-translate-y-px",
                    compact ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]",
                ].join(" ")}
                aria-hidden="true"
                priority={compact}
            />
            <span className="leading-none">
                <span
                    className={[
                        "block font-display font-semibold text-white",
                        compact ? "text-lg tracking-[0.02em]" : "text-xl tracking-[0.01em]",
                    ].join(" ")}
                >
                    {BRAND.name}
                </span>
                {showTagline ? (
                    <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-white/30">
                        {BRAND.tagline}
                    </span>
                ) : null}
            </span>
        </div>
    );
}
