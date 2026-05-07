"use client";

import { DashboardShell } from "../../../components/DashboardShell";
import { AuthGate } from "../../../components/AuthGate";
import { ClientHelpSection } from "../../../components/client/ClientDashboardSections";

export default function ClientHelpPage() {
    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Business Owner"
                title="Help"
                description="Simple guidance for starting a service and tracking progress."
            >
                <ClientHelpSection />
            </DashboardShell>
        </AuthGate>
    );
}
