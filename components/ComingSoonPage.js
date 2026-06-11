import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const highlights = [
    "Upload inventory once",
    "Create catalog previews",
    "Publish-ready social content",
];

export function ComingSoonPage() {
    return (
        <main className="relative isolate overflow-hidden bg-[#081827] text-white">
            <section className="relative min-h-[calc(100vh-56px)] px-5 py-16 sm:px-8 lg:px-10">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(71,204,226,0.22),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(54,103,229,0.2),transparent_26%),linear-gradient(135deg,#081827_0%,#0d2034_48%,#112544_100%)]" />
                <div className="absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:48px_48px]" />

                <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-6xl flex-col justify-center">
                    <div className="max-w-3xl animate-[fade-up_0.7s_ease_both]">
                        <div className="mb-8 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur">
                            <BrandLogo showTagline />
                        </div>

                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                            <Sparkles className="h-4 w-4" />
                            Coming soon
                        </div>

                        <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.02em] text-white sm:text-6xl lg:text-7xl">
                            Turn your inventory into a digital storefront.
                        </h1>

                        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
                            ORVA helps local businesses upload products once, create catalog previews,
                            generate social content, and keep WhatsApp, Instagram, Facebook, and store
                            listings ready to update.
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="mailto:support@ikigaidigital.in?subject=ORVA%20early%20access"
                                className="btn-primary min-h-12 px-6 text-base"
                            >
                                Request early access
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link href="/auth" className="btn-secondary min-h-12 px-6 text-base">
                                Client login
                            </Link>
                        </div>
                    </div>

                    <div className="mt-14 grid gap-3 sm:grid-cols-3">
                        {highlights.map((item, index) => (
                            <div
                                key={item}
                                className="animate-[fade-up_0.7s_ease_both] rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/10 backdrop-blur"
                                style={{ animationDelay: `${0.12 + index * 0.08}s` }}
                            >
                                <CheckCircle2 className="mb-4 h-5 w-5 text-cyan-200" />
                                <p className="text-base font-semibold text-white">{item}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 inline-flex w-fit animate-[fade-up_0.7s_0.42s_ease_both] items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm text-white/55 backdrop-blur">
                        <Clock3 className="h-4 w-4 text-cyan-200" />
                        Building for boutiques, home sellers, local stores, and service-led businesses.
                    </div>
                </div>
            </section>
        </main>
    );
}
