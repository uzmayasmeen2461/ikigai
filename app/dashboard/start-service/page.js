"use client";

import { useRouter } from "next/navigation";
import { DashboardShell } from "../../../components/DashboardShell";
import { AuthGate } from "../../../components/AuthGate";
import {
    ClientRequestFormSection,
    useClientDashboard,
} from "../../../components/client/ClientDashboardSections";

export default function ClientStartServicePage() {
    const router = useRouter();
    const dashboard = useClientDashboard(router);

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Business Owner"
                title="Start Service"
                description="Pick a service, add your requirement, and pay when you are ready."
            >
                <ClientRequestFormSection
                    service={dashboard.service}
                    setService={dashboard.setService}
                    title={dashboard.title}
                    setTitle={dashboard.setTitle}
                    description={dashboard.description}
                    setDescription={dashboard.setDescription}
                    errors={dashboard.errors}
                    setErrors={dashboard.setErrors}
                    formMessage={dashboard.formMessage}
                    selectedPricing={dashboard.selectedPricing}
                    createTask={dashboard.createTask}
                    submitting={dashboard.submitting}
                />
            </DashboardShell>
        </AuthGate>
    );
}
