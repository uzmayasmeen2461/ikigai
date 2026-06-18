import Link from "next/link";
import { formatINR } from "../../../lib/pricing";
import { productName, productStock } from "../../../lib/inventory";
import { normalizeFeedToken } from "../../../lib/catalogFeed";
import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";
import { BrandLogo } from "../../../../components/BrandLogo";

export default async function PublicCatalogProductPage({ params }) {
    const { token, productId } = await params;
    if (!hasSupabaseServiceRoleKey()) {
        return <main className="min-h-screen bg-[#071827] p-8 text-white">Catalog preview is not configured.</main>;
    }

    const supabase = createSupabaseServiceRole();
    const { data: feed } = await supabase
        .from("catalog_feeds")
        .select("*")
        .eq("feed_token", normalizeFeedToken(token))
        .eq("status", "active")
        .maybeSingle();

    if (!feed) return <main className="min-h-screen bg-[#071827] p-8 text-white">Catalog not found.</main>;

    const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("user_id", feed.client_id)
        .maybeSingle();

    if (!product) return <main className="min-h-screen bg-[#071827] p-8 text-white">Product not found.</main>;

    const imageUrl = product.cleaned_image_url || product.image_url;
    const inStock = productStock(product) > 0 && product.status !== "out_of_stock";

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(124,231,242,0.22),transparent_30%),linear-gradient(135deg,#071827,#101A38)] px-4 py-8 text-white">
            <section className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <BrandLogo size="compact" />
                    <Link href="/" className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white/80">Powered by ORVA</Link>
                </div>
                <div className="grid gap-0 md:grid-cols-2">
                    <div className="relative aspect-square bg-black/20">
                        {imageUrl ? (
                            <img src={imageUrl} alt={productName(product)} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-white/50">No image</div>
                        )}
                    </div>
                    <div className="p-6 md:p-10">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{product.category || "ORVA catalog"}</p>
                        <h1 className="mt-4 text-4xl font-black tracking-[-0.03em]">{productName(product)}</h1>
                        <p className="mt-4 text-2xl font-black text-cyan-200">{formatINR(product.price || 0)}</p>
                        <span className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-black ${inStock ? "bg-emerald-400/18 text-emerald-100" : "bg-rose-400/18 text-rose-100"}`}>
                            {inStock ? "In stock" : "Out of stock"}
                        </span>
                        <p className="mt-6 leading-7 text-white/72">{product.description || product.notes || "Message the business to order this product."}</p>
                        <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="text-sm font-bold text-white">Product code</p>
                            <p className="mt-1 text-lg font-black text-cyan-200">{product.product_code || product.sku || product.id.slice(0, 8)}</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
