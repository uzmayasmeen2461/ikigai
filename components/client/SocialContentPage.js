"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { buildInstagramCaption, buildWhatsAppText, escapeCsv, productCode, productName } from "../../app/lib/inventory";
import { formatStableDateTime } from "../../app/lib/stableDate";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading } from "../DashboardUI";

function facebookPost(product) {
    return `${productName(product)} is available now${product.category ? ` in ${product.category}` : ""}. Price: ₹${Number(product.price || 0).toLocaleString("en-IN")}. Message us to order.`;
}

function hashtags(product) {
    const category = String(product.category || "").replace(/[^a-z0-9]/gi, "");
    return ["#NewArrival", "#ShopLocal", "#LocalBusiness", category ? `#${category}` : ""].filter(Boolean).join(" ");
}

function downloadCsv(products) {
    const headers = ["product_code", "product_name", "whatsapp_description", "instagram_caption", "facebook_post", "hashtags"];
    const rows = products.map((product) => ({
        product_code: productCode(product),
        product_name: productName(product),
        whatsapp_description: buildWhatsAppText(product),
        instagram_caption: buildInstagramCaption(product),
        facebook_post: facebookPost(product),
        hashtags: hashtags(product),
    }));
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orva-social-content.csv";
    link.click();
    URL.revokeObjectURL(url);
}

export function SocialContentPage() {
    const [products, setProducts] = useState([]);
    const [outputs, setOutputs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const headers = { Authorization: `Bearer ${data.session?.access_token || ""}` };
        const [response, outputResponse] = await Promise.all([
            fetch("/api/inventory", { headers }),
            fetch("/api/product-studio/outputs", { headers }),
        ]);
        const [result, outputResult] = await Promise.all([response.json(), outputResponse.json()]);
        setProducts(result.products || []);
        setOutputs(outputResult.outputs || []);
        if (!response.ok) setMessage({ type: "error", text: result.error || "Could not load products." });
        else if (!outputResponse.ok) setMessage({ type: "error", text: outputResult.error || "Could not load generated update posts." });
        setLoading(false);
    }, []);
    useEffect(() => { queueMicrotask(load); }, [load]);

    const copy = async (text) => {
        await navigator.clipboard?.writeText(text);
        setMessage({ type: "success", text: "Content copied." });
    };
    const prepared = useMemo(() => products.map((product) => ({
        product,
        whatsapp: buildWhatsAppText(product),
        instagram: buildInstagramCaption(product),
        facebook: facebookPost(product),
        hashtags: hashtags(product),
    })), [products]);

    return <AuthGate allowedRoles="client"><DashboardShell role="client" eyebrow="Digital presence" title="Social Content" description="Use ready-to-review product copy for your digital channels.">
        <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
        <section className="dashboard-panel p-5">
            <SectionHeading title="Generated product content" description="ORVA prepares clear draft copy. Review it before posting." action={products.length ? <button type="button" className="btn-secondary" onClick={() => downloadCsv(products)}><Download className="h-4 w-4" />Download CSV</button> : null} />
            {loading ? <div className="flex items-center gap-2 py-8 text-sm text-[var(--mid)]"><Loader2 className="h-4 w-4 animate-spin" />Preparing content...</div> : !prepared.length && !outputs.length ? <EmptyState title="No products to prepare" description="Add products first, then ORVA will prepare channel-ready content." action={<Link href="/dashboard/products/new" className="btn-primary mt-6 inline-flex">Add product</Link>} /> : <div className="grid gap-4">
                {outputs.length ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-900">Fresh update posts</p>
                    <p className="mt-1 text-xs text-blue-800">Generated automatically from product changes. Review before publishing if auto-publish is off.</p>
                </div> : null}
                {outputs.map((output) => <article key={output.id} className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-bold">{output.facebook_title || output.whatsapp_title || "Product update"}</p>
                            <p className="text-xs text-[var(--muted)]">{formatStableDateTime(output.updated_at || output.created_at)}</p>
                        </div>
                        <span className="dashboard-badge badge-blue">{output.status || "draft"}</span>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {[["WhatsApp update", output.whatsapp_description], ["Instagram update", `${output.instagram_caption || ""}\n${output.instagram_hashtags || ""}`.trim()], ["Facebook update", output.facebook_description]].map(([label, text]) => text ? <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><button type="button" className="text-[var(--accent)]" aria-label={`Copy ${label}`} onClick={() => copy(text)}><Copy className="h-4 w-4" /></button></div><p className="mt-3 whitespace-pre-line text-xs leading-5 text-[var(--mid)]">{text}</p></div> : null)}
                    </div>
                </article>)}
                {prepared.map(({ product, whatsapp, instagram, facebook, hashtags: tagText }) => <article key={product.id} className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-4">
                <div className="flex items-center gap-3">{product.image_url ? <div className="h-14 w-14 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }} /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)]"><ImageIcon className="h-5 w-5" /></div>}<div><p className="font-bold">{productName(product)}</p><p className="text-xs text-[var(--muted)]">{productCode(product) || "No product code"}</p></div></div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {[["WhatsApp description", whatsapp], ["Instagram caption", `${instagram}\n${tagText}`], ["Facebook post", facebook]].map(([label, text]) => <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><button type="button" className="text-[var(--accent)]" aria-label={`Copy ${label}`} onClick={() => copy(text)}><Copy className="h-4 w-4" /></button></div><p className="mt-3 whitespace-pre-line text-xs leading-5 text-[var(--mid)]">{text}</p></div>)}
                </div>
            </article>)}</div>}
        </section>
    </DashboardShell></AuthGate>;
}
