"use client";

import Link from "next/link";
import { ArrowRight, FileSpreadsheet, ImageIcon } from "lucide-react";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { SectionHeading } from "../DashboardUI";

export function AddInventoryChoice() {
    const options = [
        {
            title: "I have an inventory list",
            description: "Upload CSV, upload product images, match them with AI, then save the reviewed product list.",
            href: "/dashboard/upload-inventory/list",
            icon: FileSpreadsheet,
            cta: "Upload CSV + Images",
        },
        {
            title: "I only have product photos",
            description: "Upload product photos, enter prices, and ORVA creates a draft inventory list you can review.",
            href: "/dashboard/upload-inventory/photos",
            icon: ImageIcon,
            cta: "Upload Photos + Prices",
        },
    ];

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Add Inventory"
                title="What do you have today?"
                description="Choose the path that matches your business. ORVA will guide you from upload to reviewed products."
            >
                <section className="dashboard-panel p-6">
                    <SectionHeading
                        title="Start with inventory or photos"
                        description="Nothing gets published automatically. You review the final product list before it is saved."
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        {options.map((option) => {
                            const Icon = option.icon;
                            return (
                                <Link
                                    key={option.href}
                                    href={option.href}
                                    className="interactive-tile group rounded-2xl border border-[var(--border)] bg-white p-6 transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl hover:shadow-[rgba(27,79,216,0.12)]"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)]">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h2 className="mt-5 text-2xl font-semibold text-[var(--ink)]">{option.title}</h2>
                                    <p className="mt-3 text-sm leading-6 text-[var(--mid)]">{option.description}</p>
                                    <span className="mt-6 inline-flex items-center text-sm font-bold text-[var(--accent)]">
                                        {option.cta}
                                        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
