"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading } from "../DashboardUI";

const emptyForm = {
    source_image_url: "",
    product_name: "",
    category: "",
    price: "",
    stock: "1",
    product_code: "",
    notes: "",
};

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: "The server returned an invalid response." };
    }
}

export function InventoryConverterTool() {
    const taskId = useSearchParams().get("taskId");
    const [loading, setLoading] = useState(true);
    const [task, setTask] = useState(null);
    const [batch, setBatch] = useState(null);
    const [items, setItems] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [saving, setSaving] = useState(false);

    const token = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);

    const load = useCallback(async () => {
        if (!taskId) return;
        setLoading(true);
        const authToken = await token();
        const response = await fetch(`/api/inventory/conversion/${taskId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });
        const result = await readJsonResponse(response);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not open converter." });
            setLoading(false);
            return;
        }
        setTask(result.task);
        setBatch(result.batch);
        setItems(result.items || []);
        const firstPhoto = result.batch?.photos?.[0]?.url || "";
        setSelectedPhoto((current) => current || firstPhoto);
        setForm((current) => ({ ...current, source_image_url: current.source_image_url || firstPhoto }));
        setLoading(false);
    }, [taskId, token]);

    useEffect(() => {
        if (!taskId) {
            queueMicrotask(() => {
                setMessage({ type: "error", text: "Open this tool from an assigned paid inventory conversion task." });
                setLoading(false);
            });
            return;
        }
        queueMicrotask(load);
    }, [load, taskId]);

    const selectPhoto = (url) => {
        setSelectedPhoto(url);
        setForm((current) => ({ ...current, source_image_url: url }));
    };

    const saveRow = async () => {
        setSaving(true);
        setMessage({ type: "", text: "" });
        const authToken = await token();
        const response = await fetch(`/api/inventory/conversion/${taskId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify(form),
        });
        const result = await readJsonResponse(response);
        setSaving(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not save product row." });
            return;
        }
        setItems((current) => [result.item, ...current]);
        setForm({ ...emptyForm, source_image_url: selectedPhoto });
        setMessage({ type: "success", text: "Product row saved as draft." });
    };

    const submit = async () => {
        setSaving(true);
        const authToken = await token();
        const response = await fetch(`/api/inventory/conversion/${taskId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ action: "submit", notes: "Inventory rows submitted for admin review." }),
        });
        const result = await readJsonResponse(response);
        setSaving(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not submit inventory." });
            return;
        }
        setMessage({ type: "success", text: "Inventory submitted for review." });
        load();
    };

    return (
        <AuthGate allowedRoles="partner">
            <DashboardShell role="partner" eyebrow="Internal Tool" title="Inventory Converter" description="Turn client photos into product rows for review.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : !task ? (
                    <EmptyState title="Tool locked" description="Open this from an assigned paid inventory conversion task." />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[260px_1fr_380px]">
                        <section className="dashboard-panel p-4">
                            <SectionHeading title="Photos" description="Pick a source image." />
                            <div className="grid gap-3">
                                {(batch?.photos || []).map((photo, index) => (
                                    <button key={`${photo.name}-${index}`} onClick={() => selectPhoto(photo.url)} className={`aspect-square rounded-xl border bg-cover bg-center ${selectedPhoto === photo.url ? "border-[var(--accent)] ring-4 ring-[rgba(27,79,216,0.12)]" : "border-[var(--border)]"}`} style={{ backgroundImage: `url(${photo.url})` }} />
                                ))}
                            </div>
                        </section>
                        <section className="dashboard-panel p-5">
                            <SectionHeading title="Selected Photo" description="Use the form to create product rows from this image." />
                            {selectedPhoto ? <div className="min-h-[420px] rounded-xl border border-[var(--border)] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${selectedPhoto})` }} /> : <EmptyState title="No photo selected" description="Choose one photo from the left." />}
                        </section>
                        <section className="dashboard-panel p-5">
                            <SectionHeading title="Product Row" description="Save one product at a time." />
                            <div className="grid gap-3">
                                {["product_name", "category", "price", "stock", "product_code", "notes"].map((field) => (
                                    <input key={field} className="form-field" value={form[field] || ""} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={field.replace(/_/g, " ")} />
                                ))}
                                <button className="btn-primary" disabled={saving} onClick={saveRow}>{saving ? "Saving..." : "Save Product Row"}</button>
                                <button className="btn-secondary" disabled={saving || !items.length} onClick={submit}>Submit Inventory For Review</button>
                            </div>
                            <div className="mt-6 grid gap-2">
                                {items.map((item) => <div key={item.id} className="rounded-xl border border-[var(--border)] bg-white p-3 text-sm"><b>{item.product_name}</b><br />{item.category || "No category"} · ₹{item.price || 0} · Stock {item.stock || 0}</div>)}
                            </div>
                        </section>
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
