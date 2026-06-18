import { Suspense } from "react";
import { PartnerProductStudio } from "../../../../components/product-studio/ProductStudioRoute";

export default function PartnerProductStudioPage() {
    return (
        <Suspense fallback={null}>
            <PartnerProductStudio />
        </Suspense>
    );
}
