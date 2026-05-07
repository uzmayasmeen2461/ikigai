import { Suspense } from "react";
import { WhatsAppCatalogAssistant } from "../../../../components/WhatsAppCatalogAssistant";

export default function PartnerWhatsAppCatalogAliasPage() {
    return (
        <Suspense fallback={null}>
            <WhatsAppCatalogAssistant role="partner" />
        </Suspense>
    );
}
