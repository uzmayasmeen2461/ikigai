import { Suspense } from "react";
import { PartnerProductStudio } from "../../../../components/product-studio/ProductStudioRoute";

export default function InstagramSetupToolPage() {
    return (
        <Suspense fallback={null}>
            <PartnerProductStudio defaultChannel="instagram" />
        </Suspense>
    );
}
