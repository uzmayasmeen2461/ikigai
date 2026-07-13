"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Copy, Download, ImageIcon, Link2, Loader2, Megaphone, Sparkles, Trash2, Upload } from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading } from "../DashboardUI";

function cleanTitle(fileName = "", index = 1) {
    const title = fileName
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/[^a-z0-9 ]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!title || title.length > 48) return `Marketing post ${index}`;
    return title.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferMarketingAngle(title = "", index = 0) {
    const text = title.toLowerCase();
    if (/(sale|offer|discount|deal|price|save)/.test(text)) return "offer";
    if (/(new|launch|arrival|fresh|latest)/.test(text)) return "launch";
    if (/(service|consult|setup|support|solution|business)/.test(text)) return "service";
    if (/(beauty|skin|serum|makeup|salon|cosmetic)/.test(text)) return "beauty";
    if (/(fashion|dress|kurti|bag|shoe|wear|style)/.test(text)) return "fashion";
    if (/(food|restaurant|cafe|kitchen|menu)/.test(text)) return "food";
    return ["trust", "discovery", "growth", "brand"][index % 4];
}

function createMarketingCopy(title = "Your Business", index = 0) {
    const angle = inferMarketingAngle(title, index);
    const templates = {
        offer: {
            hook: `${title} is ready to grab attention.`,
            body: "Turn this offer into a clear, scroll-stopping post that tells customers what is available, why it matters, and how to act now.",
            cta: "Message us today to claim this offer",
        },
        launch: {
            hook: `New from ${title}.`,
            body: "Give your audience a fresh reason to notice your business. Share the launch, highlight what makes it useful, and make the next step simple.",
            cta: "DM us to know more",
        },
        service: {
            hook: `${title} can make your business easier to run.`,
            body: "Show customers exactly how you help, what problem you solve, and why choosing you saves them time, effort, or confusion.",
            cta: "Book a quick consultation",
        },
        beauty: {
            hook: `${title} deserves a closer look.`,
            body: "Create a polished beauty post that feels premium, highlights the result customers want, and invites them to ask for details.",
            cta: "DM us for details and availability",
        },
        fashion: {
            hook: `${title} is made to stand out.`,
            body: "Turn this look into a stylish social post with a clear product story, confident tone, and a simple message-to-order CTA.",
            cta: "Message us to shop this look",
        },
        food: {
            hook: `${title} is the kind of update customers notice.`,
            body: "Make your menu or food offer easy to discover with a post that feels warm, clear, and ready for customer enquiries.",
            cta: "Message us to order",
        },
        trust: {
            hook: `${title} helps customers trust your brand faster.`,
            body: "Use this image to show your business clearly, explain the value you provide, and turn casual viewers into serious enquiries.",
            cta: "Message us to get started",
        },
        discovery: {
            hook: `${title} should not stay hidden online.`,
            body: "A strong post can help more people understand what you offer, remember your brand, and take the next step when they are ready.",
            cta: "Follow us and send a message",
        },
        growth: {
            hook: `${title} is a smart growth moment.`,
            body: "Use this post to create interest, build consistency, and guide customers from seeing your content to contacting your business.",
            cta: "DM us to grow with us",
        },
        brand: {
            hook: `${title} is part of your brand story.`,
            body: "Make this image work harder with a clear message, a confident promise, and a direct action customers can take today.",
            cta: "Message us today",
        },
    };

    const selected = templates[angle] || templates.brand;
    return {
        caption: `${selected.hook}\n\n${selected.body}\n\nWith ORVA, your content can stay planned, polished, and ready for Instagram, Facebook, and WhatsApp.`,
        cta: selected.cta,
    };
}

function fileToPost(file, index) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const title = `Marketing Post ${String(index).padStart(2, "0")}`;
            const copy = createMarketingCopy(title, index);
            resolve({
                id: `${Date.now()}-${index}-${file.name}`,
                fileName: file.name,
                imageUrl: reader.result,
                title,
                caption: copy.caption,
                cta: copy.cta,
                hashtags: "#ORVA #LocalBusiness #DigitalGrowth",
                link: "https://www.orva.digital",
                scheduledFor: "",
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function buildPostText(post) {
    return [
        post.caption,
        "",
        post.cta,
        post.link ? `Link: ${post.link}` : "",
        "",
        post.hashtags || "#ORVA #LocalBusiness #DigitalGrowth #SmallBusiness",
    ].filter(Boolean).join("\n");
}

function escapeCsv(value = "") {
    return `"${String(value || "").replaceAll('"', '""')}"`;
}

function downloadCsv(posts) {
    const headers = ["file_name", "title", "caption", "cta", "hashtags", "link", "scheduled_for"];
    const rows = posts.map((post) => [
        post.fileName,
        post.title,
        post.caption,
        post.cta,
        post.hashtags,
        post.link,
        post.scheduledFor,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orva-marketing-content-plan.csv";
    link.click();
    URL.revokeObjectURL(url);
}

export function MarketingContentFlow() {
    const [posts, setPosts] = useState([]);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [analyzingIds, setAnalyzingIds] = useState([]);

    const hasPosts = posts.length > 0;
    const completedPosts = useMemo(() => posts.filter((post) => post.caption.trim() && post.cta.trim()), [posts]);
    const isAnalyzing = (id) => analyzingIds.includes(id);

    const getAccessToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    };

    const analyzeImage = async (post, index = 0, accessToken = "") => {
        setAnalyzingIds((current) => current.includes(post.id) ? current : [...current, post.id]);
        try {
            const token = accessToken || await getAccessToken();
            const response = await fetch("/api/marketing-content/analyze-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    image_url: post.imageUrl,
                    index: index + 1,
                    context: post.title,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Could not read this image.");

            setPosts((current) => current.map((item) => item.id === post.id ? {
                ...item,
                title: result.title || item.title,
                caption: result.caption || item.caption,
                cta: result.cta || item.cta,
                hashtags: result.hashtags || item.hashtags,
                aiReady: Boolean(result.configured),
            } : item));

            return result;
        } catch (error) {
            const fallback = createMarketingCopy(post.title, index + 1);
            setPosts((current) => current.map((item) => item.id === post.id ? {
                ...item,
                caption: item.caption || fallback.caption,
                cta: item.cta || fallback.cta,
            } : item));
            setMessage({ type: "error", text: error.message || "Could not analyze one marketing image." });
            return null;
        } finally {
            setAnalyzingIds((current) => current.filter((id) => id !== post.id));
        }
    };

    const analyzeUploadedImages = async (items) => {
        setMessage({ type: "info", text: `AI is reading ${items.length} image${items.length === 1 ? "" : "s"} and writing captions.` });
        const token = await getAccessToken();
        for (let index = 0; index < items.length; index += 1) {
            await analyzeImage(items[index], posts.length + index, token);
        }
        setMessage({ type: "success", text: `${items.length} marketing image${items.length === 1 ? "" : "s"} analyzed. Review titles and captions before posting.` });
    };

    const handleFiles = async (event) => {
        const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 40);
        if (!files.length) return;

        const nextPosts = await Promise.all(files.map((file, index) => fileToPost(file, posts.length + index + 1)));
        setPosts((current) => [...current, ...nextPosts]);
        setMessage({ type: "success", text: `${nextPosts.length} marketing image${nextPosts.length === 1 ? "" : "s"} added. AI will read each image now.` });
        event.target.value = "";
        queueMicrotask(() => analyzeUploadedImages(nextPosts));
    };

    const updatePost = (id, patch) => {
        setPosts((current) => current.map((post) => post.id === id ? { ...post, ...patch } : post));
    };

    const removePost = (id) => {
        setPosts((current) => current.filter((item) => item.id !== id));
        setMessage({ type: "success", text: "Marketing image removed." });
    };

    const generateCaption = async (post, index = 0) => {
        const result = await analyzeImage(post, index);
        if (result) setMessage({ type: "success", text: "AI read the image and generated a stronger caption." });
    };

    const copyPost = async (post) => {
        await navigator.clipboard?.writeText(buildPostText(post));
        setMessage({ type: "success", text: "Post caption copied." });
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell
                role="client"
                eyebrow="Content Images"
                title="Marketing Image Posts"
                description="For services, brands, creators, and businesses that want to post images without creating inventory."
            >
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>

                <section className="dashboard-panel p-6">
                    <SectionHeading
                        title="Upload content images"
                        description="Use this when the image is for awareness, offers, announcements, services, or website traffic. Product prices are not required here."
                        action={hasPosts ? (
                            <button type="button" className="btn-secondary" onClick={() => downloadCsv(posts)}>
                                <Download className="h-4 w-4" />
                                Download plan
                            </button>
                        ) : null}
                    />

                    <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--accent-light)] px-6 py-10 text-center transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[rgba(27,79,216,0.12)]">
                        <Upload className="h-8 w-8 text-[var(--accent)]" />
                        <span className="mt-3 text-base font-bold text-[var(--ink)]">Upload marketing images</span>
                        <span className="mt-1 text-sm text-[var(--mid)]">JPG, PNG, or WebP. No price fields in this flow.</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                    </label>
                </section>

                <section className="dashboard-panel mt-6 p-6">
                    <SectionHeading
                        title="Prepare captions and CTAs"
                        description="Review each image, edit the caption, add a website or WhatsApp link, then copy or download the content plan."
                    />

                    {!hasPosts ? (
                        <EmptyState
                            title="No marketing images yet"
                            description="Upload a few images to create captions, CTAs, and a simple posting plan."
                        />
                    ) : (
                        <div className="mt-5 grid gap-5">
                            {posts.map((post, index) => (
                                <article key={post.id} className="interactive-tile grid gap-5 rounded-2xl border border-[var(--border)] bg-white p-4 lg:grid-cols-[220px_1fr]">
                                    <div>
                                        <div className="aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                                            {post.imageUrl ? (
                                                <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-[var(--muted)]">
                                                    <ImageIcon className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                                            <span>Post {index + 1}</span>
                                            <button type="button" className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 font-bold text-red-600 transition hover:bg-red-100" onClick={() => removePost(post.id)} aria-label={`Delete ${post.title}`}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Marketing item</p>
                                                <p className="mt-1 text-sm font-semibold text-[var(--mid)]">
                                                    {isAnalyzing(post.id) ? "AI is reading this image and writing a specific caption." : "Review the AI title and caption before posting."}
                                                </p>
                                            </div>
                                            <button type="button" className="btn-secondary border-red-100 text-red-600 hover:bg-red-50" onClick={() => removePost(post.id)}>
                                                <Trash2 className="h-4 w-4" />
                                                Delete item
                                            </button>
                                        </div>
                                        <input
                                            className="form-field"
                                            value={post.title}
                                            onChange={(event) => updatePost(post.id, { title: event.target.value })}
                                            placeholder="Post title"
                                        />
                                        <textarea
                                            className="form-field min-h-28"
                                            value={post.caption}
                                            onChange={(event) => updatePost(post.id, { caption: event.target.value })}
                                            placeholder="Caption"
                                        />
                                        <input
                                            className="form-field"
                                            value={post.hashtags || ""}
                                            onChange={(event) => updatePost(post.id, { hashtags: event.target.value })}
                                            placeholder="#LocalBusiness #DigitalGrowth"
                                        />
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <label className="relative">
                                                <Megaphone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                                                <input
                                                    className="form-field pl-11"
                                                    value={post.cta}
                                                    onChange={(event) => updatePost(post.id, { cta: event.target.value })}
                                                    placeholder="CTA"
                                                />
                                            </label>
                                            <label className="relative">
                                                <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                                                <input
                                                    className="form-field pl-11"
                                                    value={post.link}
                                                    onChange={(event) => updatePost(post.id, { link: event.target.value })}
                                                    placeholder="Website or WhatsApp link"
                                                />
                                            </label>
                                        </div>
                                        <label className="relative">
                                            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                                            <input
                                                type="datetime-local"
                                                className="form-field pl-11"
                                                value={post.scheduledFor}
                                                onChange={(event) => updatePost(post.id, { scheduledFor: event.target.value })}
                                            />
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" className="btn-primary" disabled={isAnalyzing(post.id)} onClick={() => generateCaption(post, index)}>
                                                {isAnalyzing(post.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                {isAnalyzing(post.id) ? "Reading image..." : "Read image with AI"}
                                            </button>
                                            <button type="button" className="btn-secondary" onClick={() => copyPost(post)}>
                                                <Copy className="h-4 w-4" />
                                                Copy post
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {hasPosts ? (
                        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                            {completedPosts.length} of {posts.length} posts have caption and CTA text ready. These are marketing posts, not product inventory.
                        </div>
                    ) : null}
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
