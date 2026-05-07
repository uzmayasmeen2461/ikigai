import { Suspense } from "react";
import { WhatsAppCatalogAssistant } from "../../../../components/WhatsAppCatalogAssistant";

export default function AdminWhatsAppCatalogPage() {
    return (
        <Suspense fallback={null}>
            <WhatsAppCatalogAssistant role="admin" />
        </Suspense>
    );
}
