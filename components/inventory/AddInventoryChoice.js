"use client";

import Link from "next/link";
import { ImageIcon, Megaphone, Plus } from "lucide-react";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { SectionHeading, VisualActionCard } from "../DashboardUI";

export function AddInventoryChoice() {
    const options = [
        {
            title: "Upload product photos",
            description: "Upload product photos, enter prices, and ORVA creates a draft inventory list you can review.",
            href: "/dashboard/upload-inventory/photos",
            icon: ImageIcon,
            cta: "Upload Photos + Prices",
            visual: "photo",
            primary: true,
        },
        {
            title: "Upload marketing images",
            description: "Upload brand, offer, or service images. ORVA helps create captions and CTAs without asking for product prices.",
            href: "/dashboard/upload-inventory/content",
            icon: Megaphone,
            cta: "Create Content Posts",
            visual: "content",
        },
    ];

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Upload"
                title="Upload images"
            >
                <Link href="/dashboard/create-post" className="mb-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-5 font-bold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800 sm:w-auto">
                    <Plus className="h-5 w-5" /> Create a post
                </Link>
                <section className="dashboard-panel p-6">
                    <SectionHeading
                        icon={ImageIcon}
                        title="Choose what you want to upload"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        {options.map((option) => (
                            <VisualActionCard
                                key={option.href}
                                title={option.title}
                                description={option.description}
                                action={option.cta}
                                href={option.href}
                                icon={option.icon}
                                primary={option.primary}
                                visual={option.visual}
                            />
                        ))}
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
