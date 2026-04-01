export function Hero() {
    return (
        <section className="py-24 text-center">
            <h1 className="text-5xl md:text-6xl font-semibold leading-tight text-gray-900 max-w-4xl mx-auto">
                Get Your Business Tasks Done — Without Hiring Full-Time Staff
            </h1>

            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                IKIGAI connects businesses with trained remote assistants for product listing, data entry, and more.
            </p>

            <div className="mt-10 flex justify-center gap-4">
                <a className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition shadow-sm">
                    Start Free Trial
                </a>

                <a className="border border-gray-300 px-6 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition">
                    Earn From Home
                </a>
            </div>
        </section>
    );
}