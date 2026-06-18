"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Copy,
    Download,
    FileText,
    Film,
    ImageIcon,
    PackageCheck,
    PackagePlus,
    Plus,
    ReceiptText,
    Search,
    Send,
    Save,
    Sparkles,
    Trash2,
    Upload,
} from "lucide-react";
import { formatINR } from "../../app/lib/pricing";
import { formatStableDateTime } from "../../app/lib/stableDate";
import {
    buildBillWhatsAppText,
    inventoryStatusLabels,
    productCode,
    productName,
    productNotes,
    productStock,
    sampleInventoryCsv,
} from "../../app/lib/inventory";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import {
    EmptyState,
    ErrorState,
    FeedbackMessage,
    SectionHeading,
    StatCard,
} from "../DashboardUI";

const statusClasses = {
    in_stock: "badge-green",
    low_stock: "badge-warn",
    out_of_stock: "badge-red",
    hidden: "badge-gray",
};

const emptyForm = {
    product_name: "",
    product_code: "",
    category: "",
    price: "",
    stock: "0",
    notes: "",
    image_url: "",
    status: "in_stock",
    reel_video_url: "",
    reel_thumbnail_url: "",
    reel_hook: "",
    reel_caption: "",
    reel_hashtags: "",
    reel_cta: "",
    reel_status: "not_created",
};

function StatusBadge({ status }) {
    return (
        <span className={`dashboard-badge ${statusClasses[status] || statusClasses.in_stock}`}>
            {inventoryStatusLabels[status] || "In stock"}
        </span>
    );
}

function downloadText(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }
    return false;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(file);
    });
}

function reelCaptionText(product = {}) {
    const fallbackName = productName(product);
    const fallbackPrice = formatINR(product.price || 0);
    return [
        product.reel_hook || "New arrival for you ✨",
        product.reel_caption || `${fallbackName} is now available at ${fallbackPrice}.\nPerfect choice for your daily needs.\nMessage us to order or visit our store today.`,
        product.reel_cta || "DM to order",
        product.reel_hashtags || "#ShopLocal #SmallBusiness #NewArrival #ORVA",
    ].filter(Boolean).join("\n\n");
}

function syncFeedback(result, fallbackText) {
    const warning = result?.update_task_warning;
    if (warning) return { type: "error", text: `${fallbackText}. ${warning}` };

    const dynamicSync = Array.isArray(result?.dynamic_sync) ? result.dynamic_sync : [result?.dynamic_sync].filter(Boolean);
    const channels = dynamicSync.reduce((all, item) => ({ ...all, ...(item?.channels || {}) }), {});
    const synced = Object.entries(channels)
        .filter(([, value]) => value?.ok)
        .map(([channel]) => channel.replaceAll("_", " "));
    const failed = Object.entries(channels)
        .filter(([, value]) => value && !value.ok)
        .map(([channel]) => channel.replaceAll("_", " "));

    if (synced.length || failed.length) {
        const successText = synced.length ? `Synced: ${synced.join(", ")}.` : "";
        const failedText = failed.length ? ` Needs review: ${failed.join(", ")}.` : "";
        return {
            type: failed.length ? "error" : "success",
            text: `${fallbackText}. Social update draft generated. ${successText}${failedText}`.trim(),
        };
    }

    return { type: "success", text: `${fallbackText}. Channel update tasks created.` };
}

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error: response.ok
                ? "The server returned an invalid response."
                : "The server returned an invalid error response. Check the terminal for details.",
        };
    }
}

function parseCsvLine(line) {
    const values = [];
    let current = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];
        if (char === '"' && quoted && next === '"') {
            current += '"';
            index += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            values.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

function parseInventoryCsv(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    return lines.slice(1).map((line, index) => {
        const values = parseCsvLine(line);
        const row = { row_number: index + 2 };
        headers.forEach((header, valueIndex) => {
            row[header] = values[valueIndex] || "";
        });
        return {
            row_number: row.row_number,
            product_name: row["Product Name"] || row.product_name || row.Name || "",
            category: row.Category || row.category || "",
            price: row.Price || row.price || "0",
            stock: row.Stock || row.stock || "0",
            product_code: row["Product Code"] || row.product_code || row.SKU || "",
            notes: row.Notes || row.notes || "",
        };
    });
}

function ProductImage({ product }) {
    if (!product.image_url) {
        return (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <ImageIcon className="h-5 w-5" />
            </div>
        );
    }

    return (
        <div
            aria-label={productName(product)}
            className="h-14 w-14 shrink-0 rounded-xl border border-[var(--border)] bg-cover bg-center"
            style={{ backgroundImage: `url(${product.image_url})` }}
        />
    );
}

function useSessionToken() {
    return useCallback(async function getToken() {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);
}

export function InventoryDashboard({ admin = false }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const [savingId, setSavingId] = useState("");
    const [pendingDeleteId, setPendingDeleteId] = useState("");
    const [stockDrafts, setStockDrafts] = useState({});
    const [priceDrafts, setPriceDrafts] = useState({});
    const getToken = useSessionToken();

    const stats = useMemo(() => [
        { label: "Total Products", value: products.length, icon: PackageCheck, accent: "bg-[var(--accent)]" },
        { label: "In Stock", value: products.filter((product) => product.status === "in_stock").length, icon: PackagePlus, accent: "bg-emerald-500" },
        { label: "Low Stock", value: products.filter((product) => product.status === "low_stock").length, icon: AlertTriangle, accent: "bg-amber-500" },
        { label: "Out of Stock", value: products.filter((product) => product.status === "out_of_stock").length, icon: AlertTriangle, accent: "bg-red-500" },
    ], [products]);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError("");
        const token = await getToken();
        const response = await fetch("/api/inventory", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJsonResponse(response);
        if (!response.ok) {
            setProducts([]);
            setError(result.error || "Could not load inventory.");
            setLoading(false);
            return;
        }
        setProducts(result.products || []);
        setLoading(false);
    }, [getToken]);

    useEffect(() => {
        queueMicrotask(loadProducts);
    }, [loadProducts]);

    const patchProduct = async (product, body, successText) => {
        if (!product?.id) {
            setMessage({ type: "error", text: "This product is missing its database id. Refresh inventory and try again." });
            return;
        }

        setSavingId(`${product.id}-${body.action || "update"}`);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch(`/api/inventory/${product.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const result = await readJsonResponse(response);
        setSavingId("");
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not update product." });
            return;
        }
        setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
        if (body.action === "add_stock") {
            setStockDrafts((current) => ({ ...current, [product.id]: "" }));
        }
        if ("price" in body) {
            setPriceDrafts((current) => ({ ...current, [product.id]: "" }));
        }
        setMessage(syncFeedback(result, successText));
    };

    const deleteProduct = async (product) => {
        if (!product?.id) {
            setMessage({ type: "error", text: "This product is missing its database id. Refresh inventory and try again." });
            return;
        }

        if (pendingDeleteId !== product.id) {
            setPendingDeleteId(product.id);
            setMessage({ type: "error", text: `Click Confirm Delete to remove ${productName(product)}.` });
            return;
        }

        setSavingId(`${product.id}-delete`);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch(`/api/inventory/${product.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJsonResponse(response);
        setSavingId("");
        setPendingDeleteId("");
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not delete product." });
            return;
        }
        setProducts((current) => current.filter((item) => item.id !== product.id));
        setMessage({ type: "success", text: "Product deleted." });
    };

    return (
        <AuthGate allowedRoles={admin ? "admin" : "client"}>
            <DashboardShell
                role={admin ? "admin" : "client"}
                eyebrow={admin ? "Admin" : "Inventory"}
                title={admin ? "Inventory Overview" : "Inventory"}
                description={admin ? "View and manage client product lists." : "Update your products once. ORVA keeps your catalog ready."}
            >
                <section className="mb-8">
                    <div className="mb-5 flex flex-wrap gap-3">
                        {!admin ? <Link href="/dashboard/inventory/new" className="btn-primary"><Plus className="mr-2 h-4 w-4" />Add Product</Link> : null}
                        {!admin ? <Link href="/dashboard/inventory/onboarding" className="btn-secondary"><Sparkles className="mr-2 h-4 w-4" />Inventory Onboarding</Link> : null}
                        {!admin ? <Link href="/dashboard/inventory/upload" className="btn-secondary"><Upload className="mr-2 h-4 w-4" />Upload Excel/CSV</Link> : null}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {stats.map((card) => <StatCard key={card.label} {...card} />)}
                    </div>
                    <FeedbackMessage type={message.type} className="mt-5">{message.text}</FeedbackMessage>
                </section>

                <section className="dashboard-panel p-6">
                    <SectionHeading title="Products" description={admin ? "All client products visible to admin." : "Stock, price, sold status, and product details."} />
                    {loading ? (
                        <div className="grid gap-3">
                            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[var(--surface)]" />)}
                        </div>
                    ) : error ? (
                        <ErrorState title="Could not load inventory" message={error} onRetry={loadProducts} />
                    ) : products.length === 0 ? (
                        <EmptyState
                            title="No products yet"
                            description="Add your first product, upload a sheet, or load demo inventory."
                            action={!admin ? (
                                <div className="mt-6 flex flex-wrap justify-center gap-3">
                                    <Link href="/dashboard/inventory/new" className="btn-primary inline-flex">Add Product</Link>
                                    <Link href="/dashboard/inventory/onboarding" className="btn-secondary inline-flex">Start Onboarding</Link>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={async () => {
                                            setMessage({ type: "", text: "" });
                                            const token = await getToken();
                                            const response = await fetch("/api/inventory/demo", {
                                                method: "POST",
                                                headers: { Authorization: `Bearer ${token}` },
                                            });
                                            const result = await readJsonResponse(response);
                                            if (!response.ok) {
                                                setMessage({ type: "error", text: result.error || "Could not load demo inventory." });
                                                return;
                                            }
                                            setProducts(result.products || []);
                                            setMessage({ type: "success", text: "Demo inventory loaded." });
                                        }}
                                    >
                                        Load Demo Inventory
                                    </button>
                                </div>
                            ) : null}
                        />
                    ) : (
                        <div className="grid gap-4">
                            {products.map((product) => (
                                <article key={product.id} className="interactive-tile grid gap-4 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm lg:grid-cols-[auto_1fr_auto] lg:items-center">
                                    <ProductImage product={product} />
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-[var(--ink)]">{productName(product)}</h3>
                                            <StatusBadge status={product.status} />
                                        </div>
                                        <p className="mt-1 text-sm text-[var(--mid)]">
                                            {productCode(product) || "No code"} · {product.category || "No category"} · Stock {productStock(product)}
                                        </p>
                                        <p className="mt-1 font-semibold text-[var(--ink)]">{formatINR(product.price || 0)}</p>
                                        {productNotes(product) ? <p className="mt-1 text-sm text-[var(--mid)]">{productNotes(product)}</p> : null}
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={savingId === `${product.id}-mark_sold`} onClick={() => patchProduct(product, { action: "mark_sold" }, "Stock updated")}>Mark Sold</button>
                                            <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => patchProduct(product, { action: "add_stock", quantity: 1 }, "Stock added")}>+1</button>
                                            <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => patchProduct(product, { action: "add_stock", quantity: 5 }, "Stock added")}>+5</button>
                                            <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => patchProduct(product, { action: "mark_out_of_stock" }, "Marked out of stock")}>Out of Stock</button>
                                            {!admin ? <Link href={`/dashboard/inventory/${product.id}`} className="btn-primary px-3 py-2 text-sm">Edit Product</Link> : null}
                                            {!admin ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={`btn-secondary px-3 py-2 text-sm ${pendingDeleteId === product.id ? "border-red-200 bg-red-50 text-red-700" : ""}`}
                                                        disabled={savingId === `${product.id}-delete`}
                                                        onClick={() => deleteProduct(product)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {pendingDeleteId === product.id ? "Confirm Delete" : "Delete"}
                                                    </button>
                                                    {pendingDeleteId === product.id ? (
                                                        <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => setPendingDeleteId("")}>Cancel</button>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="flex gap-2">
                                                <input
                                                    className="form-field px-3 py-2 text-sm"
                                                    value={stockDrafts[product.id] || ""}
                                                    onChange={(event) => setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))}
                                                    placeholder="Custom stock"
                                                    inputMode="numeric"
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-secondary px-3 py-2 text-sm"
                                                    onClick={() => patchProduct(product, { action: "add_stock", quantity: stockDrafts[product.id] || 1 }, "Stock added")}
                                                >
                                                    Add Stock
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    className="form-field px-3 py-2 text-sm"
                                                    value={priceDrafts[product.id] || ""}
                                                    onChange={(event) => setPriceDrafts((current) => ({ ...current, [product.id]: event.target.value }))}
                                                    placeholder="New price"
                                                    inputMode="numeric"
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-secondary px-3 py-2 text-sm"
                                                    onClick={() => patchProduct(product, { price: priceDrafts[product.id] || product.price, note: "Price changed from inventory dashboard." }, "Price updated")}
                                                >
                                                    Change Price
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}

export function InventoryUploadPage() {
    const [preview, setPreview] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [importing, setImporting] = useState(false);
    const getToken = useSessionToken();

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const rows = parseInventoryCsv(await file.text());
        const valid = rows.filter((row) => row.product_name);
        const invalid = rows.filter((row) => !row.product_name);
        setPreview(valid);
        setInvalidRows(invalid);
        setMessage({ type: "", text: "" });
        event.target.value = "";
    };

    const importRows = async () => {
        if (!preview.length) return;
        setImporting(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch("/api/inventory", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ products: preview }),
        });
        const result = await readJsonResponse(response);
        setImporting(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not import products." });
            return;
        }
        setPreview([]);
        setInvalidRows([]);
        setMessage({ type: "success", text: `${result.products?.length || 0} products imported.` });
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Inventory" title="Upload Inventory" description="Upload a simple CSV, check the preview, then import products.">
                <div className="mb-5 flex flex-wrap gap-3">
                    <Link href="/dashboard/inventory" className="btn-secondary">Back to Inventory</Link>
                    <button type="button" className="btn-secondary" onClick={() => downloadText("orva-sample-inventory.csv", sampleInventoryCsv(), "text/csv")}>
                        <Download className="mr-2 h-4 w-4" />Download Sample Inventory Sheet
                    </button>
                </div>
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <section className="dashboard-panel p-6">
                    <SectionHeading title="Upload CSV" description="Columns: Product Name, Category, Price, Stock, Product Code, Notes." />
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center transition hover:border-[var(--accent)] hover:bg-white">
                        <Upload className="h-8 w-8 text-[var(--accent)]" />
                        <span className="mt-3 text-sm font-semibold text-[var(--ink)]">Choose CSV file</span>
                        <span className="mt-1 text-xs text-[var(--mid)]">Excel files should be saved as CSV first.</span>
                        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                    </label>
                </section>
                {invalidRows.length ? (
                    <FeedbackMessage type="error" className="mt-5">{invalidRows.length} row(s) need a Product Name and were skipped.</FeedbackMessage>
                ) : null}
                {preview.length ? (
                    <section className="dashboard-panel mt-6 p-6">
                        <SectionHeading title="Preview" description={`${preview.length} products are ready to import.`} action={<button type="button" className="btn-primary" disabled={importing} onClick={importRows}>{importing ? "Importing..." : "Import Products"}</button>} />
                        <div className="grid gap-3">
                            {preview.slice(0, 10).map((row, index) => (
                                <div key={`${row.product_name}-${index}`} className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm">
                                    <p className="font-semibold text-[var(--ink)]">{row.product_name}</p>
                                    <p className="text-[var(--mid)]">{row.product_code || "Auto code"} · {row.category || "No category"} · {formatINR(row.price || 0)} · Stock {row.stock || 0}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}
            </DashboardShell>
        </AuthGate>
    );
}

export function ReelContentStudioPanel({ productId, form, setForm, setMessage }) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const getToken = useSessionToken();

    const patchProduct = async (patch) => {
        const token = await getToken();
        const response = await fetch(`/api/inventory/${productId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(patch),
        });
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result.error || "Could not save reel details.");
        if (result.product) setForm((current) => ({ ...current, ...result.product }));
        return result;
    };

    const uploadVideo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
            setMessage({ type: "error", text: "Upload an MP4, MOV, or WebM video." });
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            setMessage({ type: "error", text: "Video must be under 200MB for this MVP." });
            return;
        }

        setUploading(true);
        setProgress(20);
        setMessage({ type: "", text: "" });
        try {
            const dataUrl = await readFileAsDataUrl(file);
            setProgress(62);
            await patchProduct({ reel_video_url: dataUrl, reel_status: "draft", note: "Uploaded product reel video." });
            setProgress(100);
            setMessage({ type: "success", text: "Reel video uploaded." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not upload reel video." });
        } finally {
            setTimeout(() => setProgress(0), 900);
            setUploading(false);
        }
    };

    const generateContent = async () => {
        setGenerating(true);
        setMessage({ type: "", text: "" });
        try {
            const token = await getToken();
            const response = await fetch("/api/products/generate-reel-content", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ productId }),
            });
            const result = await readJsonResponse(response);
            if (!response.ok) throw new Error(result.error || "Could not generate reel content.");
            setForm((current) => ({ ...current, ...result.product }));
            setMessage({ type: "success", text: "Reel content generated. You can edit it before publishing." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not generate reel content." });
        } finally {
            setGenerating(false);
        }
    };

    const saveReelCopy = async () => {
        setSaving(true);
        setMessage({ type: "", text: "" });
        try {
            await patchProduct({
                reel_hook: form.reel_hook,
                reel_caption: form.reel_caption,
                reel_hashtags: form.reel_hashtags,
                reel_cta: form.reel_cta,
                reel_status: form.reel_video_url ? "ready" : "draft",
                note: "Updated reel copy.",
            });
            setMessage({ type: "success", text: "Reel copy saved." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not save reel copy." });
        } finally {
            setSaving(false);
        }
    };

    const publishReel = async () => {
        setPublishing(true);
        setMessage({ type: "", text: "" });
        try {
            const token = await getToken();
            const response = await fetch("/api/instagram/reels/test-publish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ productId, caption: reelCaptionText(form) }),
            });
            const result = await readJsonResponse(response);
            if (!response.ok) throw new Error(result.error || "Could not publish reel.");
            setForm((current) => ({ ...current, reel_status: "published" }));
            setMessage({ type: "success", text: result.message || "Instagram Reel published successfully." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not publish reel." });
        } finally {
            setPublishing(false);
        }
    };

    const updateReelField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const fullCaption = reelCaptionText(form);

    return (
        <section className="dashboard-panel mt-6 overflow-hidden">
            <div className="grid gap-5 border-b border-[var(--border)] p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                    <div className="dashboard-eyebrow"><Film className="h-3.5 w-3.5" />Reel Content Studio</div>
                    <h2 className="mt-3 text-2xl font-bold text-[var(--ink)]">Create reel content</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--mid)]">Upload a product video, generate reel-ready copy, preview it, and test publish one reel when Instagram is connected.</p>
                </div>
                <span className={`dashboard-badge ${form.reel_status === "published" ? "badge-green" : form.reel_status === "failed" ? "badge-red" : "badge-blue"}`}>
                    {String(form.reel_status || "not_created").replace(/_/g, " ")}
                </span>
            </div>
            <div className="grid gap-6 p-6 xl:grid-cols-[360px_1fr]">
                <div>
                    <div className="overflow-hidden rounded-[28px] border-[8px] border-[#101820] bg-[#0B1420] shadow-[0_24px_60px_rgba(16,32,46,0.2)]">
                        <div className="relative aspect-[9/16] bg-[#111827]">
                            {form.reel_video_url ? (
                                <video src={form.reel_video_url} className="h-full w-full object-cover" controls playsInline />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/70">
                                    <Film className="h-10 w-10" />
                                    <p className="max-w-52 text-sm font-semibold">Upload a product video to preview your reel.</p>
                                </div>
                            )}
                            <div className="pointer-events-none absolute inset-x-4 bottom-5 rounded-2xl bg-black/38 p-3 text-white backdrop-blur">
                                <p className="text-sm font-bold">{productName(form)}</p>
                                <p className="text-xs text-white/80">{formatINR(form.price || 0)} · {form.reel_cta || "DM to order"}</p>
                            </div>
                        </div>
                    </div>
                    <label className="btn-secondary mt-4 w-full cursor-pointer justify-center">
                        <Upload className="h-4 w-4" />Upload video
                        <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={uploadVideo} disabled={uploading} />
                    </label>
                    {uploading || progress ? (
                        <div className="mt-3 rounded-full bg-[var(--surface)] p-1">
                            <div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    ) : null}
                    {form.reel_video_url ? (
                        <a className="btn-secondary mt-3 w-full justify-center" href={form.reel_video_url} download target="_blank" rel="noreferrer"><Download className="h-4 w-4" />Download Video</a>
                    ) : null}
                </div>
                <div className="grid gap-4">
                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn-primary" disabled={generating} onClick={generateContent}>{generating ? "Generating..." : <><Sparkles className="h-4 w-4" />Create Reel Content</>}</button>
                        <button type="button" className="btn-secondary" onClick={() => copyText(fullCaption).then(() => setMessage({ type: "success", text: "Reel caption copied." }))}><Copy className="h-4 w-4" />Copy Caption</button>
                        <button type="button" className="btn-secondary" disabled={saving} onClick={saveReelCopy}>{saving ? "Saving..." : <><Save className="h-4 w-4" />Save Reel Copy</>}</button>
                        <button type="button" className="btn-primary" disabled={publishing || !form.reel_video_url} onClick={publishReel}>{publishing ? "Publishing..." : <><Send className="h-4 w-4" />Test Publish Reel</>}</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">Hook<input className="form-field" value={form.reel_hook || ""} onChange={(event) => updateReelField("reel_hook", event.target.value)} placeholder="New arrival for you ✨" /></label>
                        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">CTA<input className="form-field" value={form.reel_cta || ""} onChange={(event) => updateReelField("reel_cta", event.target.value)} placeholder="DM to order" /></label>
                        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)] md:col-span-2">Caption<textarea className="form-field min-h-28" value={form.reel_caption || ""} onChange={(event) => updateReelField("reel_caption", event.target.value)} placeholder={`${productName(form)} is now available...`} /></label>
                        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)] md:col-span-2">Hashtags<input className="form-field" value={form.reel_hashtags || ""} onChange={(event) => updateReelField("reel_hashtags", event.target.value)} placeholder="#ShopLocal #SmallBusiness #NewArrival #ORVA" /></label>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Caption preview</p>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--mid)]">{fullCaption}</p>
                    </div>
                    <p className="text-xs leading-5 text-[var(--muted)]">If Instagram permissions are not ready, Copy Caption and Download Video keep manual posting available.</p>
                </div>
            </div>
        </section>
    );
}

export function InventoryProductFormPage({ productId }) {
    const isEdit = Boolean(productId);
    const [form, setForm] = useState(emptyForm);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [originalForm, setOriginalForm] = useState(null);
    const [confirmPending, setConfirmPending] = useState(false);
    const getToken = useSessionToken();

    useEffect(() => {
        if (!isEdit) return;
        async function loadProduct() {
            const token = await getToken();
            const response = await fetch(`/api/inventory/${productId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await readJsonResponse(response);
            if (response.ok) {
                const nextForm = {
                    ...emptyForm,
                    ...result.product,
                    product_name: productName(result.product),
                    product_code: productCode(result.product),
                    stock: String(productStock(result.product)),
                    notes: productNotes(result.product),
                };
                setForm(nextForm);
                setOriginalForm(nextForm);
                setLogs(result.logs || []);
            } else {
                setMessage({ type: "error", text: result.error || "Could not load product." });
            }
            setLoading(false);
        }
        queueMicrotask(loadProduct);
    }, [getToken, isEdit, productId]);

    const update = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setConfirmPending(false);
    };

    const saveProduct = async (event) => {
        event.preventDefault();
        const trackedFields = ["product_name", "price", "stock", "notes", "image_url"];
        const changedFields = trackedFields.filter((field) => String(form[field] ?? "") !== String(originalForm?.[field] ?? ""));
        if (isEdit && changedFields.length && !confirmPending) {
            setConfirmPending(true);
            setMessage({ type: "success", text: "This change will create update tasks for connected channels. Review the notice below, then confirm save." });
            return;
        }
        setSaving(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch(isEdit ? `/api/inventory/${productId}` : "/api/inventory", {
            method: isEdit ? "PATCH" : "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(form),
        });
        const result = await readJsonResponse(response);
        setSaving(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not save product." });
            return;
        }
        setConfirmPending(false);
        setMessage(syncFeedback(result, isEdit ? "Product updated" : "Product added"));
        if (!isEdit) window.location.href = "/dashboard/products";
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Inventory" title={isEdit ? "Edit Product" : "Add Product"} description="Keep stock, price, and product details in one place.">
                <div className="mb-5">
                    <Link href="/dashboard/products" className="btn-secondary">Back to Products</Link>
                </div>
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {loading ? (
                    <div className="dashboard-panel p-6 text-sm text-[var(--mid)]">Loading product...</div>
                ) : (
                    <form onSubmit={saveProduct} className="dashboard-panel p-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                Product name
                                <input className="form-field" value={form.product_name} onChange={(event) => update("product_name", event.target.value)} placeholder="Black Kurti" required />
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                Product Code
                                <input className="form-field" value={form.product_code || ""} onChange={(event) => update("product_code", event.target.value)} placeholder="KUR001" />
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                Category
                                <input className="form-field" value={form.category || ""} onChange={(event) => update("category", event.target.value)} placeholder="Kurtis" />
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                Price
                                <input className="form-field" value={form.price || ""} onChange={(event) => update("price", event.target.value)} inputMode="numeric" placeholder="1299" />
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                Stock
                                <input className="form-field" value={form.stock || "0"} onChange={(event) => update("stock", event.target.value)} inputMode="numeric" />
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                Status
                                <select className="form-field" value={form.status || "in_stock"} onChange={(event) => update("status", event.target.value)}>
                                    <option value="in_stock">In stock</option>
                                    <option value="low_stock">Low stock</option>
                                    <option value="out_of_stock">Out of stock</option>
                                    <option value="hidden">Hidden</option>
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)] md:col-span-2">
                                Image URL
                                <input className="form-field" value={form.image_url || ""} onChange={(event) => update("image_url", event.target.value)} placeholder="https://..." />
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)] md:col-span-2">
                                Notes
                                <textarea className="form-field min-h-24" value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} placeholder="New arrival, trending, restock needed..." />
                            </label>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            {confirmPending ? <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800"><strong>This change will create update tasks for connected channels.</strong><br />ORVA will add the required WhatsApp, social, and online-store updates to your queue.</div> : null}
                            <button type="submit" disabled={saving} className="btn-primary ml-auto">{saving ? "Saving..." : confirmPending ? "Confirm Save" : isEdit ? "Save Product" : "Add Product"}</button>
                        </div>
                    </form>
                )}
                {isEdit ? (
                    <section className="dashboard-panel mt-6 p-6">
                        <SectionHeading title="Product history" description="Stock and price changes appear here." />
                        {logs.length === 0 ? (
                            <EmptyState title="No history yet" description="Changes will appear after stock or price updates." />
                        ) : (
                            <div className="grid gap-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <p className="font-semibold capitalize text-[var(--ink)]">{String(log.action || "update").replace(/_/g, " ")}</p>
                                            <p className="text-xs font-semibold text-[var(--muted)]">{formatStableDateTime(log.created_at)}</p>
                                        </div>
                                        <p className="mt-1 text-sm text-[var(--mid)]">
                                            Stock {log.old_stock ?? "-"} to {log.new_stock ?? "-"} · Price {formatINR(log.old_price || 0)} to {formatINR(log.new_price || 0)}
                                        </p>
                                        {log.note ? <p className="mt-1 text-sm text-[var(--mid)]">{log.note}</p> : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                ) : null}
            </DashboardShell>
        </AuthGate>
    );
}

export function BillingDashboard() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const getToken = useSessionToken();

    const loadBills = useCallback(async () => {
        setLoading(true);
        setError("");
        const token = await getToken();
        const response = await fetch("/api/billing", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJsonResponse(response);
        if (!response.ok) {
            setError(result.error || "Could not load bills.");
            setLoading(false);
            return;
        }
        setBills(result.bills || []);
        setLoading(false);
    }, [getToken]);

    useEffect(() => {
        queueMicrotask(loadBills);
    }, [loadBills]);

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Billing" title="Billing" description="Create simple bills and share them on WhatsApp.">
                <section className="mb-6 flex flex-wrap gap-3">
                    <Link href="/dashboard/billing/new" className="btn-primary"><ReceiptText className="mr-2 h-4 w-4" />Create Bill</Link>
                    <Link href="/dashboard/inventory" className="btn-secondary">Manage Products</Link>
                </section>
                <section className="dashboard-panel p-6">
                    <SectionHeading title="Bills" description="Recent customer bills created from your products." />
                    {loading ? (
                        <div className="h-28 animate-pulse rounded-xl bg-[var(--surface)]" />
                    ) : error ? (
                        <ErrorState title="Could not load bills" message={error} onRetry={loadBills} />
                    ) : bills.length === 0 ? (
                        <EmptyState title="No bills yet" description="Create your first bill after adding products." action={<Link href="/dashboard/billing/new" className="btn-primary mt-6 inline-flex">Create Bill</Link>} />
                    ) : (
                        <div className="grid gap-3">
                            {bills.map((bill) => (
                                <article key={bill.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-[var(--ink)]">{bill.bill_number}</p>
                                            <p className="text-sm text-[var(--mid)]">{bill.customer_name || "Walk-in customer"} · {bill.items?.length || 0} item(s)</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-[var(--ink)]">{formatINR(bill.total_amount || 0)}</p>
                                            <span className="dashboard-badge badge-warn">{bill.payment_status || "unpaid"}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}

export function BillingNewPage() {
    const [products, setProducts] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [items, setItems] = useState([]);
    const [customer, setCustomer] = useState({ customer_name: "", customer_phone: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [bill, setBill] = useState(null);
    const [search, setSearch] = useState("");
    const getToken = useSessionToken();

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const availableProducts = products.filter((product) => product.status !== "hidden" && productStock(product) > 0);
    const filteredProducts = availableProducts.filter((product) => {
        const term = search.toLowerCase();
        return !term || productName(product).toLowerCase().includes(term) || productCode(product).toLowerCase().includes(term);
    });

    useEffect(() => {
        async function loadProducts() {
            const token = await getToken();
            const response = await fetch("/api/inventory", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await readJsonResponse(response);
            if (response.ok) setProducts(result.products || []);
            else setMessage({ type: "error", text: result.error || "Could not load products." });
            setLoading(false);
        }
        queueMicrotask(loadProducts);
    }, [getToken]);

    const addItem = () => {
        const product = products.find((item) => item.id === selectedId);
        if (!product) return;
        const count = Math.max(1, Number.parseInt(quantity || "1", 10));
        const alreadyAdded = items.find((item) => item.product_id === product.id)?.quantity || 0;
        if (productStock(product) < alreadyAdded + count) {
            setMessage({ type: "error", text: `${productName(product)} has only ${productStock(product)} in stock.` });
            return;
        }
        setItems((current) => {
            const existing = current.find((item) => item.product_id === product.id);
            if (existing) {
                return current.map((item) => item.product_id === product.id ? { ...item, quantity: item.quantity + count } : item);
            }
            return [
                ...current,
                {
                    product_id: product.id,
                    product_name: productName(product),
                    product_code: productCode(product),
                    quantity: count,
                    price: Number(product.price || 0),
                },
            ];
        });
        setSelectedId("");
        setQuantity("1");
        setMessage({ type: "", text: "" });
    };

    const createBill = async () => {
        if (!items.length) {
            setMessage({ type: "error", text: "Add at least one product." });
            return;
        }
        setSaving(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch("/api/billing", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                ...customer,
                items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
            }),
        });
        const result = await readJsonResponse(response);
        setSaving(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not create bill." });
            return;
        }
        setBill(result.bill);
        setItems([]);
        setMessage({ type: "success", text: "Bill created and stock updated." });
    };

    const shareBill = async () => {
        const text = buildBillWhatsAppText(bill, bill?.items || []);
        const copied = await copyText(text);
        setMessage({ type: "success", text: copied ? "Bill text copied for WhatsApp." : text });
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Billing" title="Create Bill" description="Select products, add quantity, and share a simple bill.">
                <div className="mb-5 flex flex-wrap gap-3">
                    <Link href="/dashboard/billing" className="btn-secondary">Back to Billing</Link>
                    <Link href="/dashboard/inventory/new" className="btn-secondary">Add Product</Link>
                </div>
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                    <section className="dashboard-panel p-6">
                        <SectionHeading title="Products" description="Search and add products to the bill." />
                        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                            <label className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                                <input className="form-field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
                            </label>
                            <select className="form-field" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                                <option value="">Select product</option>
                                {filteredProducts.map((product) => (
                                    <option key={product.id} value={product.id}>{productName(product)} · Stock {productStock(product)}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <input className="form-field w-24" value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" />
                                <button type="button" className="btn-primary" onClick={addItem}>Add</button>
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-24 animate-pulse rounded-xl bg-[var(--surface)]" />
                        ) : products.length === 0 ? (
                            <EmptyState title="No products yet" description="Add products first, then create a bill." action={<Link href="/dashboard/inventory/new" className="btn-primary mt-6 inline-flex">Add Product</Link>} />
                        ) : availableProducts.length === 0 ? (
                            <EmptyState title="No available products" description="Add stock to products before creating a bill." action={<Link href="/dashboard/inventory" className="btn-primary mt-6 inline-flex">Go to Inventory</Link>} />
                        ) : (
                            <div className="grid gap-3">
                                <div>
                                    <p className="mb-3 text-sm font-semibold text-[var(--ink)]">Available products</p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {filteredProducts.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                className={`interactive-tile rounded-xl border p-4 text-left transition ${selectedId === product.id ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-white"}`}
                                                onClick={() => setSelectedId(product.id)}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-[var(--ink)]">{productName(product)}</p>
                                                        <p className="mt-1 text-sm text-[var(--mid)]">{productCode(product) || "No code"} · Stock {productStock(product)}</p>
                                                    </div>
                                                    <p className="font-bold text-[var(--ink)]">{formatINR(product.price || 0)}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {!filteredProducts.length ? (
                                        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--mid)]">No matching available products.</div>
                                    ) : null}
                                </div>
                                {items.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--mid)]">Added products will appear here.</div>
                                ) : items.map((item) => (
                                    <div key={item.product_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-[var(--ink)]">{item.product_name}</p>
                                            <p className="text-sm text-[var(--mid)]">{item.product_code || "No code"} · Qty {item.quantity} · {formatINR(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-bold text-[var(--ink)]">{formatINR(item.price * item.quantity)}</p>
                                            <button type="button" className="text-sm font-semibold text-[var(--danger)]" onClick={() => setItems((current) => current.filter((entry) => entry.product_id !== item.product_id))}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    <aside className="dashboard-panel h-fit p-6">
                        <SectionHeading title="Bill Details" description="Customer details are optional." />
                        <div className="grid gap-3">
                            <input className="form-field" value={customer.customer_name} onChange={(event) => setCustomer((current) => ({ ...current, customer_name: event.target.value }))} placeholder="Customer name" />
                            <input className="form-field" value={customer.customer_phone} onChange={(event) => setCustomer((current) => ({ ...current, customer_phone: event.target.value }))} placeholder="Customer phone" />
                        </div>
                        <div className="my-5 rounded-xl bg-[var(--surface)] p-4">
                            <p className="text-sm text-[var(--mid)]">Total</p>
                            <p className="text-3xl font-bold text-[var(--ink)]">{formatINR(total)}</p>
                        </div>
                        <button type="button" className="btn-primary w-full justify-center" disabled={saving || !items.length} onClick={createBill}>
                            {saving ? "Creating..." : "Create Bill"}
                        </button>
                        {bill ? (
                            <div className="mt-5 rounded-xl border border-[var(--border)] bg-white p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                                    <FileText className="h-4 w-4 text-[var(--accent)]" />
                                    {bill.bill_number}
                                </div>
                                <p className="mt-2 text-sm text-[var(--mid)]">Total {formatINR(bill.total_amount || 0)}</p>
                                <button type="button" className="btn-secondary mt-4 w-full justify-center" onClick={shareBill}>
                                    <Copy className="mr-2 h-4 w-4" />Share Bill Text for WhatsApp
                                </button>
                            </div>
                        ) : null}
                    </aside>
                </div>
            </DashboardShell>
        </AuthGate>
    );
}
