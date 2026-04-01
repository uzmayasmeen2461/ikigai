export function HowItWorks() {
    const steps = [
        {
            title: "Submit Your Requirement",
            desc: "Tell us what tasks you need help with.",
        },
        {
            title: "We Assign an Assistant",
            desc: "A trained remote assistant is matched to your work.",
        },
        {
            title: "Get Work Done",
            desc: "Tasks are completed quickly and efficiently.",
        },
    ];

    return (
        <section className="py-20 bg-gray-50 rounded-3xl">
            <h2 className="text-2xl font-semibold text-center text-gray-900">
                How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className="p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition"
                    >
                        <div className="text-sm text-gray-400 mb-2">
                            Step {index + 1}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900">
                            {step.title}
                        </h3>

                        <p className="mt-2 text-gray-600 text-sm">
                            {step.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}