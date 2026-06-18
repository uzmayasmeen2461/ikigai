import { PublicCatalogPreview } from "../../../components/client/PreviewStudio";

export default async function PublicPreviewPage({ params }) {
    const { businessSlug } = await params;
    return <PublicCatalogPreview businessSlug={businessSlug} />;
}
