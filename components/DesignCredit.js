export function DesignCredit({ compact = false, className = "" }) {
    return (
        <div
            className={[
                "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-950/10 backdrop-blur",
                compact ? "gap-1.5" : "gap-2",
                className,
            ].join(" ")}
        >
            <span>Designed by</span>
            <span className="font-bold">UY</span>
        </div>
    );
}
