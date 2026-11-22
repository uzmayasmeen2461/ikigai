"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Send } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";

const destinations = {
    facebook: { label: "Facebook", path: "/api/facebook/page/publish-product" },
    instagram: { label: "Instagram", path: "/api/instagram/publish-product" },
};
const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-800 px-5 font-bold text-white hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-700";
const field = "w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";

async function request(path, options = {}) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Sign in again to continue.");
    const response = await fetch(path, {
        ...options,
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || "The request failed."), { status: response.status });
    return result;
}

function readPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read this photo."));
        reader.readAsDataURL(file);
    });
}

export default function QuickPostPage() {
    const [photo, setPhoto] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [caption, setCaption] = useState("");
    const [review, setReview] = useState(false);
    const [accounts, setAccounts] = useState(null);
    const [selected, setSelected] = useState([]);
    const [results, setResults] = useState({});
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const productId = useRef(null);
    const operation = useRef(false);
    const heading = useRef(null);
    const destinationsLocked = Object.keys(results).length > 0;

    useEffect(() => {
        let active = true;
        request("/api/connections").then((data) => {
            if (!active) return;
            const connected = (data.connections || []).filter((item) => item.status === "connected" && Object.hasOwn(destinations, item.channel));
            setAccounts(connected);
            setSelected(connected.map((item) => item.channel));
        }).catch(() => {
            if (active) setError("Could not load connected accounts. Reload the page to try again.");
        });
        return () => { active = false; };
    }, []);

    useEffect(() => { heading.current?.focus(); }, [review]);

    async function choosePhoto(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = "";
        setError("");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setError("Choose a JPG, PNG, or WebP photo under 2 MB.");
            return;
        }
        setBusy("Reading photo…");
        try {
            setPhoto(await readPhoto(file));
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy("");
        }
    }

    async function publish(channels) {
        if (operation.current || !channels.length) return;
        operation.current = true;
        setError("");
        try {
            if (!productId.current) {
                setBusy("Uploading photo and saving product…");
                const data = await request("/api/inventory", {
                    method: "POST",
                    body: JSON.stringify({ product_name: name.trim(), price: Number(price), stock: 1, image_url: photo }),
                });
                productId.current = data.products?.[0]?.id;
                if (!productId.current) throw new Error("Could not confirm the product was saved. Check Products before trying again.");
            }
            for (const channel of channels) {
                setBusy(`Publishing to ${destinations[channel].label}…`);
                try {
                    const data = await request(destinations[channel].path, {
                        method: "POST",
                        body: JSON.stringify({ productId: productId.current, caption: caption.trim() }),
                    });
                    setResults((current) => ({ ...current, [channel]: { ok: true, message: data.warning || "Published" } }));
                } catch (failure) {
                    const retry = [400, 401, 403, 404].includes(failure.status);
                    setResults((current) => ({ ...current, [channel]: {
                        retry, message: retry ? failure.message : "Could not confirm publication. Check your account before posting again.",
                    } }));
                }
            }
        } catch (failure) {
            setError(failure.message || "Could not save your product.");
        } finally {
            setBusy("");
            operation.current = false;
        }
    }

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" title="Create a post">
                <form className="mx-auto grid max-w-5xl gap-5 rounded-lg border border-slate-300 bg-white p-4 text-slate-950 sm:p-6" onSubmit={(event) => {
                    event.preventDefault();
                    if (review || !photo || !name.trim() || Number(price) <= 0) return;
                    if (!caption.trim()) setCaption(`${name.trim()} is available for ₹${price}. Message us to order!`);
                    setError("");
                    setReview(true);
                }}>
                    <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">{review ? "2. Review and publish" : "1. Add a product photo"}</h2>
                    <div className="grid items-start gap-5 md:grid-cols-2">
                        <div className="grid gap-2">
                            {photo && (
                                // Local data URL, shown before anything is uploaded.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photo} alt="Post preview" className="aspect-square w-full rounded-lg border border-slate-300 bg-slate-50 object-contain motion-safe:animate-[orva-post-in_180ms_ease-out]" />
                            )}
                            {!review && <label className={`${primary} relative cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-800`}>
                                <Camera className="h-5 w-5" /> {photo ? "Change photo" : "Choose photo"}
                                <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={choosePhoto} />
                            </label>}
                        </div>
                        <div key={review ? "review" : "upload"} className="grid gap-4 motion-safe:animate-[orva-post-in_180ms_ease-out]">
                            {review ? <>
                                <label className="grid gap-1 font-semibold">Caption<textarea rows={4} className={field} value={caption} onChange={(event) => setCaption(event.target.value)} disabled={Boolean(busy) || destinationsLocked} /></label>
                                <fieldset className="grid gap-2" disabled={Boolean(busy) || destinationsLocked}>
                                    <legend className="mb-2 font-semibold">Post to</legend>
                                    {accounts?.map(({ channel, external_account_name }) => (
                                        <label key={channel} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-400 px-3 py-2">
                                            <input type="checkbox" className="h-5 w-5 shrink-0 accent-blue-800" checked={selected.includes(channel)} onChange={(event) => setSelected(event.target.checked ? [...selected, channel] : selected.filter((item) => item !== channel))} />
                                            <span className="min-w-0 break-words"><strong>{destinations[channel].label}</strong>{external_account_name && <span className="block text-sm text-slate-700">{external_account_name}</span>}</span>
                                        </label>
                                    ))}
                                </fieldset>
                                {!accounts && !error && <p role="status">Loading connected accounts…</p>}
                                {accounts?.length === 0 && <Link href="/dashboard/connections" target="_blank" className="font-semibold text-blue-800 underline">Connect Facebook or Instagram (opens a new tab)</Link>}
                                {Object.entries(results).map(([channel, result]) => (
                                    <div key={channel} className={`rounded-lg border p-3 ${result.ok ? "border-green-700 bg-green-50 text-green-950" : "border-red-700 bg-red-50 text-red-950"}`}>
                                        <p>{result.ok && <Check className="mr-1 inline h-4 w-4" />}<strong>{destinations[channel].label}:</strong> {result.message}</p>
                                        {result.retry && <button type="button" className="mt-2 min-h-11 font-bold underline" disabled={Boolean(busy)} onClick={() => publish([channel])}>Retry {destinations[channel].label}</button>}
                                    </div>
                                ))}
                                {!destinationsLocked && <div className="flex flex-wrap gap-3">
                                    <button type="button" className={`${primary} w-full sm:w-auto`} disabled={Boolean(busy) || !selected.length || !caption.trim()} onClick={() => publish(selected)}><Send className="h-4 w-4" /> Publish now</button>
                                    <button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-500 px-4 font-bold" disabled={Boolean(busy) || Boolean(productId.current)} onClick={() => setReview(false)}><ArrowLeft className="h-4 w-4" /> Back</button>
                                </div>}
                            </> : <>
                                <label className="grid gap-1 font-semibold">Product name<input className={field} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
                                <label className="grid gap-1 font-semibold">Price (₹)<input className={field} required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
                                <button type="submit" className={primary} disabled={Boolean(busy) || !photo || !name.trim() || Number(price) <= 0}>Review post</button>
                            </>}
                        </div>
                    </div>
                    <p role="status" aria-live="polite" className={busy ? "font-semibold text-blue-900" : "sr-only"}>{busy}</p>
                    {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-red-950">{error}</p>}
                </form>
            </DashboardShell>
        </AuthGate>
    );
}
