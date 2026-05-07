import { BRAND } from "../config/branding";

export function BrandLogo({ size = "default", showTagline = false, className = "" }) {
    const compact = size === "compact";

    return (
        <div className={`inline-flex items-center gap-3 ${className}`}>
            <span
                className={[
                    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/50 bg-slate-950 font-semibold text-white shadow-lg shadow-slate-300/60 transition duration-200 group-hover:scale-105 group-hover:shadow-amber-200/70",
                    compact ? "h-10 w-10 text-[11px]" : "h-11 w-11 text-xs",
                ].join(" ")}
                aria-hidden="true"
            >
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.46),transparent_38%),linear-gradient(135deg,#020617_0%,#111827_48%,#78350f_100%)]" />
                <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/60" />
                <span className="absolute bottom-0 left-1/2 h-px w-8 -translate-x-1/2 bg-amber-200/80" />
                <span className="relative tracking-[0.12em]">ID</span>
            </span>
            <span className="leading-none">
                <span
                    className={[
                        "block bg-gradient-to-r from-slate-950 via-blue-800 to-amber-600 bg-clip-text font-semibold text-transparent",
                        compact ? "text-lg tracking-[-0.03em]" : "text-2xl tracking-[-0.04em]",
                    ].join(" ")}
                >
                    {BRAND.name}
                </span>
                {showTagline ? (
                    <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {BRAND.tagline}
                    </span>
                ) : null}
            </span>
        </div>
    );
}
