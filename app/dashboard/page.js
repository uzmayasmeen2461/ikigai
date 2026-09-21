import { GrowthAssistantPage } from "../../components/client/GrowthAssistantPage";
import { GrowthAutopilotPage } from "../../components/client/GrowthAutopilotPage";
import { AddInventoryChoice } from "../../components/inventory/AddInventoryChoice";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientDashboard({ searchParams }) {
    const params = await searchParams;
    const view = params?.view;

    if (view === "growth-assistant") return <GrowthAssistantPage />;
    if (view === "growth-autopilot") return <GrowthAutopilotPage />;

    return <AddInventoryChoice />;
}
