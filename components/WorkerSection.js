import Image from "next/image";

export function WorkerSection() {
    const benefits = [
        {
            title: "Flexible online work",
            image: "/worker-flexible.svg",
            alt: "Illustration for flexible online work",
        },
        {
            title: "Training before tasks",
            image: "/worker-training.svg",
            alt: "Illustration for training before tasks",
        },
        {
            title: "Earn from home",
            image: "/worker-home.svg",
            alt: "Illustration for earning from home",
        },
        {
            title: "Clear task updates",
            image: "/worker-updates.svg",
            alt: "Illustration for clear task updates",
        },
    ];

    return (
        <section className="section-space mx-auto max-w-[1440px] px-6">
            <div className="premium-panel grid gap-8 p-8 md:p-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                <div>
                    <p className="eyebrow">
                        For IKIGAI Partners
                    </p>
                    <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-gray-950 md:text-5xl">
                        Earn from home
                    </h2>
                    <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-600">
                        Join IKIGAI to complete practical business tasks from home with guidance, training, and a simple dashboard for updates.
                    </p>

                    <a
                        href="/workers"
                        className="btn-primary mt-8 px-7 py-4"
                    >
                        Join as IKIGAI Partner
                    </a>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {benefits.map((benefit) => (
                        <div
                            key={benefit.title}
                            className="ui-card ui-card-hover group overflow-hidden bg-slate-50 p-0"
                        >
                            <div className="h-28 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
                                <Image
                                    src={benefit.image}
                                    alt={benefit.alt}
                                    width={640}
                                    height={420}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                            </div>
                            <p className="p-5 font-semibold text-gray-950">{benefit.title}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
