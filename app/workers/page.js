import Link from "next/link";

export default function Workers() {
    const benefits = [
        {
            title: "Work from home",
            desc: "Complete online tasks without travel, office setup, or fixed location requirements.",
        },
        {
            title: "Flexible schedule",
            desc: "Choose availability that fits your routine and grow into more work as you gain confidence.",
        },
        {
            title: "Training provided",
            desc: "Learn the basics before starting tasks so you understand quality expectations clearly.",
        },
    ];

    const steps = [
        {
            title: "Apply online",
            desc: "Share your skills, phone number, and daily availability.",
        },
        {
            title: "Complete training",
            desc: "Go through simple task guidance and practice before real assignments.",
        },
        {
            title: "Start earning",
            desc: "Receive assigned tasks, add updates, and mark work complete from your dashboard.",
        },
    ];

    const workTypes = [
        "WhatsApp Business setup",
        "Instagram profile setup",
        "Zomato/Swiggy listing support",
        "Website content entry",
        "Ads support tasks",
        "Product listing",
        "Data entry",
        "Client updates",
    ];

    const expectations = [
        "Basic typing and internet skills",
        "A phone or laptop with stable internet",
        "Ability to follow task instructions",
        "Clear communication and timely updates",
    ];

    return (
        <main className="gradient-page">
            <section className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                    <p className="eyebrow">For IKIGAI Partners</p>
                    <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 md:text-6xl">
                        Earn from home by completing practical business tasks.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                        Join IKIGAI as a remote partner, get trained, and work on simple digital tasks for clients across WhatsApp, Instagram, listings, websites, and ads.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link href="/workers/apply" className="btn-primary px-7 py-4">
                            Apply Now
                        </Link>
                        <a href="#training" className="btn-secondary px-7 py-4">
                            See How It Works
                        </a>
                    </div>
                </div>

                <div className="ui-card p-8">
                    <p className="eyebrow">Why Join</p>
                    <div className="mt-6 grid gap-4">
                        {benefits.map((item) => (
                            <div
                                key={item.title}
                                    className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl"
                            >
                                <h2 className="font-semibold text-slate-950">
                                    {item.title}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="training" className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="eyebrow">Partner Journey</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                        A simple path from application to first task
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        IKIGAI keeps the process clear so you know what to do before, during, and after every task.
                    </p>
                </div>

                <div className="mt-12 grid gap-6 md:grid-cols-3">
                    {steps.map((item, index) => (
                        <div key={item.title} className="ui-card ui-card-hover p-8">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-200/40">
                                {index + 1}
                            </div>
                            <h3 className="text-xl font-semibold text-slate-950">
                                {item.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
                    <div className="ui-card p-8">
                        <p className="eyebrow">Types of Work</p>
                        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                            Tasks you may receive
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-slate-600">
                            Work is assigned based on client requirements, your availability, and your training progress.
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            {workTypes.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="premium-dark-panel relative overflow-hidden p-8 text-white">
                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                        <p className="relative inline-flex rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            What You Need
                        </p>
                        <h2 className="relative mt-5 text-4xl font-semibold tracking-[-0.03em]">
                            No advanced experience required.
                        </h2>
                        <p className="relative mt-4 text-lg leading-8 text-slate-300">
                            We focus on reliable IKIGAI partners who can learn, communicate clearly, and complete tasks carefully.
                        </p>

                        <div className="relative mt-8 space-y-4">
                            {expectations.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1440px] px-6 py-16">
                <div className="premium-panel p-8 text-center md:p-12">
                    <p className="eyebrow">Start With Confidence</p>
                    <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                        Apply today and get guided before your first task.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                        Submit your IKIGAI partner application and our team will review your details before connecting you with suitable work.
                    </p>

                    <Link href="/workers/apply" className="btn-primary mt-8 px-8 py-4">
                        Apply Now
                    </Link>
                    <p className="mt-4 text-sm text-slate-500">
                        No advanced experience required. Training will be provided.
                    </p>
                </div>
            </section>
        </main>
    );
}
