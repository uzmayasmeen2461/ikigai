import { Suspense } from "react";
import { InventoryConverterTool } from "../../../../components/inventory/InventoryConverterTool";

export default function InventoryConverterPage() {
    return (
        <Suspense fallback={null}>
            <InventoryConverterTool />
        </Suspense>
    );
}
