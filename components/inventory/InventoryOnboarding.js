"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Download, ImageIcon, Upload } from "lucide-react";
import { sampleInventoryCsv } from "../../app/lib/inventory";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { FeedbackMessage, SectionHeading } from "../DashboardUI";

function downloadText(filename, text, type = "text/csv") {
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
        } else if (char === '"') quoted = !quoted;
        else if (char === "," && !quoted) {
            values.push(current.trim());
            current = "";
        } else current += char;
    }
    values.push(current.trim());
    return values;
}

function parseInventoryCsv(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line, index) => {
        const cells = parseCsvLine(line);
        const row = { row_number: index + 2 };
        headers.forEach((header, cellIndex) => {
            row[header] = cells[cellIndex] || "";
        });
        const product = {
            row_number: row.row_number,
            product_name: row["Product Name"] || "",
            category: row.Category || "",
            price: row.Price || "",
            stock: row.Stock || "",
            product_code: row["Product Code"] || "",
            notes: row.Notes || "",
        };
        const errors = [];
        if (!product.product_name) errors.push("Product Name required");
        if (product.price && Number.isNaN(Number(product.price))) errors.push("Price must be numeric");
        if (product.stock && Number.isNaN(Number(product.stock))) errors.push("Stock must be numeric");
        return { ...product, errors };
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: "The server returned an invalid response." };
    }
}

export function InventoryOnboarding() {
    const [mode, setMode] = useState("");
    const [rows, setRows] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const validRows = rows.filter((row) => row.errors.length === 0);
    const photosReady = photos.length > 0 && photos.every((photo) => Number(photo.price) > 0);

    const token = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    };

    const uploadCsv = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setRows(parseInventoryCsv(await file.text()));
        setMessage({ type: "", text: "" });
    };

    const importRows = async () => {
        setSubmitting(true);
        const authToken = await token();
        const response = await fetch("/api/inventory/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ products: validRows }),
        });
        const result = await readJsonResponse(response);
        setSubmitting(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not import inventory." });
            return;
        }
        setSuccess("Your inventory is ready");
    };

    const uploadPhotos = async (event) => {
        const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
        const nextPhotos = await Promise.all(files.map(async (file) => ({
            name: file.name,
            url: await fileToDataUrl(file),
            price: "",
        })));
        setPhotos((current) => [...current, ...nextPhotos].slice(0, 20));
    };

    const submitPhotos = async () => {
        if (!photosReady) {
            setMessage({ type: "error", text: "Enter a price below every photo before submitting." });
            return;
        }
        setSubmitting(true);
        const authToken = await token();
        const response = await fetch("/api/inventory/photo-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ photos }),
        });
        const result = await readJsonResponse(response);
        setSubmitting(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not submit photos." });
            return;
        }
        const count = result.products?.length || photos.length;
        setPhotos([]);
        setSuccess(`${count} draft product${count === 1 ? "" : "s"} added to Products`);
        if (result.warning) {
            setMessage({ type: "warning", text: result.warning });
        }
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Inventory" title="Add Inventory" description="Upload a product list, or send product photos with prices and ORVA will help create the inventory.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {success ? (
                    <section className="dashboard-panel p-8 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--success-bg)] text-[var(--success)]">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h2 className="mt-5 text-3xl font-bold text-[var(--ink)]">{success}</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--mid)]">
                            Review the product names, stock, and categories in Products. ORVA also keeps a conversion task open if your team needs to clean up the photo-based inventory.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Link href="/dashboard/products" className="btn-primary">View Products</Link>
                            <Link href="/dashboard" className="btn-secondary">Go to Dashboard</Link>
                            <Link href="/dashboard/update-tasks" className="btn-secondary">Track Conversion</Link>
                        </div>
                    </section>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                        <section className="dashboard-panel p-5">
                            <SectionHeading title="Choose one" description="Start with a file, or let ORVA convert photos and prices into inventory." />
                            <div className="grid gap-3">
                                <button type="button" onClick={() => setMode("file")} className={`rounded-xl border p-4 text-left font-semibold ${mode === "file" ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] bg-white"}`}>I have an inventory file</button>
                                <button type="button" onClick={() => setMode("photos")} className={`rounded-xl border p-4 text-left font-semibold ${mode === "photos" ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] bg-white"}`}>I only have product photos and prices</button>
                            </div>
                        </section>

                        {mode === "file" ? (
                            <section className="dashboard-panel p-6">
                                <SectionHeading title="Upload Inventory" description="Upload CSV exported from Excel or Google Sheets." action={<button className="btn-secondary" onClick={() => downloadText("orva-sample-inventory.csv", sampleInventoryCsv())}><Download className="mr-2 h-4 w-4" />Download Sample Inventory Sheet</button>} />
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                                    <Upload className="h-8 w-8 text-[var(--accent)]" />
                                    <span className="mt-3 text-sm font-semibold">Upload CSV</span>
                                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={uploadCsv} />
                                </label>
                                {rows.length ? (
                                    <div className="mt-6 overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Code</th><th>Status</th></tr></thead>
                                            <tbody>{rows.map((row) => <tr key={row.row_number}><td>{row.product_name || "-"}</td><td>{row.price}</td><td>{row.stock}</td><td>{row.product_code || "Auto"}</td><td>{row.errors.length ? row.errors.join(", ") : "Valid"}</td></tr>)}</tbody>
                                        </table>
                                        <button className="btn-primary mt-5" disabled={!validRows.length || submitting} onClick={importRows}>{submitting ? "Importing..." : `Import ${validRows.length} Products`}</button>
                                    </div>
                                ) : null}
                            </section>
                        ) : null}

                        {mode === "photos" ? (
                            <section className="dashboard-panel p-6">
                                <SectionHeading title="Upload Photos + Prices" description="Add a price below each photo. ORVA can create inventory only after every product photo has a price." />
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                                    <ImageIcon className="h-8 w-8 text-[var(--accent)]" />
                                    <span className="mt-3 text-sm font-semibold">Upload Photos</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
                                </label>
                                {photos.length ? (
                                    <>
                                        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                                            {photos.map((photo, index) => {
                                                const missingPrice = !(Number(photo.price) > 0);
                                                return (
                                                    <div key={`${photo.name}-${index}`} className="rounded-xl border border-[var(--border)] bg-white p-3">
                                                        <div className="relative aspect-square overflow-hidden rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }}>
                                                            <button className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs font-semibold" onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                                                        </div>
                                                        <label className="mt-3 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                                                            Price required
                                                            <input
                                                                className={`form-field mt-2 ${missingPrice ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                                                inputMode="numeric"
                                                                value={photo.price}
                                                                onChange={(event) => setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value.replace(/[^\d.]/g, "") } : item))}
                                                                placeholder="1299"
                                                            />
                                                        </label>
                                                        {missingPrice ? <p className="mt-2 text-xs font-semibold text-red-600">Enter price to continue.</p> : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button className="btn-primary mt-5" disabled={submitting || !photosReady} onClick={submitPhotos}>{submitting ? "Submitting..." : "Submit Photos + Prices"}</button>
                                    </>
                                ) : null}
                            </section>
                        ) : null}
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
