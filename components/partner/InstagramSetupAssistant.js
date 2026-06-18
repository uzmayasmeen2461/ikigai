"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
    AlertCircle,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    Save,
    Sparkles,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";

const STORAGE_PREFIX = "ikigai-instagram-setup";

function clean(value = "") {
    return String(value || "").trim();
}

function isInstagramTask(task = {}) {
    const source = `${task.service_type || ""} ${task.title || ""}`.toLowerCase();
    return source.includes("instagram") || source.includes("social") || source.includes("facebook");
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function csvEscape(value = "") {
    return `"${String(value || "").replace(/"/g, '""')}"`;
}

function defaultDraft(task = {}) {
    const businessName = task.client_business_name || task.business_name || task.title || "";
    return {
        businessName,
        category: "",
        city: "",
        audience: "",
        offer: "",
        tone: "friendly and premium",
        contact: task.client_phone || "",
        link: "",
        notes: task.requirement_notes || task.description || "",
    };
}

function buildKit(draft = {}) {
    const businessName = clean(draft.businessName) || "Your Business";
    const category = clean(draft.category) || "local business";
    const city = clean(draft.city) || "your city";
    const audience = clean(draft.audience) || "nearby customers";
    const offer = clean(draft.offer) || "quality products and helpful service";
    const tone = clean(draft.tone) || "friendly";
    const contact = clean(draft.contact) || "WhatsApp us";
    const link = clean(draft.link) || "Add profile link";

    const bio = [
        `${businessName} | ${category}`,
        `${offer}`,
        `Serving ${audience} in ${city}`,
        `${contact} | ${link}`,
    ].join("\n");

    const usernames = [
        businessName,
        `${businessName} ${city}`,
        `${businessName} official`,
        `${businessName} india`,
    ].map((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, ""));

    const highlights = ["New", "Menu", "Reviews", "Offers", "FAQs", "Contact"];
    const posts = [
        ["Intro", `Meet ${businessName}: what we offer and who we help.`],
        ["Best seller", `Show the most popular ${category} item with price or enquiry CTA.`],
        ["Behind the scenes", `Share a simple process or packaging moment in a ${tone} tone.`],
        ["Customer proof", "Post a testimonial, before/after, or result screenshot."],
        ["Offer", `Announce a starter offer for ${audience}.`],
    ];
    const captions = [
        `Welcome to ${businessName}. We help ${audience} with ${offer}. Message us to start.`,
        `Fresh update from ${businessName}. Save this post and DM us for details.`,
        `Looking for ${category} support in ${city}? Send us a message today.`,
        `Small details matter. Here is what makes ${businessName} different.`,
        `Ready to order or enquire? Contact: ${contact}.`,
    ];
    const hashtagSets = [
        [`#${category.replace(/\s+/g, "")}`, `#${city.replace(/\s+/g, "")}`, "#smallbusinessindia", "#supportlocal"],
        ["#newbusiness", "#instagramforbusiness", "#localbrand", "#madeinindia"],
        ["#whatsappbusiness", "#onlinebusiness", "#digitalsetup", "#orva"],
    ];
    const replies = [
        "Thanks for reaching out. Please share what you need and your preferred budget.",
        "Yes, we can help. Please send your name, location, and requirement.",
        "We will confirm price and availability shortly. Thank you.",
        "Please share your WhatsApp number so our team can assist faster.",
    ];

    return { bio, usernames, highlights, posts, captions, hashtagSets, replies };
}

export function InstagramSetupAssistant() {
    const searchParams = useSearchParams();
    const taskId = searchParams.get("taskId");
    const [checking, setChecking] = useState(true);
    const [task, setTask] = useState(null);
    const [lockedMessage, setLockedMessage] = useState("");
    const [draft, setDraft] = useState(defaultDraft());
    const [feedback, setFeedback] = useState({ type: "", text: "" });
    const [exporting, setExporting] = useState(false);

    const storageKey = `${STORAGE_PREFIX}-${taskId || "locked"}`;
    const kit = useMemo(() => buildKit(draft), [draft]);
    const completion = useMemo(() => {
        const fields = ["businessName", "category", "city", "audience", "offer", "contact"];
        const filled = fields.filter((field) => clean(draft[field])).length;
        return Math.round((filled / fields.length) * 100);
    }, [draft]);

    useEffect(() => {
        let mounted = true;

        const checkAccess = async () => {
            setChecking(true);

            if (!taskId) {
                setLockedMessage("Open this tool from an assigned paid Instagram or Social Media task.");
                setChecking(false);
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLockedMessage("Please login again to continue.");
                setChecking(false);
                return;
            }

            const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
            const valid =
                !error &&
                data &&
                data.worker_id === user.id &&
                data.payment_status === "paid" &&
                isInstagramTask(data) &&
                !["completed", "cancelled"].includes(data.status || "assigned");

            if (!mounted) return;

            if (!valid) {
                setTask(null);
                setLockedMessage("This tool is available only for paid Instagram or Social Media tasks assigned to you.");
                setChecking(false);
                return;
            }

            setTask(data);
            setLockedMessage("");

            try {
                const saved = JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}-${taskId}`) || "null");
                setDraft(saved || defaultDraft(data));
            } catch {
                setDraft(defaultDraft(data));
            }

            setChecking(false);
        };

        checkAccess();

        return () => {
            mounted = false;
        };
    }, [taskId]);

    const setField = (field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setFeedback({ type: "", text: "" });
    };

    const saveProject = () => {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
        setFeedback({ type: "success", text: "Instagram kit saved on this device for the linked task." });
    };

    const exportKit = async () => {
        setExporting(true);

        const zip = new JSZip();
        zip.file("bio.txt", kit.bio);
        zip.file("captions.txt", kit.captions.join("\n\n---\n\n"));
        zip.file("hashtags.txt", kit.hashtagSets.map((set) => set.join(" ")).join("\n\n"));
        zip.file(
            "profile-checklist.txt",
            [
                `Business: ${draft.businessName}`,
                `Category: ${draft.category}`,
                `City: ${draft.city}`,
                `Audience: ${draft.audience}`,
                "",
                "Checklist",
                "- Profile photo added",
                "- Bio updated",
                "- Contact buttons checked",
                "- Website/WhatsApp link added",
                "- First highlights created",
                "- First posts drafted",
                "- Quick replies saved",
            ].join("\n")
        );
        zip.file(
            "content-plan.csv",
            [
                ["Post", "Idea"].map(csvEscape).join(","),
                ...kit.posts.map((row) => row.map(csvEscape).join(",")),
            ].join("\n")
        );
        zip.file("quick-replies.txt", kit.replies.join("\n\n"));
        zip.file("username-suggestions.txt", kit.usernames.join("\n"));
        zip.file("highlight-ideas.txt", kit.highlights.join("\n"));

        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(`${clean(draft.businessName) || "instagram"}-setup-kit.zip`, blob);
        setExporting(false);
        setFeedback({ type: "success", text: "Instagram setup kit exported." });
    };

    if (checking) {
        return (
            <AuthGate allowedRoles="partner">
                <DashboardShell role="partner" eyebrow="Internal Tool" title="Instagram Setup Assistant" description="Checking task access.">
                    <EmptyState icon={Loader2} title="Checking access" description="Confirming this paid assigned task." />
                </DashboardShell>
            </AuthGate>
        );
    }

    if (!task) {
        return (
            <AuthGate allowedRoles="partner">
                <DashboardShell role="partner" eyebrow="Internal Tool" title="Tool Locked" description="Open this tool from an assigned client task.">
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
            <DashboardShell role="partner" eyebrow="Internal Tool" title="Instagram Setup Assistant" description="Create a profile, content, and reply kit for the assigned client.">
                <section className="mb-10">
                    <SectionHeading
                        eyebrow="Task tool"
                        icon={Sparkles}
                        title="Build the Instagram kit"
                        description={`Linked to ${task.title || "client task"}. Save often, then export the final kit.`}
                        action={
                            <div className="flex flex-wrap gap-3">
                                <button type="button" onClick={saveProject} className="btn-secondary">
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                </button>
                                <button type="button" onClick={exportKit} disabled={exporting} className="btn-primary">
                                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Export Kit
                                </button>
                            </div>
                        }
                    />
                    <div className="grid gap-5 md:grid-cols-3">
                        <StatCard label="Completion" value={`${completion}%`} icon={CheckCircle2} accent="bg-blue-500" />
                        <StatCard label="Post ideas" value={kit.posts.length} icon={FileText} accent="bg-emerald-500" />
                        <StatCard label="Quick replies" value={kit.replies.length} icon={Sparkles} accent="bg-slate-950" />
                    </div>
                    <FeedbackMessage type={feedback.type} className="mt-5">{feedback.text}</FeedbackMessage>
                </section>

                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <section className="dashboard-panel p-6">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Business inputs</h2>
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            {[
                                ["businessName", "Business name"],
                                ["category", "Business category"],
                                ["city", "City / service area"],
                                ["audience", "Target audience"],
                                ["offer", "Primary offer"],
                                ["tone", "Brand tone"],
                                ["contact", "Contact / WhatsApp"],
                                ["link", "Profile link"],
                            ].map(([field, label]) => (
                                <div key={field}>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
                                    <input value={draft[field]} onChange={(event) => setField(field, event.target.value)} className="form-field" />
                                </div>
                            ))}
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Internal notes</label>
                                <textarea value={draft.notes} onChange={(event) => setField("notes", event.target.value)} className="form-field min-h-32" />
                            </div>
                        </div>
                    </section>

                    <section className="dashboard-panel p-6">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Generated kit</h2>
                        <div className="mt-6 space-y-5">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Bio</p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{kit.bio}</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Preview title="Username suggestions" items={kit.usernames} />
                                <Preview title="Highlight ideas" items={kit.highlights} />
                                <Preview title="First 5 post ideas" items={kit.posts.map(([title, idea]) => `${title}: ${idea}`)} />
                                <Preview title="Caption templates" items={kit.captions} />
                                <Preview title="Hashtag sets" items={kit.hashtagSets.map((set) => set.join(" "))} />
                                <Preview title="Quick replies" items={kit.replies} />
                            </div>
                        </div>
                    </section>
                </div>
            </DashboardShell>
        </AuthGate>
    );
}

function Preview({ title, items = [] }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
            <div className="mt-3 space-y-2">
                {items.map((item) => (
                    <p key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                        {item}
                    </p>
                ))}
            </div>
        </div>
    );
}
