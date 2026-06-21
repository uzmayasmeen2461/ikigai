import { notFound } from "next/navigation";
import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "../../lib/supabaseServer";
import { formatInventoryStatus, productName, productStock } from "../../lib/inventory";
import { formatINR } from "../../lib/pricing";

export const dynamic = "force-dynamic";

export default async function CatalogItemPage({ params }) {
    if (!hasSupabaseServiceRoleKey()) notFound();

    const { productId } = await params;
    const supabase = createSupabaseServiceRole();
    const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();

    if (!product) notFound();

    const imageUrl = product.cleaned_image_url || product.image_url;
    const stock = productStock(product);

    return (
        <main className="min-h-screen bg-[var(--surface)] px-5 py-10 text-[var(--ink)]">
            <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-xl">
                {imageUrl ? (
                    <div className="aspect-square w-full bg-[var(--surface)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={productName(product)} className="h-full w-full object-cover" />
                    </div>
                ) : null}
                <div className="p-6 sm:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">ORVA catalog item</p>
                    <h1 className="mt-3 text-3xl font-black">{productName(product)}</h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="dashboard-badge badge-blue">{formatINR(product.price || 0)}</span>
                        <span className={`dashboard-badge ${stock > 0 ? "badge-green" : "badge-red"}`}>{formatInventoryStatus(product.status)}</span>
                    </div>
                    {product.description || product.notes ? (
                        <p className="mt-5 leading-7 text-[var(--mid)]">{product.description || product.notes}</p>
                    ) : null}
                    <p className="mt-6 text-sm text-[var(--muted)]">Message the business to order this product.</p>
                </div>
            </section>
        </main>
    );
}
