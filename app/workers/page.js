import Link from "next/link";
import { Navbar } from "../../components/Navbar";

export default function Workers() {
    return (
        <main>
            <Navbar />

            <div className="max-w-[1200px] mx-auto px-6">

                {/* HERO */}
                <section className="text-center py-20">
                    <h1 className="text-4xl md:text-5xl font-semibold text-gray-900">
                        Earn From Home
                    </h1>

                    <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                        Join IKIGAI and start earning by completing simple online tasks at your own pace.
                    </p>

                    <Link
                        href="/workers/apply"
                        className="inline-block mt-8 bg-gray-900 text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition shadow-sm"
                    >
                        Apply Now
                    </Link>
                </section>

                {/* BENEFITS */}
                <section className="grid md:grid-cols-3 gap-6 py-12">
                    {[
                        {
                            title: "Work from Home",
                            desc: "No travel needed. Work comfortably from your home.",
                        },
                        {
                            title: "Flexible Hours",
                            desc: "Choose your own time and pace.",
                        },
                        {
                            title: "Training Provided",
                            desc: "We will train you for all tasks before you start working.",
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="p-6 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition"
                        >
                            <h3 className="font-semibold text-gray-900">
                                {item.title}
                            </h3>
                            <p className="text-gray-600 mt-2 text-sm">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </section>
                <section className="py-20">
                    <h2 className="text-2xl font-semibold text-center text-gray-900">
                        How Training Works
                    </h2>

                    <p className="text-gray-600 text-center mt-2">
                        We guide you step-by-step so you can start earning confidently.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 mt-12">
                        {[
                            {
                                step: "Step 1",
                                title: "Basic Training",
                                desc: "We teach you how to perform tasks like data entry and product listing.",
                            },
                            {
                                step: "Step 2",
                                title: "Practice Tasks",
                                desc: "You practice with sample work until you feel confident.",
                            },
                            {
                                step: "Step 3",
                                title: "Start Earning",
                                desc: "Get real tasks and start earning from home.",
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition"
                            >
                                <div className="text-sm text-gray-400 mb-2">
                                    {item.step}
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900">
                                    {item.title}
                                </h3>

                                <p className="text-gray-600 mt-2 text-sm">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* WORK TYPES */}
                <section className="py-16 bg-gray-50 rounded-3xl px-6">
                    <h2 className="text-2xl font-semibold text-center text-gray-900">
                        Types of Work
                    </h2>

                    <div className="grid md:grid-cols-4 gap-6 mt-10">
                        {[
                            "Product Listing",
                            "Data Entry",
                            "Email Support",
                            "AI Data Labeling",
                        ].map((item) => (
                            <div
                                key={item}
                                className="bg-white p-5 rounded-xl border border-gray-200 text-center"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="text-center py-20">
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Ready to start earning?
                    </h2>

                    <p className="text-gray-600 mt-2">
                        Apply now and we’ll connect you with your first task.
                    </p>

                    <Link
                        href="/workers/apply"
                        className="inline-block mt-6 bg-gray-900 text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition"
                    >
                        Apply Now
                    </Link>
                    <p className="text-sm text-gray-500 mt-3">
                        No experience required • Training will be provided
                    </p>
                </section>

            </div>
        </main>
    );
}