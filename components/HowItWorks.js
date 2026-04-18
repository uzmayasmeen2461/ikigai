export function HowItWorks() {
    const steps = [
        {
            title: "Client creates task",
            desc: "Share the service, details, and outcome you need.",
        },
        {
            title: "IKIGAI assigns partner",
            desc: "A trained IKIGAI partner is matched to the task and brief.",
        },
        {
            title: "Task completed",
            desc: "Progress is tracked until the work is finished.",
        },
    ];

    return (
        <section className="section-space mx-auto max-w-[1440px] px-6">
            <div className="premium-dark-panel relative overflow-hidden p-8 md:p-12">
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <div className="relative">
                        <p className="inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            How It Works
                        </p>
                        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-white md:text-5xl">
                            From request to completion in three steps
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-gray-300">
                            A simple operating system for assigning business tasks and keeping work moving.
                        </p>
                    </div>

                    <div className="relative grid gap-6 md:grid-cols-3">
                        {steps.map((step, index) => (
                            <div
                                key={step.title}
                                className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15"
                            >
                                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-300 text-sm font-semibold text-slate-950">
                                    {index + 1}
                                </div>

                                <h3 className="text-lg font-semibold text-white">
                                    {step.title}
                                </h3>

                                <p className="mt-3 text-sm leading-6 text-gray-300">
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
