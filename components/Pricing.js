export function Pricing() {
    const plans = [
        {
            name: "Free Trial",
            price: "₹0",
            subtitle: "7 days to try ORVA",
            features: [
                "Inventory upload",
                "Product previews",
                "Basic captions",
                "Manual approval after trial",
            ],
        },
        {
            name: "Initial Setup",
            price: "₹2,000",
            subtitle: "One-time ORVA setup",
            highlight: true,
            features: [
                "Inventory/photo onboarding",
                "AI image matching",
                "Catalog preview setup",
                "Product title cleanup",
                "Manual payment confirmation",
            ],
        },
        {
            name: "Managed",
            price: "₹7,000/mo",
            subtitle: "Catalog and manual channel support",
            features: [
                "WhatsApp catalog management",
                "Manual social updates",
                "Monthly catalog cleanup",
                "Specialist support",
                "Priority issue tracking",
            ],
        },
    ];

    return (
        <section className="py-24">
            <div className="text-center">
                <h2 className="text-3xl font-semibold text-gray-900">
                    Simple, Transparent Pricing
                </h2>
                <p className="text-gray-600 mt-3">
                    Choose a plan that fits your business needs
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-16">

                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`relative p-8 rounded-2xl border ${plan.highlight
                                ? "border-gray-900 shadow-lg scale-105"
                                : "border-gray-200"
                            } bg-white`}
                    >
                        {/* MOST POPULAR TAG */}
                        {plan.highlight && (
                            <span className="absolute top-4 right-4 rounded-full bg-slate-950 px-3 py-1 text-xs text-white">
                                Most Popular
                            </span>
                        )}

                        <h3 className="text-xl font-semibold text-gray-900">
                            {plan.name}
                        </h3>

                        <p className="text-gray-500 text-sm mt-1">
                            {plan.subtitle}
                        </p>

                        <p className="text-3xl font-semibold mt-4">
                            {plan.price}
                        </p>

                        <ul className="mt-6 space-y-3 text-sm text-gray-600">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex gap-2">
                                    <span>✓</span> {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            className={`mt-8 w-full ${plan.highlight ? "btn-primary" : "btn-secondary"
                                }`}
                        >
                            Get Started
                        </button>
                    </div>
                ))}

            </div>

            {/* TRUST LINE */}
            <p className="text-center text-sm text-gray-500 mt-10">
                7-day free trial • Manual payment confirmation • Advanced automation from ₹15,000/month
            </p>
        </section>
    );
}
