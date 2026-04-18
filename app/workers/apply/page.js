"use client";

import { useState } from "react";

export default function Apply() {
    const [form, setForm] = useState({
        name: "",
        phone: "",
        skills: "",
        availability: "",
    });

    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });

    // ✅ Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error for that field
        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
        setSubmitMessage({ type: "", text: "" });
    };

    // ✅ Validation logic
    const validate = () => {
        let newErrors = {};

        // Name validation
        if (!form.name || form.name.trim().length < 3) {
            newErrors.name = "Enter a valid name";
        }

        // Phone validation (India)
        if (!/^[6-9]\d{9}$/.test(form.phone)) {
            newErrors.phone = "Enter a valid 10-digit phone number";
        }

        // Skills validation
        if (!form.skills || form.skills.trim().length < 3) {
            newErrors.skills = "Please mention your skills";
        }

        // Availability validation
        if (!form.availability || form.availability === "Availability") {
            newErrors.availability = "Select availability";
        }

        // Anti-dummy check
        const dummyWords = ["test", "abc", "asdf", "qwerty"];
        if (dummyWords.includes(form.name.toLowerCase())) {
            newErrors.name = "Please enter your real name";
        }

        return newErrors;
    };

    // ✅ Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSubmitMessage({ type: "", text: "" });

        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setSubmitMessage({
                type: "error",
                text: "Please fix the highlighted fields before submitting your application.",
            });
            setLoading(false); // IMPORTANT FIX
            return;
        }

        setErrors({});

        try {
            const res = await fetch("/api/worker", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                setSuccess(true);
                setForm({
                    name: "",
                    phone: "",
                    skills: "",
                    availability: "",
                });
            } else {
                setSubmitMessage({
                    type: "error",
                    text: "Could not submit your application right now. Please try again.",
                });
            }
        } catch (error) {
            console.error(error);
            setSubmitMessage({
                type: "error",
                text: "Network issue while submitting your application. Please try again.",
            });
        }

        setLoading(false);
    };

    return (
        <main className="gradient-page">
            <section className="max-w-[800px] mx-auto py-20 px-6">
                <div className="text-center">
                    <p className="eyebrow">IKIGAI Partner Application</p>
                    <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                        Start Earning From Home
                    </h1>

                    <p className="text-gray-600 mt-4">
                        Fill this form and we’ll connect you with tasks you can do from home.
                    </p>
                </div>

                {!success ? (
                    <form onSubmit={handleSubmit} className="ui-card mt-10 space-y-6">

                        {/* Name */}
                        <div>
                            <input
                                name="name"
                                placeholder="Your Name"
                                value={form.name}
                                onChange={handleChange}
                                className={`form-field ${errors.name ? "border-red-500" : ""}`}
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <input
                                name="phone"
                                placeholder="Phone Number"
                                value={form.phone}
                                onChange={handleChange}
                                className={`form-field ${errors.phone ? "border-red-500" : ""}`}
                            />
                            {errors.phone && (
                                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                            )}
                        </div>

                        {/* Skills */}
                        <div>
                            <input
                                name="skills"
                                placeholder="Skills (typing, product listing, etc.)"
                                value={form.skills}
                                onChange={handleChange}
                                className={`form-field ${errors.skills ? "border-red-500" : ""}`}
                            />
                            {errors.skills && (
                                <p className="text-red-500 text-sm mt-1">{errors.skills}</p>
                            )}
                        </div>

                        {/* Availability */}
                        <div>
                            <select
                                name="availability"
                                value={form.availability}
                                onChange={handleChange}
                                className={`form-field ${errors.availability ? "border-red-500" : ""}`}
                            >
                                <option>Availability</option>
                                <option>1-2 hours/day</option>
                                <option>3-4 hours/day</option>
                                <option>5+ hours/day</option>
                            </select>

                            {errors.availability && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.availability}
                                </p>
                            )}
                        </div>

                        {submitMessage.text && (
                            <div
                                className={`rounded-2xl border p-4 text-sm leading-6 ${
                                    submitMessage.type === "error"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-green-200 bg-green-50 text-green-700"
                                }`}
                            >
                                {submitMessage.text}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? "Submitting..." : "Apply Now"}
                        </button>

                    </form>
                ) : (
                    <div className="ui-card mt-10 text-center">
                        <h2 className="text-2xl font-semibold text-green-600">
                            Thank you! We will contact you soon
                        </h2>
                        <p className="text-gray-500 mt-2">
                            Our team will review your application and reach out shortly.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
