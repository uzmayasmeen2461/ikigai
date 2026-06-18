"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, ExternalLink, Filter, PlayCircle } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { AuthGate } from "./AuthGate";
import { DashboardShell } from "./DashboardShell";
import {
    EmptyState,
    ErrorState,
    FilterTabs,
    SectionHeading,
    StatCard,
} from "./DashboardUI";

const trainingFilters = [
    { value: "all", label: "All" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "listing", label: "Product Listing" },
    { value: "restaurant", label: "Restaurant" },
    { value: "website", label: "Website" },
    { value: "social", label: "Social Media" },
];

function TrainingSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
                <div key={item} className="dashboard-card p-6">
                    <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="mt-5 h-4 w-24 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 h-6 w-3/4 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-3 space-y-2">
                        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-6 h-11 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            ))}
        </div>
    );
}

export function PartnerTrainingPage() {
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [trainingFilter, setTrainingFilter] = useState("all");

    const filteredTrainings = useMemo(() => {
        if (trainingFilter === "all") return trainings;

        return trainings.filter((training) => {
            const category = (training.category || "general").toLowerCase();

            if (trainingFilter === "social") {
                return category === "social" || category === "instagram";
            }

            return category === trainingFilter;
        });
    }, [trainingFilter, trainings]);

    const trainingCategoriesCount = useMemo(() => {
        const categories = new Set(
            trainings.map((training) => (training.category || "general").toLowerCase())
        );

        return categories.size;
    }, [trainings]);

    const overviewCards = useMemo(
        () => [
            {
                label: "Resources",
                value: trainings.length,
                icon: BookOpenCheck,
                accent: "bg-slate-950",
            },
            {
                label: "Categories",
                value: trainingCategoriesCount,
                icon: Filter,
                accent: "bg-blue-500",
            },
        ],
        [trainingCategoriesCount, trainings.length]
    );

    const fetchTrainings = async () => {
        setLoading(true);
        setError("");

        const { data, error: fetchError } = await supabase.from("trainings").select("*");

        if (fetchError) {
            setTrainings([]);
            setError(fetchError.message || "Could not load training resources.");
            setLoading(false);
            return;
        }

        setTrainings(data || []);
        setLoading(false);
    };

    useEffect(() => {
        queueMicrotask(() => {
            fetchTrainings();
        });
    }, []);

    return (
        <AuthGate allowedRoles="partner">
            <DashboardShell
                role="partner"
                eyebrow="Training"
                title="Training"
                description="Learn how to complete ORVA service tasks."
            >
                <section className="mb-10">
                    <SectionHeading
                        title="Training"
                        description="Open a short guide and get ready for the next task."
                    />
                    <div className="grid gap-5 sm:grid-cols-2 xl:max-w-xl">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section className="dashboard-panel p-6">
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                                Training library
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Pick a category and open the resource you need.
                            </p>
                        </div>
                        <div className="max-w-full lg:max-w-3xl">
                            <FilterTabs
                                filters={trainingFilters}
                                value={trainingFilter}
                                onChange={setTrainingFilter}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <TrainingSkeleton />
                    ) : error ? (
                        <ErrorState
                            title="Could not load trainings"
                            message={error}
                            onRetry={fetchTrainings}
                        />
                    ) : trainings.length === 0 ? (
                        <EmptyState
                            icon={PlayCircle}
                            title="Training resources will appear here."
                            description="Check back later for step-by-step task guides."
                            className="bg-slate-50"
                        />
                    ) : filteredTrainings.length === 0 ? (
                        <EmptyState
                            icon={Filter}
                            title="No resources in this category"
                            description="Try another category."
                            className="bg-slate-50"
                        />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredTrainings.map((training) => (
                                <article
                                    key={training.id}
                                    className="dashboard-card dashboard-card-hover group relative overflow-hidden bg-gradient-to-b from-white to-slate-50 p-6"
                                >
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />
                                    <div className="flex items-start gap-4">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/60">
                                            <PlayCircle className="h-6 w-6" />
                                        </span>
                                        <div>
                                            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                                                {training.category || "general"}
                                            </span>
                                            <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                                                {training.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                Quick guide for this task type.
                                            </p>
                                        </div>
                                    </div>

                                    <a
                                        href={training.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-primary mt-6 w-full"
                                    >
                                        Open Training <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
