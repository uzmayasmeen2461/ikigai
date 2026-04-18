export function TrustSection() {
    const stats = [
        {
            value: "100+",
            label: "tasks completed",
        },
        {
            value: "50+",
            label: "IKIGAI partners",
        },
    ];

    return (
        <section className="mx-auto max-w-[1440px] px-6 py-16">
            <div className="premium-dark-panel relative overflow-hidden p-8 text-white md:p-12">
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
                    <div className="relative">
                        <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            Trusted Execution
                        </p>
                        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                            Built for businesses that need work done quickly
                        </h2>
                    </div>

                    <div className="relative grid gap-4 sm:grid-cols-2">
                        {stats.map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-2xl border border-white/10 bg-white/10 p-6 transition hover:-translate-y-0.5 hover:bg-white/15"
                            >
                                <p className="text-4xl font-semibold">{stat.value}</p>
                                <p className="mt-2 text-sm text-gray-300">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
