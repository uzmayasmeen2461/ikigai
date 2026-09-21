"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ClipboardCheck,
    Copy,
    ExternalLink,
    FileText,
    Loader2,
    Save,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const STORAGE_PREFIX = "orva-meta-setup";

const setupLinks = [
    {
        title: "Create Facebook Page",
        href: "https://www.facebook.com/pages/creation/",
        note: "Client must be logged in to their own Facebook account.",
    },
    {
        title: "Switch Instagram to Professional",
        href: "https://help.instagram.com/502981923235522",
        note: "Use Business or Creator. Business is better for shops and service providers.",
    },
    {
        title: "Connect Instagram to Facebook Page",
        href: "https://help.instagram.com/570895513091465",
        note: "The Instagram account should be linked to the correct Facebook Page.",
    },
    {
        title: "Meta Business Suite",
        href: "https://business.facebook.com/",
        note: "Use this to confirm Page, Instagram, roles, and business access.",
    },
];

const checklistItems = [
    {
        id: "client_owner_present",
        label: "Client owner is present",
        detail: "Worker does not ask for passwords. Client logs in and approves every Meta step.",
    },
    {
        id: "facebook_page_created",
        label: "Facebook Page created or claimed",
        detail: "Page name, category, phone, address/service area, and website/preview link are added.",
    },
    {
        id: "instagram_professional",
        label: "Instagram converted to professional",
        detail: "Account is Business or Creator, with public profile and correct contact details.",
    },
    {
        id: "ig_connected_to_page",
        label: "Instagram connected to Facebook Page",
        detail: "Meta Business Suite shows the correct Instagram account under the correct Page.",
    },
    {
        id: "orva_connection_ready",
        label: "ORVA connection checked",
        detail: "Client can use ORVA connection flow or manual content flow is selected.",
    },
    {
        id: "handoff_recorded",
        label: "Handoff notes recorded",
        detail: "Worker records Page URL, Instagram handle, access status, and any blocker.",
    },
];

function clean(value = "") {
    return String(value || "").trim();
}

function isMetaSetupTask(task = {}) {
    const source = `${task.service_type || ""} ${task.title || ""} ${task.description || ""}`.toLowerCase();
    return ["instagram", "facebook", "social", "meta", "page setup", "business profile", "digital presence", "account_setup"].some((keyword) => source.includes(keyword));
}

function defaultDraft(task = {}) {
    return {
        businessName: task.client_business_name || task.business_name || task.title || "",
        category: "",
        city: "",
        audience: "",
        phone: task.client_phone || "",
        whatsapp: task.client_phone || "",
        website: "",
        offer: "",
        tone: "friendly, clear, and trustworthy",
        instagramHandle: "",
        facebookPageUrl: "",
        connectionStatus: "manual_ready",
        blocker: "",
        internalNotes: task.requirement_notes || task.description || "",
        checked: {},
    };
}

function buildGeneratedKit(draft = {}) {
    const businessName = clean(draft.businessName) || "Client Business";
    const category = clean(draft.category) || "local business";
    const city = clean(draft.city) || "your area";
    const audience = clean(draft.audience) || "nearby customers";
    const offer = clean(draft.offer) || "quality products and helpful service";
    const phone = clean(draft.phone) || clean(draft.whatsapp) || "Contact us";
    const website = clean(draft.website) || "Add ORVA catalog / website link";

    const instagramBio = [
        `${businessName} | ${category}`,
        `${offer}`,
        `Serving ${audience} in ${city}`,
        `${phone}`,
        `${website}`,
    ].join("\n");

    const facebookAbout = `${businessName} helps ${audience} in ${city} with ${offer}. Contact ${phone} for orders, enquiries, and latest updates.`;
    const usernameBase = businessName.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    const cityPart = city.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14);

    return {
        instagramBio,
        facebookAbout,
        usernames: [usernameBase, `${usernameBase}.official`, `${usernameBase}.${cityPart}`, `${usernameBase}.india`].filter(Boolean),
        firstPost: `Welcome to ${businessName}. We help ${audience} with ${offer}. Message us to order or ask for details.`,
        handoff: [
            `Business: ${businessName}`,
            `Facebook Page: ${clean(draft.facebookPageUrl) || "Not added"}`,
            `Instagram: ${clean(draft.instagramHandle) || "Not added"}`,
            `Connection status: ${draft.connectionStatus}`,
            `Phone/WhatsApp: ${phone}`,
            `Website/catalog: ${website}`,
            `Blocker: ${clean(draft.blocker) || "None"}`,
        ].join("\n"),
    };
}

function copyText(text, setFeedback) {
    navigator.clipboard?.writeText(text).then(
        () => setFeedback({ type: "success", text: "Copied." }),
        () => setFeedback({ type: "error", text: "Could not copy. Select the text manually." })
    );
}

export function MetaSetupAssistant() {
    const searchParams = useSearchParams();
    const taskId = searchParams.get("taskId");
    const [checking, setChecking] = useState(true);
    const [task, setTask] = useState(null);
    const [lockedMessage, setLockedMessage] = useState("");
    const [draft, setDraft] = useState(defaultDraft());
    const [feedback, setFeedback] = useState({ type: "", text: "" });

    const storageKey = `${STORAGE_PREFIX}-${taskId || "standalone"}`;
    const kit = useMemo(() => buildGeneratedKit(draft), [draft]);
    const checkedCount = checklistItems.filter((item) => draft.checked?.[item.id]).length;
    const completion = Math.round((checkedCount / checklistItems.length) * 100);

    useEffect(() => {
        let mounted = true;

        async function checkAccess() {
            setChecking(true);

            const { data: authData } = await supabase.auth.getUser();
            const user = authData.user;
            if (!user) {
                setLockedMessage("Please login again to continue.");
                setChecking(false);
                return;
            }

            if (!taskId) {
                setTask({ title: "Meta setup practice", worker_id: user.id, payment_status: "paid", status: "assigned" });
                setChecking(false);
                return;
            }

            const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
            const status = data?.status || "assigned";
            const valid = !error && data && data.worker_id === user.id && data.payment_status === "paid" && isMetaSetupTask(data) && !["completed", "cancelled"].includes(status);

            if (!mounted) return;

            if (!valid) {
                setTask(null);
                setLockedMessage("This tool is available only for paid Facebook, Instagram, Social Media, or Digital Presence tasks assigned to you.");
                setChecking(false);
                return;
            }

            setTask(data);
            setLockedMessage("");
            setChecking(false);
        }

        checkAccess();
        return () => {
            mounted = false;
        };
    }, [taskId]);

    useEffect(() => {
        if (!task) return;
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
            setDraft(saved || defaultDraft(task));
        } catch {
            setDraft(defaultDraft(task));
        }
    }, [storageKey, task]);

    function setField(field, value) {
        setDraft((current) => ({ ...current, [field]: value }));
        setFeedback({ type: "", text: "" });
    }

    function toggleCheck(id) {
        setDraft((current) => ({
            ...current,
            checked: { ...(current.checked || {}), [id]: !current.checked?.[id] },
        }));
    }

    function save() {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
        setFeedback({ type: "success", text: "Meta setup progress saved on this device." });
    }

    if (checking) {
        return (
            <AuthGate allowedRoles="partner">
                <DashboardShell role="partner" eyebrow="Internal Tool" title="Meta Setup Assistant">
                    <EmptyState icon={Loader2} title="Checking access" description="Confirming assigned paid task access." />
                </DashboardShell>
            </AuthGate>
        );
    }

    if (!task) {
        return (
            <AuthGate allowedRoles="partner">
                <DashboardShell role="partner" eyebrow="Internal Tool" title="Meta Setup Assistant">
                    <EmptyState
                        icon={AlertCircle}
                        title="This tool is locked"
                        description={lockedMessage}
                        action={<Link href="/partner/tasks" className="btn-primary mt-6 inline-flex">Go to My Tasks</Link>}
                    />
                </DashboardShell>
            </AuthGate>
        );
    }

    return (
        <AuthGate allowedRoles="partner">
            <DashboardShell role="partner" eyebrow="Internal Tool" title="Meta Setup Assistant">
                <section className="mb-8">
                    <SectionHeading
                        eyebrow="Guided setup"
                        icon={ShieldCheck}
                        title="Create and verify business pages safely"
                        action={
                            <button type="button" className="btn-primary" onClick={save}>
                                <Save className="h-4 w-4" />
                                Save Progress
                            </button>
                        }
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                        <StatCard label="Setup completion" value={`${completion}%`} icon={CheckCircle2} accent="bg-blue-500" />
                        <StatCard label="Checklist steps" value={`${checkedCount}/${checklistItems.length}`} icon={ClipboardCheck} accent="bg-emerald-500" />
                        <StatCard label="Task link" value={taskId ? "Assigned" : "Practice"} icon={FileText} accent="bg-slate-950" />
                    </div>
                    <FeedbackMessage type={feedback.type} className="mt-4">{feedback.text}</FeedbackMessage>
                </section>

                <section className="dashboard-panel mb-6 border-l-4 border-l-amber-400 p-5">
                    <p className="font-bold text-[var(--ink)]">Client-owner rule</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--mid)]">
                        Workers guide the setup, but the client must log in, own the account, and approve Meta access. Do not ask for passwords or create accounts under ORVA-owned personal profiles.
                    </p>
                </section>

                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <section className="dashboard-panel p-5 sm:p-6">
                        <h2 className="text-xl font-black text-[var(--ink)]">Business details</h2>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {[
                                ["businessName", "Business name"],
                                ["category", "Business category"],
                                ["city", "City / service area"],
                                ["audience", "Target customers"],
                                ["offer", "Main offer"],
                                ["phone", "Phone"],
                                ["whatsapp", "WhatsApp"],
                                ["website", "Website / ORVA catalog"],
                                ["instagramHandle", "Instagram handle"],
                                ["facebookPageUrl", "Facebook Page URL"],
                            ].map(([field, label]) => (
                                <label key={field} className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                                    {label}
                                    <input className="form-field" value={draft[field] || ""} onChange={(event) => setField(field, event.target.value)} />
                                </label>
                            ))}
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)] md:col-span-2">
                                Connection status
                                <select className="form-field" value={draft.connectionStatus} onChange={(event) => setField("connectionStatus", event.target.value)}>
                                    <option value="manual_ready">Manual content flow ready</option>
                                    <option value="page_created">Facebook Page created</option>
                                    <option value="ig_professional">Instagram professional ready</option>
                                    <option value="connected_to_orva">Connected to ORVA</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)] md:col-span-2">
                                Blocker / internal notes
                                <textarea className="form-field min-h-28" value={draft.blocker || draft.internalNotes || ""} onChange={(event) => setField("blocker", event.target.value)} />
                            </label>
                        </div>
                    </section>

                    <section className="dashboard-panel p-5 sm:p-6">
                        <h2 className="text-xl font-black text-[var(--ink)]">Worker checklist</h2>
                        <div className="mt-5 grid gap-3">
                            {checklistItems.map((item) => (
                                <label key={item.id} className="flex gap-3 rounded-xl border border-[var(--border)] bg-white p-3">
                                    <input type="checkbox" checked={Boolean(draft.checked?.[item.id])} onChange={() => toggleCheck(item.id)} className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)]" />
                                    <span>
                                        <span className="block text-sm font-black text-[var(--ink)]">{item.label}</span>
                                        <span className="mt-1 block text-xs leading-5 text-[var(--mid)]">{item.detail}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                    <section className="dashboard-panel p-5 sm:p-6">
                        <h2 className="text-xl font-black text-[var(--ink)]">Safe setup links</h2>
                        <div className="mt-5 grid gap-3">
                            {setupLinks.map((link) => (
                                <a key={link.title} href={link.href} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--accent)]">
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="font-bold text-[var(--ink)]">{link.title}</span>
                                        <ExternalLink className="h-4 w-4 text-[var(--accent)]" />
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-[var(--mid)]">{link.note}</span>
                                </a>
                            ))}
                        </div>
                    </section>

                    <section className="dashboard-panel p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-black text-[var(--ink)]">Generated setup kit</h2>
                            <button type="button" className="btn-secondary px-3 py-2" onClick={() => copyText(kit.handoff, setFeedback)}>
                                <Copy className="h-4 w-4" />
                                Copy Handoff
                            </button>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <Preview title="Instagram bio" text={kit.instagramBio} onCopy={() => copyText(kit.instagramBio, setFeedback)} />
                            <Preview title="Facebook about" text={kit.facebookAbout} onCopy={() => copyText(kit.facebookAbout, setFeedback)} />
                            <Preview title="Username ideas" text={kit.usernames.join("\n")} onCopy={() => copyText(kit.usernames.join("\n"), setFeedback)} />
                            <Preview title="First post" text={kit.firstPost} onCopy={() => copyText(kit.firstPost, setFeedback)} />
                        </div>
                        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Handoff summary</p>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--mid)]">{kit.handoff}</p>
                        </div>
                    </section>
                </div>
            </DashboardShell>
        </AuthGate>
    );
}

function Preview({ title, text, onCopy }) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{title}</p>
                <button type="button" className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--accent)]" onClick={onCopy} aria-label={`Copy ${title}`}>
                    <Copy className="h-3.5 w-3.5" />
                </button>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--mid)]">{text}</p>
        </div>
    );
}
