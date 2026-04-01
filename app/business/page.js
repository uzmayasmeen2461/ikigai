"use client";

import { useState } from "react";
import { Navbar } from "../../components/Navbar";

export default function Business() {
    const [form, setForm] = useState({
        name: "",
        business: "",
        platform: "",
        products: "",
        requirement: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Handle change
    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
    };

    //  Validation
    const validate = () => {
        let newErrors = {};

        // Name
        if (!form.name || form.name.trim().length < 3) {
            newErrors.name = "Enter a valid name";
        }

        // Business name
        if (!form.business || form.business.trim().length < 2) {
            newErrors.business = "Enter business name";
        }

        // Platform
        if (!form.platform || form.platform === "Select Platform") {
            newErrors.platform = "Select a platform";
        }

        // Products
        if (!form.products || Number(form.products) <= 0) {
            newErrors.products = "Enter valid number of products";
        }

        // Requirement
        if (!form.requirement || form.requirement.trim().length < 10) {
            newErrors.requirement = "Please describe your requirement";
        }

        // Anti-dummy
        const dummyWords = ["test", "abc", "asdf", "qwerty"];
        if (dummyWords.includes(form.name.toLowerCase())) {
            newErrors.name = "Please enter your real name";
        }

        return newErrors;
    };

    //  Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setLoading(false);
            return;
        }

        setErrors({});

        try {
            const res = await fetch("/api/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                alert("Something went wrong");
            }
        } catch (error) {
            console.error(error);
            alert("Error submitting form");
        }

        setLoading(false);
    };

    return (
        <main>
            <Navbar />

            <section className="max-w-[800px] mx-auto py-20 px-6">
                <h1 className="text-3xl font-semibold text-center">
                    Start Your Free Trial
                </h1>

                <p className="text-gray-600 text-center mt-4">
                    Tell us your requirements and we’ll assign a trained assistant.
                </p>

                {!success ? (
                    <form onSubmit={handleSubmit} className="mt-10 space-y-6">

                        {/* Name */}
                        <div>
                            <input
                                name="name"
                                placeholder="Your Name"
                                value={form.name}
                                onChange={handleChange}
                                className={`w-full border p-3 rounded-xl ${errors.name ? "border-red-500" : "border-gray-300"
                                    }`}
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Business */}
                        <div>
                            <input
                                name="business"
                                placeholder="Business Name"
                                value={form.business}
                                onChange={handleChange}
                                className={`w-full border p-3 rounded-xl ${errors.business ? "border-red-500" : "border-gray-300"
                                    }`}
                            />
                            {errors.business && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.business}
                                </p>
                            )}
                        </div>

                        {/* Platform */}
                        <div>
                            <select
                                name="platform"
                                value={form.platform}
                                onChange={handleChange}
                                className={`w-full border p-3 rounded-xl ${errors.platform ? "border-red-500" : "border-gray-300"
                                    }`}
                            >
                                <option>Select Platform</option>
                                <option>Shopify</option>
                                <option>Amazon</option>
                                <option>Meesho</option>
                                <option>Other</option>
                            </select>

                            {errors.platform && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.platform}
                                </p>
                            )}
                        </div>

                        {/* Products */}
                        <div>
                            <input
                                type="number"
                                name="products"
                                placeholder="Number of products"
                                value={form.products}
                                onChange={handleChange}
                                className={`w-full border p-3 rounded-xl ${errors.products ? "border-red-500" : "border-gray-300"
                                    }`}
                            />
                            {errors.products && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.products}
                                </p>
                            )}
                        </div>

                        {/* Requirement */}
                        <div>
                            <textarea
                                name="requirement"
                                placeholder="Describe your requirement"
                                value={form.requirement}
                                onChange={handleChange}
                                className={`w-full border p-3 rounded-xl ${errors.requirement
                                    ? "border-red-500"
                                    : "border-gray-300"
                                    }`}
                            />
                            {errors.requirement && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.requirement}
                                </p>
                            )}
                        </div>

                        {/* Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Submit Request"}
                        </button>

                    </form>
                ) : (
                    <div className="text-center mt-10">
                        <h2 className="text-2xl font-semibold text-green-600">
                            Thanks! Our team will contact you within 24 hours.
                        </h2>
                        <p className="text-gray-500 mt-2">
                            We are reviewing your request.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}