"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Camera, Check, Send } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";

const destinations = {
    facebook: { label: "Facebook" },
    instagram: { label: "Instagram" },
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

async function readPhoto(file) {
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.8);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export default function QuickPostPage() {
    const [photo, setPhoto] = useState("");
    const [caption, setCaption] = useState("");
    const [scheduling, setScheduling] = useState(false);
    const [scheduledFor, setScheduledFor] = useState("");
    const [accounts, setAccounts] = useState(null);
    const [selected, setSelected] = useState([]);
    const [results, setResults] = useState({});
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const operation = useRef(false);
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

    async function choosePhoto(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = "";
        setError("");
        if (file.size > 25 * 1024 * 1024) {
            setError("Choose a photo under 25 MB.");
            return;
        }
        setBusy("Reading photo…");
        try {
            setPhoto(await readPhoto(file));
        } catch {
            setError("Could not open this photo. Try a JPG or PNG.");
        } finally {
            setBusy("");
        }
    }

    async function publish(date = "") {
        if (operation.current || !selected.length || !photo || destinationsLocked) return;
        const timestamp = date ? new Date(date) : null;
        if (timestamp && (!Number.isFinite(timestamp.getTime()) || timestamp.getTime() <= Date.now())) {
            setError("Choose a date and time in the future.");
            return;
        }
        operation.current = true;
        setError("");
        setBusy(date ? "Scheduling post…" : "Publishing post…");
        try {
            const data = await request("/api/marketing-content/schedule", {
                method: "POST",
                body: JSON.stringify({
                    quickPost: true,
                    name: "Photo post",
                    selectedPlatforms: selected.map((channel) => `${channel}_post`),
                    posts: [{ imageUrl: photo, caption: caption.trim(), scheduledFor: timestamp?.toISOString() }],
                }),
            });
            setResults(Object.fromEntries(selected.map((channel) => {
                const item = data.items?.find((entry) => entry.content_type === `${channel}_post`);
                const ok = item?.status === "published" || (Boolean(date) && item?.status === "scheduled");
                const message = item?.status === "published" ? "Published" : ok ? "Scheduled" :
                    item?.error_message || "Check the posting queue to confirm the status.";
                return [channel, { ok, message }];
            })));
        } catch (failure) {
            setError(failure.status && failure.status < 500 ? failure.message : "Could not confirm the result. Check the posting queue before trying again.");
            if (!failure.status || failure.status >= 500) {
                setResults(Object.fromEntries(selected.map((channel) => [channel, { ok: false, message: "Status unconfirmed" }])));
            }
        } finally {
            setBusy("");
            operation.current = false;
        }
    }

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" title="Create a post">
                <section className="mx-auto grid max-w-5xl gap-5 rounded-lg border border-slate-300 bg-white p-4 text-slate-950 sm:p-6">
                    <h2 className="text-xl font-bold">{photo ? "Choose where to post" : "Add a photo"}</h2>
                    <div className="grid items-start gap-5 md:grid-cols-2">
                        <div className="grid gap-2">
                            {photo && (
                                // Local data URL, shown before anything is uploaded.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photo} alt="Post preview" className="aspect-square w-full rounded-lg border border-slate-300 bg-slate-50 object-contain motion-safe:animate-[orva-post-in_180ms_ease-out]" />
                            )}
                            {!destinationsLocked && <label className={`${primary} relative cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-800`}>
                                <Camera className="h-5 w-5" /> {photo ? "Change photo" : "Choose photo"}
                                <input type="file" className="sr-only" accept="image/*" disabled={Boolean(busy)} onChange={choosePhoto} />
                            </label>}
                        </div>
                        <div key={photo ? "review" : "upload"} className="grid gap-4 motion-safe:animate-[orva-post-in_180ms_ease-out]">
                            {photo && <>
                                <label className="grid gap-1 font-semibold">Caption (optional)<textarea rows={4} className={field} value={caption} onChange={(event) => setCaption(event.target.value)} disabled={Boolean(busy) || destinationsLocked} /></label>
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
                                    </div>
                                ))}
                                {destinationsLocked && <Link href="/dashboard?view=growth-autopilot" className="min-h-11 font-semibold text-blue-900 underline">View posting queue</Link>}
                                {!destinationsLocked && (scheduling ? <div className="grid gap-3 rounded-lg border border-slate-400 p-3">
                                    <label className="grid min-w-0 gap-1 font-semibold">Post after<input type="datetime-local" className={field} value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} disabled={Boolean(busy)} /></label>
                                    <p className="text-sm text-slate-700">Uses your device time zone. ORVA queues the post for the next publishing run after this time.</p>
                                    <button type="button" className={primary} disabled={Boolean(busy) || !selected.length || !scheduledFor} onClick={() => publish(scheduledFor)}>Confirm schedule</button>
                                    <button type="button" className="min-h-11 font-semibold text-blue-900 underline" disabled={Boolean(busy)} onClick={() => setScheduling(false)}>Back</button>
                                </div> : <div className="flex flex-wrap gap-3">
                                    <button type="button" className={`${primary} w-full sm:w-auto`} disabled={Boolean(busy) || !selected.length} onClick={() => publish()}><Send className="h-4 w-4" /> Publish now</button>
                                    <button type="button" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-blue-800 px-4 font-bold text-blue-900 disabled:border-slate-400 disabled:text-slate-700 sm:w-auto" disabled={Boolean(busy) || !selected.length} onClick={() => setScheduling(true)}><CalendarDays className="h-4 w-4" /> Schedule post</button>
                                </div>)}
                            </>}
                        </div>
                    </div>
                    <p role="status" aria-live="polite" className={busy ? "font-semibold text-blue-900" : "sr-only"}>{busy}</p>
                    {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-red-950">{error}</p>}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
