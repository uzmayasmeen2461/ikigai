export function LegalPage({ eyebrow, title, updated, intro, sections }) {
    return (
        <main className="gradient-page px-6 py-16">
            <section className="mx-auto max-w-[980px]">
                <div className="premium-panel hero-noise overflow-hidden p-8 shadow-2xl shadow-blue-100/40 md:p-12">
                    <p className="eyebrow">{eyebrow}</p>
                    <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
                        {title}
                    </h1>
                    <p className="mt-4 text-sm font-semibold text-slate-400">Last updated: {updated}</p>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{intro}</p>
                </div>

                <div className="mt-8 grid gap-5">
                    {sections.map((section) => (
                        <article key={section.title} className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-lg shadow-slate-200/45 backdrop-blur-xl">
                            <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
                                {section.title}
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                        </article>
                    ))}
                </div>

                <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50/80 p-6 text-sm leading-7 text-slate-700">
                    For policy questions, contact{" "}
                    <a href="mailto:support@ikigai.in" className="font-semibold text-blue-700">
                        support@ikigai.in
                    </a>
                    .
                </div>
            </section>
        </main>
    );
}
