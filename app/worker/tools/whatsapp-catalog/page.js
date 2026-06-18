import { Suspense } from "react";
import { PartnerProductStudio } from "../../../../components/product-studio/ProductStudioRoute";

export default function PartnerWhatsAppCatalogPage() {
    return (
        <Suspense fallback={null}>
            <PartnerProductStudio defaultChannel="whatsapp" />
        </Suspense>
    );
}
