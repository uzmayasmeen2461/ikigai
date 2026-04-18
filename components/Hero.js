import { CheckCircle2 } from "lucide-react";

export function Hero() {
    const trustItems = [
        "No hiring needed",
        "Verified IKIGAI partners",
        "Fast turnaround",
    ];

    const logos = ["Nova", "Northlane", "PeakCo", "StudioGrid", "Mintbase"];

    const stats = [
        { value: "100+", label: "Tasks Completed" },
        { value: "50+", label: "Partners" },
        { value: "24h", label: "Avg Turnaround" },
    ];

    return (
        <section className="relative overflow-hidden px-6 pb-24 pt-14 md:pb-32 md:pt-20">

            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-white" />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_70%)]" />
            <div className="absolute left-1/2 top-10 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="absolute left-1/2 top-16 -z-10 h-72 w-72 -translate-x-[10%] rounded-full bg-indigo-200/40 blur-3xl" />

            <div className="premium-panel mx-auto max-w-[1100px] px-8 py-12 text-center">

                <div
                    className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-5 py-2 text-sm font-medium text-blue-800 shadow-sm"
                >
                    Built for modern businesses
                </div>

                <h1
                    className="animate-fade-up mx-auto max-w-4xl text-5xl font-semibold leading-tight tracking-[-0.04em] text-gray-950 md:text-7xl"
                >
                    Connecting Purpose <br className="hidden md:block" />
                    <span className="text-slate-950">with </span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Productivity
                    </span>
                </h1>

                <p
                    className="animate-fade-up-delay mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 md:text-xl"
                >
                    Stop worrying about operations. Focus on growth.
                    IKIGAI handles your digital execution with trained partners — fast, reliable, and hassle-free.
                </p>

                <div
                    className="animate-fade-up-delay mt-10 flex flex-col justify-center gap-4 sm:flex-row"
                >
                    <a
                        href="/business"
                        className="btn-primary px-8 py-4 text-lg"
                    >
                        Start Your First Task →
                    </a>

                    <a
                        href="/workers"
                        className="btn-secondary px-8 py-4 text-lg"
                    >
                        Earn with IKIGAI
                    </a>
                </div>

                {/* Trust Pills */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    {trustItems.map((item) => (
                        <span
                            key={item}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm"
                        >
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            {item}
                        </span>
                    ))}
                </div>

                {/* Logos */}
                <div className="mt-12">
                    <p className="text-sm font-medium tracking-[0.16em] text-gray-500 uppercase">
                        Trusted by growing businesses
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        {logos.map((logo) => (
                            <span
                                key={logo}
                                className="inline-flex min-w-28 items-center justify-center rounded-full border border-gray-200 bg-white/80 px-5 py-3 text-sm font-semibold text-gray-500 shadow-sm"
                            >
                                {logo}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-10">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-3xl font-semibold text-gray-950">
                                {stat.value}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
