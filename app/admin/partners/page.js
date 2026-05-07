"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, UserCheck, UserRound, UsersRound } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { DashboardShell } from "../../../components/DashboardShell";
import { AuthGate } from "../../../components/AuthGate";
import { EmptyState, ErrorState, SectionHeading, StatCard } from "../../../components/DashboardUI";

export default function AdminPartnersPage() {
    const [workers, setWorkers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const partnerStats = useMemo(
        () =>
            workers.map((worker) => ({
                ...worker,
                assignedCount: tasks.filter((task) => task.worker_id === worker.id).length,
            })),
        [tasks, workers]
    );

    const overviewCards = useMemo(
        () => [
            {
                label: "Partners",
                value: workers.length,
                icon: UsersRound,
                accent: "bg-slate-950",
            },
            {
                label: "Assigned tasks",
                value: tasks.filter((task) => Boolean(task.worker_id)).length,
                icon: UserCheck,
                accent: "bg-blue-500",
            },
        ],
        [tasks, workers.length]
    );

    const fetchData = async () => {
        setError("");

        const [{ data: workerData, error: workerError }, { data: taskData, error: taskError }] = await Promise.all([
            supabase.from("users").select("*").eq("role", "worker"),
            supabase.from("tasks").select("*"),
        ]);

        if (workerError || taskError) {
            setWorkers([]);
            setTasks([]);
            setError(workerError?.message || taskError?.message || "Could not load partners.");
            setLoading(false);
            return;
        }

        setWorkers(workerData || []);
        setTasks(taskData || []);
        setLoading(false);
    };

    useEffect(() => {
        queueMicrotask(() => {
            fetchData();
        });
    }, []);

    return (
        <AuthGate allowedRoles="admin">
            <DashboardShell
                role="admin"
                eyebrow="Admin"
                title="Partners"
                description="See the current partner list and how much work is already assigned."
            >
                <section className="mb-10">
                    <SectionHeading title="Partner overview" description="A simple view of active ikigaidigital partners and their task load." />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                </section>

                <section className="dashboard-panel p-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Partner list</h2>
                        <p className="mt-1 text-sm text-slate-500">Check who is available in the system and how many tasks they currently hold.</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading partners...
                        </div>
                    ) : error ? (
                        <ErrorState title="Could not load partners" message={error} onRetry={fetchData} />
                    ) : partnerStats.length === 0 ? (
                        <EmptyState title="No partners yet" description="Approved ikigaidigital partners will appear here." />
                    ) : (
                        <div className="grid gap-4">
                            {partnerStats.map((partner) => (
                                <div key={partner.id} className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                            <UserRound className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-950">{partner.name || partner.email || "ikigaidigital Partner"}</p>
                                            <p className="text-sm text-slate-500">{partner.email || "No email available"}</p>
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                        Availability: {partner.availability || "available"}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                        {partner.assignedCount} assigned
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
