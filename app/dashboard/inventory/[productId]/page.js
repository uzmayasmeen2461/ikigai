import { InventoryProductFormPage } from "../../../../components/inventory/InventoryManager";

export default async function InventoryProductPage({ params }) {
    const { productId } = await params;
    return <InventoryProductFormPage productId={productId} />;
}
