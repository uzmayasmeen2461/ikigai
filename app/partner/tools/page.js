import Link from "next/link";
import { LockKeyhole, Wrench } from "lucide-react";
import { AuthGate } from "../../../components/AuthGate";
import { DashboardShell } from "../../../components/DashboardShell";
import { SectionHeading } from "../../../components/DashboardUI";

const tools = [
    {
        title: "WhatsApp Catalog Assistant",
        description: "Open from a paid assigned WhatsApp task.",
        href: "/partner/tools/whatsapp-catalog",
    },
    {
        title: "Instagram Setup Assistant",
        description: "Open from a paid assigned Instagram or Social Media task.",
        href: "/partner/tools/instagram-setup",
    },
];

export default function PartnerToolsPage() {
    return (
        <AuthGate allowedRoles="partner">
            <DashboardShell role="partner" eyebrow="Partner" title="Tools" description="Internal tools stay locked unless opened from an assigned paid task.">
                <SectionHeading title="Internal tools" description="Start from My Tasks so each project is linked to client work." />
                <div className="grid gap-5 md:grid-cols-2">
                    {tools.map((tool) => (
                        <article key={tool.title} className="dashboard-card dashboard-card-hover p-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                <Wrench className="h-5 w-5" />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-950">{tool.title}</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{tool.description}</p>
                            <Link href={tool.href} className="btn-secondary mt-5">
                                <LockKeyhole className="mr-2 h-4 w-4" />
                                Check access
                            </Link>
                        </article>
                    ))}
                </div>
            </DashboardShell>
        </AuthGate>
    );
}
