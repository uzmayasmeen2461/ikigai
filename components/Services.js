import Image from "next/image";

export function Services() {
    const items = [
        {
            title: "WhatsApp Business Setup",
            desc: "Profiles, catalogs, quick replies, and customer-ready setup.",
            image: "/service-whatsapp.svg",
            alt: "Illustration for WhatsApp Business setup",
        },
        {
            title: "Instagram Setup",
            desc: "Business profile polish, highlights, bio, and content structure.",
            image: "/service-instagram.svg",
            alt: "Illustration for Instagram setup",
        },
        {
            title: "Zomato/Swiggy Listing",
            desc: "Listing support for menus, details, photos, and service readiness.",
            image: "/service-listing.svg",
            alt: "Illustration for Zomato and Swiggy listing service",
        },
        {
            title: "Website Creation",
            desc: "Clean starter websites that help customers understand and convert.",
            image: "/service-website.svg",
            alt: "Illustration for website creation",
        },
        {
            title: "Ads Management",
            desc: "Campaign setup and management support for local growth.",
            image: "/service-ads.svg",
            alt: "Illustration for ads management",
        },
    ];

    return (
        <section className="section-space relative mx-auto max-w-[1440px] px-6">
            <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl" />
            <div className="mx-auto max-w-3xl text-center">
                <p className="eyebrow">
                    Services
                </p>
                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-gray-950 md:text-5xl">
                    Digital tasks handled by trained IKIGAI partners
                </h2>
                <p className="mt-4 text-lg leading-8 text-gray-600">
                    Start with the work that slows your team down and get it moving with a clear task flow.
                </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                {items.map((item) => (
                    <div
                        key={item.title}
                        className="ui-card ui-card-hover group overflow-hidden p-0"
                    >
                        <div className="h-40 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
                            <Image
                                src={item.image}
                                alt={item.alt}
                                width={640}
                                height={420}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                        </div>

                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-950">
                                {item.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-gray-500">
                                {item.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
