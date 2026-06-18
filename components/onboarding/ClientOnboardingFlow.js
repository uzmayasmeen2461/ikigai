"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, FileSpreadsheet, ImageIcon, Loader2, Send, Upload } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { formatStableDate } from "../../app/lib/stableDate";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading } from "../DashboardUI";
import { AddInventoryChoice } from "../inventory/AddInventoryChoice";

const flowCards = [
    {
        flow: "inventory_ready",
        icon: FileSpreadsheet,
        title: "I have inventory list",
        subtitle: "Upload Excel/CSV and product images. ORVA will match images and generate content.",
        cta: "Choose Inventory Ready Plan",
    },
    {
        flow: "photo_to_inventory",
        icon: ImageIcon,
        title: "I only have product photos + prices",
        subtitle: "Upload product photos, add prices, and let ORVA create inventory.",
        cta: "Choose Photo-to-Inventory Plan",
    },
];

const timeline = ["submitted", "activated"];
const channels = ["WhatsApp Business", "Instagram", "Facebook Page", "None"];
const onboardingStatusLabels = {
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    payment_pending: "Submitted",
    payment_uploaded: "Submitted",
    payment_verified: "Submitted",
    activated: "Activated",
    rejected: "Rejected",
};

function amountLabel(amount = 0) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { error: "The server returned an invalid response." };
    }
}

function useToken() {
    return useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);
}

function packageForFlow(packages, flow) {
    const slug = flow === "photo_to_inventory" ? "photo-to-inventory" : "inventory-ready";
    return packages.find((item) => item.slug === slug);
}

function statusIndex(status) {
    if (["approved", "activated"].includes(status)) return 1;
    return Math.max(0, timeline.indexOf(status));
}

function StatusTimeline({ status }) {
    const current = statusIndex(status);
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {timeline.map((item, index) => {
                const done = current >= index || status === "activated";
                return (
                    <div key={item} className={`rounded-xl border p-4 ${done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[var(--border)] bg-white text-[var(--mid)]"}`}>
                        <CheckCircle2 className={`h-4 w-4 ${done ? "text-emerald-600" : "text-[var(--muted)]"}`} />
                        <p className="mt-2 text-sm font-bold">{onboardingStatusLabels[item]}</p>
                    </div>
                );
            })}
        </div>
    );
}

export function ClientOnboardingFlow({ showActiveInventory = false }) {
    const getToken = useToken();
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [application, setApplication] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [selectedFlow, setSelectedFlow] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [form, setForm] = useState({
        business_name: "",
        owner_name: "",
        phone: "",
        email: "",
        estimated_product_count: "",
        existing_channels: [],
        notes: "",
        wants_managed_service: false,
    });

    const active = Boolean(subscription);
    const selectedPackage = useMemo(() => packageForFlow(packages, selectedFlow || application?.selected_flow), [application, packages, selectedFlow]);

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const response = await fetch("/api/onboarding/application", { headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        setLoading(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not load onboarding." });
            return;
        }
        setPackages(result.packages || []);
        setApplication(result.application || null);
        setSubscription(result.subscription || null);
        if (result.application?.selected_flow) setSelectedFlow(result.application.selected_flow);
    }, [getToken]);

    useEffect(() => { queueMicrotask(load); }, [load]);

    const toggleChannel = (channel) => {
        setForm((current) => {
            const exists = current.existing_channels.includes(channel);
            return {
                ...current,
                existing_channels: exists
                    ? current.existing_channels.filter((item) => item !== channel)
                    : [...current.existing_channels, channel],
            };
        });
    };

    const submitApplication = async () => {
        setSubmitting(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch("/api/onboarding/application", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...form, selected_flow: selectedFlow }),
        });
        const result = await readJson(response);
        setSubmitting(false);
        if (!response.ok) return setMessage({ type: "error", text: result.error || "Could not submit application." });
        setApplication(result.application);
        setMessage({ type: "success", text: result.message });
    };

    if (loading) {
        return <AuthGate allowedRoles="client"><DashboardShell role="client" eyebrow="Onboarding" title="Start ORVA" description="Preparing your onboarding status."><div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div></DashboardShell></AuthGate>;
    }

    if (active && showActiveInventory) return <AddInventoryChoice />;

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Onboarding" title={active ? "ORVA is active" : "Start ORVA"} description="Choose your setup and submit your application. Once admin approves it, your ORVA workspace opens.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>

                {active ? (
                    <EmptyState
                        title="Your ORVA account is active"
                        description={`Subscription active${subscription?.end_date ? ` until ${formatStableDate(subscription.end_date)}` : ""}. You can now upload inventory, preview, and publish.`}
                        action={<Link href="/dashboard/upload-inventory" className="btn-primary mt-6 inline-flex"><Upload className="h-4 w-4" />Use ORVA</Link>}
                    />
                ) : application ? (
                    <div className="grid gap-6">
                        <section className="dashboard-panel p-6">
                            <SectionHeading title="Application status" description={application.business_name || "Your ORVA application"} />
                            <StatusTimeline status={application.status} />
                            <div className="mt-5 rounded-xl border border-[var(--border)] bg-white p-4">
                                <p className="text-sm font-bold">{application.packages?.name || selectedPackage?.name}</p>
                                <p className="mt-1 text-sm text-[var(--mid)]">{amountLabel(application.packages?.price_amount || selectedPackage?.price_amount)} / year</p>
                                <span className="dashboard-badge badge-blue mt-3">{onboardingStatusLabels[application.status] || application.status}</span>
                            </div>
                        </section>

                        <section className="dashboard-panel p-6">
                            <SectionHeading title="What happens next" description="Our team will review your application and activate your ORVA workspace after approval." />
                            <p className="text-sm leading-6 text-[var(--mid)]">Your application is with ORVA admin. Once approved, the upload, preview, and publishing tools will unlock automatically.</p>
                        </section>
                    </div>
                ) : selectedFlow ? (
                    <div className="grid gap-6">
                        <section className="dashboard-panel p-6">
                            <SectionHeading title="Confirm package" description="Choose managed support only if you want monthly specialist help." />
                            <div className="rounded-xl border border-[var(--border)] bg-white p-5">
                                <p className="text-xl font-bold">{selectedPackage?.name}</p>
                                <p className="mt-2 text-3xl font-bold text-[var(--accent)]">{amountLabel(selectedPackage?.price_amount)}<span className="text-sm text-[var(--mid)]"> / year</span></p>
                                <p className="mt-2 text-sm text-[var(--mid)]">{selectedPackage?.description}</p>
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">{(selectedPackage?.features || []).map((feature) => <p key={feature} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</p>)}</div>
                                <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold">
                                    <input type="checkbox" checked={form.wants_managed_service} onChange={(event) => setForm({ ...form, wants_managed_service: event.target.checked })} className="mt-1 h-4 w-4" />
                                    I also need monthly managed social media maintenance, starting ₹4,999/month.
                                </label>
                            </div>
                        </section>
                        <section className="dashboard-panel p-6">
                            <SectionHeading title="Application details" description="Tell us about your business so we can review and activate your setup." />
                            <div className="grid gap-4 md:grid-cols-2">
                                <input className="form-field" required placeholder="Business Name *" value={form.business_name} onChange={(event) => setForm({ ...form, business_name: event.target.value })} />
                                <input className="form-field" required placeholder="Owner Name *" value={form.owner_name} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} />
                                <input className="form-field" required inputMode="tel" placeholder="Mobile Number *" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                                <input className="form-field" required type="email" placeholder="Email *" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                                <input className="form-field" placeholder="Approx Product Count" value={form.estimated_product_count} onChange={(event) => setForm({ ...form, estimated_product_count: event.target.value.replace(/[^\d]/g, "") })} />
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-bold">Existing channels</p>
                                <div className="mt-2 flex flex-wrap gap-2">{channels.map((channel) => <button type="button" key={channel} className={`btn-secondary px-3 py-2 ${form.existing_channels.includes(channel) ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : ""}`} onClick={() => toggleChannel(channel)}>{channel}</button>)}</div>
                            </div>
                            <textarea className="form-field mt-4 min-h-28" placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                            <div className="mt-5 flex flex-wrap justify-between gap-3">
                                <button type="button" className="btn-secondary" onClick={() => setSelectedFlow("")}>Back</button>
                                <button type="button" className="btn-primary" disabled={submitting} onClick={submitApplication}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitting ? "Submitting..." : "Submit Application"}</button>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                        {flowCards.map((card) => {
                            const Icon = card.icon;
                            const pack = packageForFlow(packages, card.flow);
                            return (
                                <button key={card.flow} type="button" onClick={() => setSelectedFlow(card.flow)} className="dashboard-panel dashboard-card-hover p-6 text-left">
                                    <Icon className="h-8 w-8 text-[var(--accent)]" />
                                    <h2 className="mt-5 text-2xl font-bold">{card.title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-[var(--mid)]">{card.subtitle}</p>
                                    <p className="mt-5 text-xl font-bold text-[var(--accent)]">{amountLabel(pack?.price_amount)} / year</p>
                                    <span className="btn-primary mt-5 inline-flex">{card.cta}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </DashboardShell>
        </AuthGate>
    );
}
