"use client";

import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { AuthGate } from "../../components/AuthGate";
import {
    ClientOverviewSection,
    ClientTasksSection,
    useClientDashboard,
} from "../../components/client/ClientDashboardSections";

export default function ClientDashboard() {
    const router = useRouter();
    const dashboard = useClientDashboard(router);

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Business Owner"
                title="My Requests"
                description="Track payment, progress, updates, and invoices in one place."
            >
                <ClientOverviewSection overviewCards={dashboard.overviewCards} />
                <ClientTasksSection
                    loading={dashboard.loading}
                    taskError={dashboard.taskError}
                    retryFetchTasks={dashboard.retryFetchTasks}
                    authRequired={dashboard.authRequired}
                    tasks={dashboard.tasks}
                    filteredTasks={dashboard.filteredTasks}
                    statusFilter={dashboard.statusFilter}
                    setStatusFilter={dashboard.setStatusFilter}
                    paymentMessages={dashboard.paymentMessages}
                    revisionDrafts={dashboard.revisionDrafts}
                    setRevisionDrafts={dashboard.setRevisionDrafts}
                    reviewingTaskId={dashboard.reviewingTaskId}
                    payingTaskId={dashboard.payingTaskId}
                    downloadingInvoiceId={dashboard.downloadingInvoiceId}
                    startPayment={dashboard.startPayment}
                    downloadInvoice={dashboard.downloadInvoice}
                    submitClientAction={dashboard.submitClientAction}
                />
            </DashboardShell>
        </AuthGate>
    );
}
