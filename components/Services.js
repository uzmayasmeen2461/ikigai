export function Services() {
    const items = [
        "Product Listing",
        "Data Entry",
        "Email Support",
        "AI Data Labeling",
    ];

    return (
        <section className="py-20">
            <h2 className="text-2xl font-semibold text-center text-gray-900">
                Services
            </h2>

            <div className="grid md:grid-cols-4 gap-6 mt-12">
                {items.map((item) => (
                    <div
                        key={item}
                        className="p-6 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition text-center"
                    >
                        {item}
                    </div>
                ))}
            </div>
        </section>
    );
}