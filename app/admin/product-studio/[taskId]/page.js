import { AdminProductStudio } from "../../../../components/product-studio/ProductStudioRoute";

export default async function AdminProductStudioPage({ params }) {
    const { taskId } = await params;
    return <AdminProductStudio taskId={taskId} />;
}
