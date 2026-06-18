import { InventoryProductFormPage } from "../../../../components/inventory/InventoryManager";

export default async function ProductPage({ params }) {
    const { productId } = await params;
    return <InventoryProductFormPage productId={productId} />;
}

