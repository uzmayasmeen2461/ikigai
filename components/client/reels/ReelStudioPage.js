"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Copy, Download, Film, Loader2, Music, Play, Save, SlidersHorizontal, Sparkles, Trash2, Upload, Volume2 } from "lucide-react";
import { supabase } from "../../../app/lib/supabase";
import { formatINR } from "../../../app/lib/pricing";
import { productName } from "../../../app/lib/inventory";
import { reelMusicLibrary, reelMusicStyles, reelTemplates } from "../../../app/lib/reels";
import { AuthGate } from "../../AuthGate";
import { DashboardShell } from "../../DashboardShell";
import { FeedbackMessage, SectionHeading } from "../../DashboardUI";

const emptyReelDraft = {
    name: "ORVA Reel",
    price: "",
    reel_video_url: "",
    reel_audio_url: "",
    reel_audio_track_name: "",
    reel_thumbnail_url: "",
    reel_hook: "New arrival for you",
    reel_caption: "",
    reel_hashtags: "#ShopLocal #SmallBusiness #NewArrival #ORVA",
    reel_cta: "DM to order",
    reel_status: "not_created",
};

const videoFilterOptions = {
    natural: { label: "Natural", filter: "none" },
    bright: { label: "Bright", filter: "brightness(1.14) contrast(1.06) saturate(1.04)" },
    warm: { label: "Warm", filter: "brightness(1.06) sepia(0.16) saturate(1.18)" },
    crisp: { label: "Crisp", filter: "contrast(1.18) saturate(1.12)" },
};

function useToken() {
    return useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);
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

function mediaRecorderOptions() {
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return undefined;
    const mimeType = window.MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : window.MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "";
    return mimeType ? { mimeType } : undefined;
}

function canMixAudio() {
    return typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);
}

function loadAudioElement(url) {
    return new Promise((resolve, reject) => {
        const audio = document.createElement("audio");
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.loop = true;
        audio.oncanplaythrough = () => resolve(audio);
        audio.onloadedmetadata = () => resolve(audio);
        audio.onerror = () => reject(new Error("Could not load the selected music. Try uploading the audio again."));
        audio.src = url;
    });
}

async function prepareCanvasRecording(canvas, audioUrl = "") {
    const canvasStream = canvas.captureStream(30);
    if (!audioUrl) {
        return {
            stream: canvasStream,
            start: async () => {},
            stop: () => canvasStream.getTracks().forEach((track) => track.stop()),
        };
    }
    if (!canMixAudio()) {
        throw new Error("Your browser does not support mixing music into reels. Download the video and add music manually.");
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audio = await loadAudioElement(audioUrl);
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaElementSource(audio);
    const gain = audioContext.createGain();
    const destination = audioContext.createMediaStreamDestination();
    gain.gain.value = 0.72;
    source.connect(gain);
    gain.connect(destination);
    const stream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
    ]);

    return {
        stream,
        start: async () => {
            audio.currentTime = 0;
            await audioContext.resume();
            await audio.play();
        },
        stop: () => {
            audio.pause();
            canvasStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            audioContext.close().catch(() => {});
        },
    };
}

function reelCaptionText(reel = {}) {
    const name = productName(reel);
    const priceText = reel.price ? ` at ${formatINR(reel.price)}` : "";
    return [
        reel.reel_hook || "New arrival for you",
        reel.reel_caption || `${name} is now available${priceText}.\nA clean pick for customers who love local businesses.\nMessage us to order today.`,
        reel.reel_cta || "DM to order",
        reel.reel_hashtags || "#ShopLocal #SmallBusiness #NewArrival #ORVA",
    ].filter(Boolean).join("\n\n");
}

async function imageFromUrl(url) {
    if (typeof window === "undefined" || typeof window.Image !== "function") {
        throw new Error("Image loading is only available in the browser.");
    }
    return new Promise((resolve, reject) => {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Could not load one of the inventory images. Use public product image URLs before creating a reel."));
        image.src = url;
    });
}

async function createSlideshowVideo(products = [], onProgress = () => {}, audioUrl = "") {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof window.MediaRecorder === "undefined") {
        throw new Error("Your browser does not support in-browser reel creation. Upload a video instead.");
    }

    const selected = products.filter((product) => product.cleaned_image_url || product.image_url).slice(0, 8);
    if (!selected.length) throw new Error("Add product images before creating a reel from inventory images.");

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    if (!context || typeof canvas.captureStream !== "function") {
        throw new Error("Your browser does not support in-browser reel creation. Upload a video instead.");
    }

    const recording = await prepareCanvasRecording(canvas, audioUrl);
    const recorder = new window.MediaRecorder(recording.stream, mediaRecorderOptions());
    const chunks = [];
    recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
    };
    const done = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });
    recorder.start();
    await recording.start();

    for (let index = 0; index < selected.length; index += 1) {
        const product = selected[index];
        const image = await imageFromUrl(product.cleaned_image_url || product.image_url);
        context.fillStyle = "#071827";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

        const gradient = context.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
        gradient.addColorStop(0, "rgba(0,0,0,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.82)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = "white";
        context.font = "bold 52px Inter, system-ui, sans-serif";
        context.fillText(productName(product).slice(0, 26), 52, 1050);
        context.font = "bold 40px Inter, system-ui, sans-serif";
        context.fillStyle = "#7CE7F2";
        context.fillText(formatINR(product.price || 0), 52, 1110);
        context.font = "bold 30px Inter, system-ui, sans-serif";
        context.fillStyle = "white";
        context.fillText("DM to order", 52, 1172);

        onProgress(Math.round(((index + 1) / selected.length) * 92));
        await new Promise((resolve) => setTimeout(resolve, 1400));
    }

    recorder.stop();
    const blob = await done;
    recording.stop();
    return blob;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    let line = "";
    let lines = 0;
    for (let index = 0; index < words.length; index += 1) {
        const testLine = line ? `${line} ${words[index]}` : words[index];
        if (context.measureText(testLine).width > maxWidth && line) {
            context.fillText(line, x, y + lines * lineHeight);
            line = words[index];
            lines += 1;
            if (lines >= maxLines) return;
        } else {
            line = testLine;
        }
    }
    if (line && lines < maxLines) context.fillText(line, x, y + lines * lineHeight);
}

function templatePalette(templateId) {
    if (templateId === "luxury-showcase") return { bg: "#050B17", accent: "#D6B86A", glow: "rgba(214,184,106,0.32)" };
    if (templateId === "festival-offer") return { bg: "#230D18", accent: "#FFB84D", glow: "rgba(255,184,77,0.36)" };
    if (templateId === "premium-sale") return { bg: "#071827", accent: "#7CE7F2", glow: "rgba(124,231,242,0.34)" };
    if (templateId === "best-sellers") return { bg: "#08111F", accent: "#9BA8FF", glow: "rgba(155,168,255,0.34)" };
    return { bg: "#071827", accent: "#7CE7F2", glow: "rgba(124,231,242,0.34)" };
}

async function createPremiumTemplateVideo(products = [], settings = {}, onProgress = () => {}) {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof window.MediaRecorder === "undefined") {
        throw new Error("Your browser does not support premium reel rendering. Download the basic reel instead.");
    }

    const selected = products.filter((product) => product.cleaned_image_url || product.image_url).slice(0, 8);
    if (!selected.length) throw new Error("Select product images before generating a premium reel.");

    const template = settings.template || reelTemplates[0];
    const palette = templatePalette(template.id);
    const showPriceOverlay = settings.showPriceOverlay !== false;
    const showOfferBadge = settings.showOfferBadge !== false;
    const showWatermark = settings.showWatermark !== false;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    if (!context || typeof canvas.captureStream !== "function") {
        throw new Error("Your browser does not support premium reel rendering. Download the basic reel instead.");
    }

    const recording = await prepareCanvasRecording(canvas, settings.audioUrl || "");
    const recorder = new window.MediaRecorder(recording.stream, mediaRecorderOptions());
    const chunks = [];
    recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
    };
    const done = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    const images = [];
    for (const product of selected) {
        images.push({ product, image: await imageFromUrl(product.cleaned_image_url || product.image_url) });
    }

    const fps = 30;
    const hookFrames = fps * 1.25;
    const slideFrames = fps * 1.45;
    const endFrames = fps * 1.35;
    const totalFrames = hookFrames + images.length * slideFrames + endFrames;
    recorder.start();
    await recording.start();

    const drawBackground = () => {
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, palette.bg);
        gradient.addColorStop(0.58, "#0A2132");
        gradient.addColorStop(1, "#101A38");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = palette.glow;
        context.beginPath();
        context.arc(570, 230, 220, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(255,255,255,0.035)";
        for (let x = 0; x < canvas.width; x += 56) context.fillRect(x, 0, 1, canvas.height);
        for (let y = 0; y < canvas.height; y += 56) context.fillRect(0, y, canvas.width, 1);
    };

    const drawBrand = () => {
        if (!showWatermark) return;
        context.save();
        context.globalAlpha = 0.72;
        context.fillStyle = "rgba(255,255,255,0.14)";
        context.beginPath();
        context.roundRect(44, 44, 118, 42, 20);
        context.fill();
        context.fillStyle = "#FFFFFF";
        context.font = "bold 22px Inter, system-ui, sans-serif";
        context.fillText("ORVA", 70, 72);
        context.restore();
    };

    const drawHook = (frame) => {
        drawBackground();
        drawBrand();
        const pulse = 1 + Math.sin((frame / hookFrames) * Math.PI) * 0.04;
        context.save();
        context.translate(canvas.width / 2, canvas.height / 2);
        context.scale(pulse, pulse);
        context.fillStyle = "rgba(255,255,255,0.12)";
        context.beginPath();
        context.roundRect(-260, -150, 520, 300, 32);
        context.fill();
        context.fillStyle = "#FFFFFF";
        context.font = "bold 58px Inter, system-ui, sans-serif";
        context.textAlign = "center";
        drawWrappedText(context, settings.hookText || template.hookText, -220, -42, 440, 66, 3);
        context.fillStyle = palette.accent;
        context.font = "bold 26px Inter, system-ui, sans-serif";
        context.fillText(template.name, 0, 122);
        context.restore();
    };

    const drawProduct = ({ product, image }, localFrame, globalFrame) => {
        drawBackground();
        const progress = Math.min(1, localFrame / slideFrames);
        const fadeIn = Math.min(1, progress * 6);
        const fadeOut = progress > 0.82 ? Math.max(0, 1 - ((progress - 0.82) / 0.18)) : 1;
        const alpha = Math.min(fadeIn, fadeOut);
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height) * (1.02 + progress * 0.08);
        const width = image.width * scale;
        const height = image.height * scale;
        const pan = Math.sin(progress * Math.PI) * 28;

        context.save();
        context.globalAlpha = alpha;
        context.drawImage(image, (canvas.width - width) / 2 + pan, (canvas.height - height) / 2 - pan * 0.35, width, height);
        context.restore();

        const overlay = context.createLinearGradient(0, canvas.height * 0.48, 0, canvas.height);
        overlay.addColorStop(0, "rgba(0,0,0,0)");
        overlay.addColorStop(0.66, "rgba(0,0,0,0.55)");
        overlay.addColorStop(1, "rgba(0,0,0,0.86)");
        context.fillStyle = overlay;
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (showOfferBadge) {
            context.fillStyle = palette.accent;
            context.beginPath();
            context.roundRect(48, 148, 212, 48, 22);
            context.fill();
            context.fillStyle = "#071827";
            context.font = "bold 23px Inter, system-ui, sans-serif";
            context.fillText(template.styleLabel, 68, 180);
        }

        drawBrand();
        context.fillStyle = "#FFFFFF";
        context.font = "bold 52px Inter, system-ui, sans-serif";
        drawWrappedText(context, productName(product), 50, 1008, 610, 58, 2);
        if (showPriceOverlay) {
            context.fillStyle = palette.accent;
            context.font = "bold 42px Inter, system-ui, sans-serif";
            context.fillText(formatINR(product.price || 0), 50, 1135);
        }
        context.fillStyle = "#FFFFFF";
        context.font = "bold 30px Inter, system-ui, sans-serif";
        context.fillText(settings.ctaText || template.ctaText, 50, 1198);
        onProgress(Math.min(92, Math.round((globalFrame / totalFrames) * 94)));
    };

    const drawEndCard = (frame) => {
        drawBackground();
        drawBrand();
        context.fillStyle = "#FFFFFF";
        context.font = "bold 58px Inter, system-ui, sans-serif";
        context.textAlign = "center";
        drawWrappedText(context, settings.ctaText || template.ctaText, canvas.width / 2 - 250, 520, 500, 68, 3);
        context.fillStyle = palette.accent;
        context.font = "bold 26px Inter, system-ui, sans-serif";
        context.fillText(settings.musicStyle === "no_music" ? "Ready to share" : `${settings.musicStyle || template.musicStyle} music placeholder`, canvas.width / 2, 745);
        context.textAlign = "start";
        onProgress(Math.min(96, Math.round(((totalFrames - endFrames + frame) / totalFrames) * 94)));
    };

    for (let frame = 0; frame < totalFrames; frame += 1) {
        if (frame < hookFrames) {
            drawHook(frame);
        } else if (frame >= hookFrames + images.length * slideFrames) {
            drawEndCard(frame - hookFrames - images.length * slideFrames);
        } else {
            const slideIndex = Math.floor((frame - hookFrames) / slideFrames);
            const localFrame = frame - hookFrames - slideIndex * slideFrames;
            drawProduct(images[slideIndex], localFrame, frame);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
    }

    recorder.stop();
    const blob = await done;
    recording.stop();
    return blob;
}

function loadVideoElement(url) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.onloadedmetadata = () => resolve(video);
        video.onerror = () => reject(new Error("Could not load this video for editing. Try uploading the video again."));
        video.src = url;
    });
}

function seekVideo(video, time) {
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Could not prepare the selected video clip.")), 8000);
        video.onseeked = () => {
            window.clearTimeout(timeout);
            resolve();
        };
        video.currentTime = time;
    });
}

async function captureVideoFrame(videoUrl) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("Video analysis is only available in the browser.");
    }
    const video = await loadVideoElement(videoUrl);
    const targetTime = Math.min(Math.max(0.6, Number(video.duration || 1) * 0.2), Math.max(0, Number(video.duration || 1) - 0.1));
    await seekVideo(video, targetTime);

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare a preview frame for AI.");

    context.fillStyle = "#071827";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

    return canvas.toDataURL("image/jpeg", 0.82);
}

async function createEditedVideo(reel, options, onProgress = () => {}) {
    if (typeof window === "undefined" || typeof document === "undefined" || typeof window.MediaRecorder === "undefined") {
        throw new Error("Your browser does not support in-browser video editing.");
    }
    if (!reel?.reel_video_url) throw new Error("Upload a reel video before editing.");

    const video = await loadVideoElement(reel.reel_video_url);
    const startAt = Math.max(0, Number(options.startAt || 0));
    const availableDuration = Math.max(1, Number(video.duration || 0) - startAt);
    const clipDuration = Math.min(Math.max(3, Number(options.duration || 8)), availableDuration, 25);

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    if (!context || typeof canvas.captureStream !== "function") {
        throw new Error("Your browser does not support in-browser video editing.");
    }

    const recording = await prepareCanvasRecording(canvas, options.audioUrl || reel.reel_audio_url || "");
    const recorder = new window.MediaRecorder(recording.stream, mediaRecorderOptions());
    const chunks = [];
    recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
    };
    const done = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    await seekVideo(video, startAt);
    recorder.start();
    await recording.start();
    await video.play();

    await new Promise((resolve) => {
        const draw = () => {
            const elapsed = Math.max(0, video.currentTime - startAt);
            context.fillStyle = "#071827";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.filter = videoFilterOptions[options.filter]?.filter || "none";

            const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
            const width = video.videoWidth * scale;
            const height = video.videoHeight * scale;
            context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
            context.filter = "none";

            if (options.overlay !== false) {
                const gradient = context.createLinearGradient(0, canvas.height * 0.56, 0, canvas.height);
                gradient.addColorStop(0, "rgba(0,0,0,0)");
                gradient.addColorStop(1, "rgba(0,0,0,0.78)");
                context.fillStyle = gradient;
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = "white";
                context.font = "bold 50px Inter, system-ui, sans-serif";
                context.fillText(productName(reel).slice(0, 24), 52, 1050);
                context.font = "bold 38px Inter, system-ui, sans-serif";
                context.fillStyle = "#7CE7F2";
                context.fillText(reel.price ? formatINR(reel.price) : "New arrival", 52, 1110);
                context.font = "bold 30px Inter, system-ui, sans-serif";
                context.fillStyle = "white";
                context.fillText(reel.reel_cta || "DM to order", 52, 1170);
            }

            onProgress(Math.min(96, Math.round((elapsed / clipDuration) * 94)));
            if (elapsed >= clipDuration || video.ended) {
                video.pause();
                resolve();
                return;
            }
            window.requestAnimationFrame(draw);
        };
        draw();
    });

    recorder.stop();
    const blob = await done;
    recording.stop();
    return blob;
}

export function ReelStudioPage() {
    const getToken = useToken();
    const [products, setProducts] = useState([]);
    const [selectedImageIds, setSelectedImageIds] = useState([]);
    const [reelDraft, setReelDraft] = useState(emptyReelDraft);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [progress, setProgress] = useState(0);
    const [working, setWorking] = useState("");
    const [showEditor, setShowEditor] = useState(false);
    const [videoEdit, setVideoEdit] = useState({ filter: "natural", startAt: 0, duration: 8, overlay: true });
    const [currentReel, setCurrentReel] = useState(null);
    const [usage, setUsage] = useState(null);
    const [enhancerOpen, setEnhancerOpen] = useState(false);
    const [musicModalOpen, setMusicModalOpen] = useState(false);
    const [enhanceOptions, setEnhanceOptions] = useState({
        templateId: "premium-sale",
        hookText: reelTemplates[0].hookText,
        ctaText: reelTemplates[0].ctaText,
        musicStyle: reelTemplates[0].musicStyle,
        showPriceOverlay: true,
        showOfferBadge: true,
        showWatermark: true,
    });
    const searchParamsRead = useRef(false);

    const caption = useMemo(() => reelCaptionText(reelDraft), [reelDraft]);
    const productsWithImages = useMemo(() => products.filter((product) => product.cleaned_image_url || product.image_url), [products]);
    const selectedImageProducts = useMemo(
        () => productsWithImages.filter((product) => selectedImageIds.includes(product.id)),
        [productsWithImages, selectedImageIds],
    );
    const hasInventoryImages = productsWithImages.length > 0;
    const selectedTemplate = useMemo(
        () => reelTemplates.find((template) => template.id === enhanceOptions.templateId) || reelTemplates[0],
        [enhanceOptions.templateId],
    );
    const selectedLibraryTrack = useMemo(
        () => reelMusicLibrary.find((track) => track.url === reelDraft.reel_audio_url) || null,
        [reelDraft.reel_audio_url],
    );

    const uploadReelVideoFile = useCallback(async (file, label = "orva-reel") => {
        const token = await getToken();
        const body = new FormData();
        body.append("file", file);
        body.append("label", label);

        const response = await fetch("/api/reels/upload-video", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body,
        });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.error || "Could not upload reel video.");
        return result.url;
    }, [getToken]);

    const uploadReelAudioFile = useCallback(async (file, label = "orva-reel-music") => {
        const token = await getToken();
        const body = new FormData();
        body.append("file", file);
        body.append("label", label);

        const response = await fetch("/api/reels/upload-audio", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body,
        });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.error || "Could not upload reel music.");
        return result;
    }, [getToken]);

    const saveBasicReelRecord = useCallback(async (videoUrl, overrides = {}) => {
        const token = await getToken();
        const response = await fetch("/api/reels", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                id: currentReel?.id,
                basic_video_url: videoUrl,
                product_ids: selectedImageProducts.map((product) => product.id),
                selected_image_urls: selectedImageProducts.map((product) => product.cleaned_image_url || product.image_url),
                audio_url: reelDraft.reel_audio_url,
                audio_track_name: reelDraft.reel_audio_track_name,
                hook_text: reelDraft.reel_hook,
                cta_text: reelDraft.reel_cta,
                music_style: enhanceOptions.musicStyle,
                ...overrides,
            }),
        });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.error || "Could not save reel.");
        setCurrentReel(result.reel);
        return result.reel;
    }, [currentReel?.id, enhanceOptions.musicStyle, getToken, reelDraft.reel_audio_track_name, reelDraft.reel_audio_url, reelDraft.reel_cta, reelDraft.reel_hook, selectedImageProducts]);

    const loadUsage = useCallback(async () => {
        const token = await getToken();
        const response = await fetch("/api/reels/usage", { headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        if (response.ok) setUsage(result);
    }, [getToken]);

    const updateDraft = (field, value) => {
        setReelDraft((current) => ({ ...current, [field]: value }));
    };

    const loadProducts = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const response = await fetch("/api/inventory", { headers: { Authorization: `Bearer ${token}` } });
        const result = await readJson(response);
        if (!response.ok) {
            setProducts([]);
            setMessage({ type: "error", text: result.error || "Could not load inventory images, but you can still upload a reel video." });
            setLoading(false);
            return;
        }

        const nextProducts = result.products || [];
        setProducts(nextProducts);
        if (!searchParamsRead.current) {
            searchParamsRead.current = true;
            const params = new URLSearchParams(window.location.search);
            const productId = params.get("productId");
            const sourceProduct = nextProducts.find((item) => item.id === productId);
            if (sourceProduct) {
                setReelDraft((current) => ({
                    ...current,
                    name: productName(sourceProduct),
                    price: sourceProduct.price || "",
                    reel_cta: sourceProduct.reel_cta || current.reel_cta,
                    reel_hashtags: sourceProduct.reel_hashtags || current.reel_hashtags,
                }));
            }
        }
        setLoading(false);
    }, [getToken]);

    useEffect(() => {
        queueMicrotask(loadProducts);
        queueMicrotask(loadUsage);
    }, [loadProducts, loadUsage]);

    const toggleProductImage = (productId) => {
        setSelectedImageIds((current) => (
            current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId]
        ));
    };

    const uploadVideo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) return setMessage({ type: "error", text: "Upload an MP4, MOV, or WebM video." });
        if (file.size > 200 * 1024 * 1024) return setMessage({ type: "error", text: "Video must be under 200MB." });

        setWorking("upload");
        setProgress(20);
        try {
            const url = await uploadReelVideoFile(file, file.name || "uploaded-reel");
            setProgress(92);
            setReelDraft((current) => ({ ...current, reel_video_url: url, reel_status: "draft" }));
            await saveBasicReelRecord(url);
            setProgress(100);
            setMessage({ type: "success", text: "Reel video uploaded." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not upload reel video." });
        } finally {
            setWorking("");
            setTimeout(() => setProgress(0), 800);
        }
    };

    const uploadMusic = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const allowed = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg"];
        if (!allowed.includes(file.type)) return setMessage({ type: "error", text: "Upload MP3, M4A, AAC, WAV, or OGG music." });
        if (file.size > 25 * 1024 * 1024) return setMessage({ type: "error", text: "Music file must be under 25MB." });

        setWorking("upload-audio");
        setProgress(20);
        try {
            const result = await uploadReelAudioFile(file, file.name || "reel-music");
            setProgress(92);
            setReelDraft((current) => ({
                ...current,
                reel_audio_url: result.url,
                reel_audio_track_name: result.name || file.name || "Uploaded music",
            }));
            if (reelDraft.reel_video_url) {
                await saveBasicReelRecord(reelDraft.reel_video_url, {
                    audio_url: result.url,
                    audio_track_name: result.name || file.name || "Uploaded music",
                });
            }
            setProgress(100);
            setMessage({ type: "success", text: "Music uploaded. Click Save edited video or Generate Premium Reel to bake the music into the publishable reel." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not upload reel music." });
        } finally {
            setWorking("");
            setTimeout(() => setProgress(0), 800);
        }
    };

    const selectLibraryMusic = async (track) => {
        setReelDraft((current) => ({
            ...current,
            reel_audio_url: track.url,
            reel_audio_track_name: track.name,
        }));
        setEnhanceOptions((current) => ({ ...current, musicStyle: track.style || current.musicStyle }));

        if (reelDraft.reel_video_url) {
            await saveBasicReelRecord(reelDraft.reel_video_url, {
                audio_url: track.url,
                audio_track_name: track.name,
                music_style: track.style || enhanceOptions.musicStyle,
            }).catch(() => {});
        }

        setMessage({ type: "success", text: `${track.name} selected. Generate or save the reel to bake this music into the final video.` });
        setMusicModalOpen(false);
    };

    const clearMusic = async () => {
        setReelDraft((current) => ({ ...current, reel_audio_url: "", reel_audio_track_name: "" }));
        if (reelDraft.reel_video_url) {
            await saveBasicReelRecord(reelDraft.reel_video_url, {
                audio_url: "",
                audio_track_name: "",
            }).catch(() => {});
        }
        setMessage({ type: "success", text: "Music removed from this reel." });
    };

    const generateContent = async () => {
        setWorking("generate");
        try {
            if (!reelDraft.reel_video_url) throw new Error("Upload or create a reel video first so AI can read it.");
            const frame = await captureVideoFrame(reelDraft.reel_video_url);
            const token = await getToken();
            const response = await fetch("/api/reels/write-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    image_url: frame,
                    name: reelDraft.name,
                    price: reelDraft.price,
                    current_caption: reelDraft.reel_caption,
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Could not generate reel content.");
            setReelDraft((current) => ({
                ...current,
                name: result.title || current.name || "ORVA Reel",
                reel_hook: result.hook || current.reel_hook || "New arrival for you",
                reel_caption: result.caption || current.reel_caption,
                reel_hashtags: result.hashtags || current.reel_hashtags || "#ShopLocal #SmallBusiness #NewArrival #ORVA",
                reel_cta: result.cta || current.reel_cta || "DM to order",
                reel_status: current.reel_video_url ? "ready" : "draft",
            }));
            setMessage({ type: result.configured === false ? "info" : "success", text: result.warning || "AI read the reel preview and generated content." });
        } catch (error) {
            const name = reelDraft.name || "ORVA Reel";
            const priceText = reelDraft.price ? ` at ${formatINR(reelDraft.price)}` : "";
            setReelDraft((current) => ({
                ...current,
                reel_hook: current.reel_hook || "New arrival for you",
                reel_caption: current.reel_caption || `${name} is now available${priceText}.\nMessage us to order today.`,
                reel_hashtags: current.reel_hashtags || "#ShopLocal #SmallBusiness #NewArrival #ORVA",
                reel_cta: current.reel_cta || "DM to order",
                reel_status: current.reel_video_url ? "ready" : "draft",
            }));
            setMessage({ type: "error", text: error.message || "Could not generate reel content from the video." });
        } finally {
            setWorking("");
        }
    };

    const createAiReelFromImages = async () => {
        setWorking("ai-video");
        setProgress(8);
        try {
            const blob = await createSlideshowVideo(selectedImageProducts, setProgress, reelDraft.reel_audio_url);
            setProgress(94);
            const generatedFile = new File([blob], "orva-generated-reel.webm", { type: blob.type || "video/webm" });
            const url = await uploadReelVideoFile(generatedFile, "generated-reel");
            setProgress(98);
            setReelDraft((current) => ({ ...current, reel_video_url: url, reel_status: "draft" }));
            await saveBasicReelRecord(url);
            setProgress(100);
            setMessage({ type: "success", text: "Reel created from inventory images. Review it before publishing." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not create reel from images." });
        } finally {
            setWorking("");
            setTimeout(() => setProgress(0), 800);
        }
    };

    const clearVideo = () => {
        setWorking("clear-video");
        setReelDraft((current) => ({ ...current, reel_video_url: "", reel_thumbnail_url: "", reel_status: "not_created" }));
        setShowEditor(false);
        setMessage({ type: "success", text: "Reel video cleared. Upload or create another video." });
        setWorking("");
    };

    const openEnhancer = async () => {
        if (!reelDraft.reel_video_url) {
            setMessage({ type: "error", text: "Generate a basic reel before enhancing it." });
            return;
        }
        try {
            if (!currentReel?.id) await saveBasicReelRecord(reelDraft.reel_video_url);
            await loadUsage();
            setEnhancerOpen(true);
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not prepare the reel enhancer." });
        }
    };

    const selectEnhancerTemplate = (template) => {
        setEnhanceOptions((current) => ({
            ...current,
            templateId: template.id,
            hookText: current.hookText || template.hookText,
            ctaText: current.ctaText || template.ctaText,
            musicStyle: template.musicStyle,
        }));
    };

    const generatePremiumReel = async () => {
        if (!reelDraft.reel_video_url) return setMessage({ type: "error", text: "Generate a basic reel before enhancing it." });
        if (!selectedImageProducts.length) return setMessage({ type: "error", text: "Select product images for the premium template." });

        setWorking("premium-reel");
        setProgress(8);
        try {
            const reel = currentReel?.id ? currentReel : await saveBasicReelRecord(reelDraft.reel_video_url);
            const premiumBlob = await createPremiumTemplateVideo(selectedImageProducts, {
                template: selectedTemplate,
                audioUrl: reelDraft.reel_audio_url,
                ...enhanceOptions,
            }, setProgress);
            setProgress(94);
            const premiumFile = new File([premiumBlob], `orva-${selectedTemplate.id}-premium-reel.webm`, { type: premiumBlob.type || "video/webm" });
            const enhancedVideoUrl = await uploadReelVideoFile(premiumFile, `${selectedTemplate.id}-premium-reel`);
            setProgress(98);
            const token = await getToken();
            const response = await fetch("/api/reels/enhance", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    reelId: reel.id,
                    templateName: selectedTemplate.id,
                    hookText: enhanceOptions.hookText,
                    ctaText: enhanceOptions.ctaText,
                    musicStyle: enhanceOptions.musicStyle,
                    showPriceOverlay: enhanceOptions.showPriceOverlay,
                    showOfferBadge: enhanceOptions.showOfferBadge,
                    showWatermark: enhanceOptions.showWatermark,
                    audioUrl: reelDraft.reel_audio_url,
                    audioTrackName: reelDraft.reel_audio_track_name,
                    enhancedVideoUrl,
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.error || "Could not save premium reel.");
            setCurrentReel(result.reel);
            setUsage(result.usage || usage);
            setReelDraft((current) => ({
                ...current,
                reel_video_url: enhancedVideoUrl,
                reel_hook: enhanceOptions.hookText || current.reel_hook,
                reel_cta: enhanceOptions.ctaText || current.reel_cta,
                reel_status: "ready",
            }));
            setProgress(100);
            setEnhancerOpen(false);
            setMessage({ type: "success", text: "Premium reel generated. Preview, download, or test publish it." });
        } catch (error) {
            if (currentReel?.id) {
                const token = await getToken();
                await fetch(`/api/reels/${currentReel.id}/mark-failed`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ error: error.message || "Premium reel generation failed." }),
                }).catch(() => {});
            }
            setMessage({ type: "error", text: error.message || "Could not generate premium reel. Your basic reel is still available." });
        } finally {
            setWorking("");
            setTimeout(() => setProgress(0), 800);
        }
    };

    const applyVideoEdits = async () => {
        setWorking("edit-video");
        setProgress(8);
        try {
            const blob = await createEditedVideo(reelDraft, videoEdit, setProgress);
            setProgress(94);
            const editedFile = new File([blob], "orva-edited-reel.webm", { type: blob.type || "video/webm" });
            const url = await uploadReelVideoFile(editedFile, "edited-reel");
            setProgress(98);
            setReelDraft((current) => ({ ...current, reel_video_url: url, reel_status: "draft" }));
            await saveBasicReelRecord(url, {
                audio_url: reelDraft.reel_audio_url,
                audio_track_name: reelDraft.reel_audio_track_name,
            });
            setProgress(100);
            setMessage({ type: "success", text: reelDraft.reel_audio_url ? "Video edits saved with music. Review before publishing." : "Video edits saved. Review before publishing." });
        } catch (error) {
            setMessage({ type: "error", text: error.message || "Could not edit this video." });
        } finally {
            setWorking("");
            setTimeout(() => setProgress(0), 800);
        }
    };

    const saveCopy = () => {
        setReelDraft((current) => ({ ...current, reel_status: current.reel_video_url ? "ready" : "draft" }));
        setMessage({ type: "success", text: "Reel copy saved for this session." });
    };

    const copyCaption = async () => {
        await navigator.clipboard?.writeText(caption);
        setMessage({ type: "success", text: "Reel caption copied." });
    };

    const publish = async (channel) => {
        if (!reelDraft.reel_video_url) return setMessage({ type: "error", text: "Upload or create a reel video before publishing." });
        setWorking(channel);
        const token = await getToken();
        const response = await fetch(channel === "facebook" ? "/api/facebook/reels/test-publish" : "/api/instagram/reels/test-publish", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ caption, reel: reelDraft }),
        });
        const result = await readJson(response);
        setWorking("");
        if (!response.ok) return setMessage({ type: "error", text: result.error || `Could not publish to ${channel}.` });
        setReelDraft((current) => ({ ...current, reel_status: "published" }));
        setMessage({ type: "success", text: result.warning || result.message || "Reel published." });
    };

    return (
        <AuthGate allowedRoles="client">
            <DashboardShell role="client" eyebrow="Content" title="Reel Studio" description="Create standalone reels from uploaded videos or inventory images, then publish after review.">
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                    <div className="grid gap-5">
                        <div className="dashboard-panel overflow-hidden p-0">
                            <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
                                <div className="p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Studio workflow</p>
                                    <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">Create, polish, preview, publish.</h2>
                                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">Start with a video or product images. ORVA creates a reel-ready preview, lets you edit the copy and overlay, then publishes only when you click.</p>
                                </div>
                                <div className="grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] lg:w-[520px] lg:border-l lg:border-t-0">
                                    {["Source", "Enhance", "Edit", "Preview", "Publish"].map((label, index) => (
                                        <div key={label} className="border-r border-[var(--border)] px-3 py-4 last:border-r-0">
                                            <p className="text-[11px] font-black text-[var(--accent)]">0{index + 1}</p>
                                            <p className="mt-1 text-xs font-black text-[var(--ink)]">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,0.9fr)_minmax(320px,420px)_minmax(320px,1fr)]">
                        <section className="dashboard-panel p-5">
                            <SectionHeading title="Media source" description="Upload a video, choose ORVA music, or pick product images for ORVA to turn into a reel." />
                            <div className="mt-4 grid gap-2">
                                <label className="btn-primary cursor-pointer justify-center">
                                    <Upload className="h-4 w-4" />Upload video
                                    <input className="sr-only" type="file" accept="video/mp4,video/quicktime,video/webm" onChange={uploadVideo} disabled={working === "upload"} />
                                </label>
                                <button type="button" className="btn-secondary justify-center" disabled={Boolean(working) || !selectedImageProducts.length} onClick={createAiReelFromImages}>{working === "ai-video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Create from selected images</button>
                            </div>
                            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Reel music</p>
                                        <p className="mt-1 truncate text-sm font-black text-[var(--ink)]">{reelDraft.reel_audio_track_name || "No music selected"}</p>
                                        {selectedLibraryTrack ? <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{selectedLibraryTrack.mood}</p> : null}
                                    </div>
                                    {reelDraft.reel_audio_url ? (
                                        <button type="button" className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-black text-red-600 shadow-sm" onClick={clearMusic} disabled={Boolean(working)}>Remove</button>
                                    ) : null}
                                </div>
                                {reelDraft.reel_audio_url ? (
                                    <audio className="mt-3 w-full" src={reelDraft.reel_audio_url} controls preload="metadata" />
                                ) : null}
                            </div>

                            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Music</p>
                                        <p className="mt-1 truncate text-sm font-black text-[var(--ink)]">{reelDraft.reel_audio_track_name || "No music selected"}</p>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{selectedLibraryTrack?.bestFor || "Choose a licensed track or upload your own permitted audio."}</p>
                                    </div>
                                    <Volume2 className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                                </div>
                                {reelDraft.reel_audio_url ? (
                                    <audio className="mt-3 w-full" src={reelDraft.reel_audio_url} controls preload="metadata" />
                                ) : null}
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                    <button type="button" className="btn-primary justify-center" onClick={() => setMusicModalOpen(true)} disabled={Boolean(working)}>
                                        <Volume2 className="h-4 w-4" />
                                        Choose music
                                    </button>
                                    <label className="btn-secondary cursor-pointer justify-center">
                                        {working === "upload-audio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
                                        Upload own
                                        <input className="sr-only" type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg" onChange={uploadMusic} disabled={working === "upload-audio"} />
                                    </label>
                                </div>
                                {reelDraft.reel_audio_url ? (
                                    <button type="button" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-black text-red-600 shadow-sm" onClick={clearMusic} disabled={Boolean(working)}>Remove music</button>
                                ) : null}
                                <p className="mt-2 text-xs font-semibold leading-5 text-[var(--muted)]">Use music only if the license allows social posts for your business.</p>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-[var(--ink)]">Images selected</p>
                                    <p className="text-xs font-semibold text-[var(--muted)]">{selectedImageProducts.length} of {productsWithImages.length} images</p>
                                </div>
                                {hasInventoryImages ? (
                                    <button type="button" className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-xs font-black text-[var(--accent)] shadow-sm" onClick={() => setSelectedImageIds(productsWithImages.slice(0, 8).map((product) => product.id))}>Select first 8</button>
                                ) : null}
                            </div>
                            {hasInventoryImages ? (
                                <div className="mt-4 grid max-h-[560px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2">
                                    {productsWithImages.slice(0, 18).map((product) => {
                                        const imageUrl = product.cleaned_image_url || product.image_url;
                                        const selected = selectedImageIds.includes(product.id);
                                        return (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => toggleProductImage(product.id)}
                                                className={`group overflow-hidden rounded-[22px] border bg-white text-left shadow-sm transition hover:-translate-y-0.5 ${selected ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/15" : "border-[var(--border)] hover:border-[var(--accent)]/40"}`}
                                                title={productName(product)}
                                            >
                                                <div className="relative aspect-square">
                                                    <img src={imageUrl} alt={productName(product)} className="h-full w-full object-cover" />
                                                    <span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[10px] font-black ${selected ? "bg-[var(--accent)] text-white" : "bg-white/85 text-[var(--muted)]"}`}>{selected ? "Added" : "Pick"}</span>
                                                </div>
                                                <p className="truncate px-3 py-2 text-xs font-bold text-[var(--ink)]">{productName(product)}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="mt-4 rounded-xl bg-[var(--surface)] px-3 py-3 text-xs font-semibold text-[var(--muted)]">No product images found. Upload a reel video instead, or add product images from Products.</p>
                            )}
                        </section>

                        <section className="dashboard-panel p-5 xl:sticky xl:top-5">
                            <div className="flex items-center justify-between gap-3">
                                <SectionHeading title="Live preview" description="Phone-style reel preview." />
                                <span className={`dashboard-badge ${reelDraft.reel_status === "published" ? "badge-green" : reelDraft.reel_status === "failed" ? "badge-red" : "badge-blue"}`}>{String(reelDraft.reel_status || "not_created").replace(/_/g, " ")}</span>
                            </div>
                            <div className="mt-5 overflow-hidden rounded-[28px] border-[8px] border-[#101820] bg-[#0B1420] shadow-[0_24px_60px_rgba(16,32,46,0.2)]">
                                <div className="relative aspect-[9/16] bg-[#111827]">
                                    {reelDraft.reel_video_url ? (
                                        <video src={reelDraft.reel_video_url} className="h-full w-full object-cover" controls playsInline />
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/70">
                                            <Film className="h-10 w-10" />
                                            <p className="max-w-52 text-sm font-semibold">Upload a video or create one from inventory images.</p>
                                        </div>
                                    )}
                                    <div className="pointer-events-none absolute inset-x-4 bottom-5 rounded-2xl bg-black/38 p-3 text-white backdrop-blur">
                                        <p className="text-sm font-bold">{productName(reelDraft)}</p>
                                        <p className="text-xs text-white/80">{reelDraft.price ? formatINR(reelDraft.price) : "No price"} · {reelDraft.reel_cta || "DM to order"}</p>
                                    </div>
                                </div>
                            </div>
                            {progress ? <div className="mt-4 rounded-full bg-[var(--surface)] p-1"><div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div> : null}
                            {reelDraft.reel_audio_url ? (
                                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                    <div className="flex items-center gap-2 text-sm font-black text-[var(--ink)]"><Music className="h-4 w-4 text-[var(--accent)]" />Music attached</div>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">For uploaded videos, use Edit reel → Save edited video to bake this music into the publishable file.</p>
                                </div>
                            ) : null}
                            {reelDraft.reel_video_url ? (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button type="button" className="btn-secondary justify-center" disabled={Boolean(working)} onClick={() => setShowEditor((value) => !value)}><SlidersHorizontal className="h-4 w-4" />{showEditor ? "Hide editor" : "Edit reel"}</button>
                                    <button type="button" className="btn-secondary justify-center" disabled={Boolean(working)} onClick={clearVideo}>{working === "clear-video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Clear video</button>
                                    <button type="button" className="btn-primary col-span-2 justify-center" disabled={Boolean(working)} onClick={openEnhancer}><Sparkles className="h-4 w-4" />Make it Premium</button>
                                    <a href={reelDraft.reel_video_url} download target="_blank" rel="noreferrer" className="btn-secondary col-span-2 justify-center"><Download className="h-4 w-4" />Download Current Reel</a>
                                </div>
                            ) : null}
                        </section>

                        <section className="grid gap-5">
                            <div className="dashboard-panel p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <SectionHeading title="AI Reel Enhancer" description="Choose a premium template, add overlays, and generate a polished reel." />
                                    <span className="dashboard-badge badge-blue">
                                        {usage?.active ? `${usage.enhancedReelsRemaining}/${usage.enhancedReelsLimit} left` : "Premium"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-primary mt-4 w-full justify-center"
                                    disabled={Boolean(working) || !reelDraft.reel_video_url}
                                    onClick={openEnhancer}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Choose Reel Style
                                </button>
                                {usage && !usage.active ? (
                                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800">Enhanced reels unlock after your ORVA account is active. Basic reels remain available.</p>
                                ) : null}
                                {!reelDraft.reel_video_url ? (
                                    <p className="mt-3 rounded-xl bg-[var(--surface)] px-3 py-3 text-xs font-semibold text-[var(--muted)]">Upload a reel video or create one from selected product images to use the enhancer.</p>
                                ) : null}
                            </div>

                            {enhancerOpen ? (
                                <div className="dashboard-panel p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <SectionHeading title="Choose Reel Style" description="Template-based enhancement for premium local business reels." />
                                        <button type="button" className="btn-secondary" disabled={Boolean(working)} onClick={() => setEnhancerOpen(false)}>Cancel</button>
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {reelTemplates.map((template) => {
                                            const selected = selectedTemplate.id === template.id;
                                            return (
                                                <button
                                                    key={template.id}
                                                    type="button"
                                                    className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${selected ? "border-[var(--accent)] bg-[var(--accent-light)] ring-4 ring-[var(--accent)]/15" : "border-[var(--border)] bg-white hover:border-[var(--accent)]/50"}`}
                                                    onClick={() => selectEnhancerTemplate(template)}
                                                >
                                                    <p className="text-sm font-black text-[var(--ink)]">{template.name}</p>
                                                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--muted)]">{template.description}</p>
                                                    <p className="mt-3 rounded-full bg-white/75 px-3 py-1 text-[11px] font-black text-[var(--accent)]">{template.bestFor}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                                        <label className="grid gap-2 text-sm font-semibold">Hook text<input className="form-field" value={enhanceOptions.hookText} onChange={(event) => setEnhanceOptions((current) => ({ ...current, hookText: event.target.value }))} /></label>
                                        <label className="grid gap-2 text-sm font-semibold">CTA text<input className="form-field" value={enhanceOptions.ctaText} onChange={(event) => setEnhanceOptions((current) => ({ ...current, ctaText: event.target.value }))} /></label>
                                        <label className="grid gap-2 text-sm font-semibold">Music style
                                            <select className="form-field" value={enhanceOptions.musicStyle} onChange={(event) => setEnhanceOptions((current) => ({ ...current, musicStyle: event.target.value }))}>
                                                {reelMusicStyles.map((style) => <option key={style} value={style}>{style === "no_music" ? "No music" : style.charAt(0).toUpperCase() + style.slice(1)}</option>)}
                                            </select>
                                        </label>
                                        <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-semibold">
                                            <label className="flex items-center gap-3"><input type="checkbox" checked={enhanceOptions.showPriceOverlay} onChange={(event) => setEnhanceOptions((current) => ({ ...current, showPriceOverlay: event.target.checked }))} />Show price overlay</label>
                                            <label className="flex items-center gap-3"><input type="checkbox" checked={enhanceOptions.showOfferBadge} onChange={(event) => setEnhanceOptions((current) => ({ ...current, showOfferBadge: event.target.checked }))} />Show offer badge</label>
                                            <label className="flex items-center gap-3"><input type="checkbox" checked={enhanceOptions.showWatermark} onChange={(event) => setEnhanceOptions((current) => ({ ...current, showWatermark: event.target.checked }))} />Add ORVA watermark</label>
                                        </div>
                                    </div>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                                        <p className="rounded-xl bg-[var(--surface)] px-3 py-3 text-xs font-semibold leading-5 text-[var(--muted)]">Premium rendering uses selected inventory images{reelDraft.reel_audio_url ? " and your selected music" : ""}. Basic reel stays safe if enhancement fails.</p>
                                        <button type="button" className="btn-primary justify-center" disabled={Boolean(working) || !selectedImageProducts.length} onClick={generatePremiumReel}>
                                            {working === "premium-reel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                            Generate Premium Reel
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {showEditor && reelDraft.reel_video_url ? (
                                <div className="dashboard-panel p-5">
                                    <SectionHeading title="Edit reel" description="Trim, enhance, and apply text overlay before publishing." />
                                    <div className="mt-4 grid gap-3">
                                        <label className="grid gap-2 text-sm font-semibold">Filter
                                            <select className="form-field" value={videoEdit.filter} onChange={(event) => setVideoEdit((current) => ({ ...current, filter: event.target.value }))}>
                                                {Object.entries(videoFilterOptions).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
                                            </select>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="grid gap-2 text-sm font-semibold">Start sec<input className="form-field" type="number" min="0" max="60" value={videoEdit.startAt} onChange={(event) => setVideoEdit((current) => ({ ...current, startAt: event.target.value }))} /></label>
                                            <label className="grid gap-2 text-sm font-semibold">Length sec<input className="form-field" type="number" min="3" max="25" value={videoEdit.duration} onChange={(event) => setVideoEdit((current) => ({ ...current, duration: event.target.value }))} /></label>
                                        </div>
                                        <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold">
                                            <input type="checkbox" checked={videoEdit.overlay} onChange={(event) => setVideoEdit((current) => ({ ...current, overlay: event.target.checked }))} />
                                            Add title, price, and CTA overlay
                                        </label>
                                        {reelDraft.reel_audio_url ? (
                                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--mid)]">
                                                <Music className="mr-2 inline h-4 w-4 text-[var(--accent)]" />
                                                Save edited video will include: {reelDraft.reel_audio_track_name || "uploaded music"}
                                            </div>
                                        ) : null}
                                        <button type="button" className="btn-primary justify-center" disabled={Boolean(working)} onClick={applyVideoEdits}>{working === "edit-video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Save edited video</button>
                                    </div>
                                </div>
                            ) : null}
                            {!showEditor || !reelDraft.reel_video_url ? (
                                <div className="dashboard-panel p-5">
                                    <SectionHeading title="Edit reel" description="Upload or create a reel, then open the editor for trim, filter, and overlay controls." />
                                    <button type="button" className="btn-secondary mt-4 justify-center" disabled={!reelDraft.reel_video_url} onClick={() => setShowEditor(true)}><SlidersHorizontal className="h-4 w-4" />Open editor</button>
                                </div>
                            ) : null}

                        <div className="dashboard-panel p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <SectionHeading title="AI caption and overlays" description="Generate caption text, edit overlays, then publish only when ready." />
                            </div>
                            <div className="action-grid mt-5">
                                <button type="button" className="btn-primary" disabled={working === "generate" || !reelDraft.reel_video_url} onClick={generateContent}>{working === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Generate AI Caption from Reel</button>
                                <button type="button" className="btn-secondary" onClick={copyCaption}><Copy className="h-4 w-4" />Copy Caption</button>
                                <button type="button" className="btn-secondary" disabled={working === "save"} onClick={saveCopy}>{working === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                <label className="grid gap-2 text-sm font-semibold">Reel title<input className="form-field" value={reelDraft.name || ""} onChange={(event) => updateDraft("name", event.target.value)} placeholder="New collection reel" /></label>
                                <label className="grid gap-2 text-sm font-semibold">Price / offer<input className="form-field" value={reelDraft.price || ""} onChange={(event) => updateDraft("price", event.target.value)} placeholder="1299" /></label>
                                <label className="grid gap-2 text-sm font-semibold">Hook<input className="form-field" value={reelDraft.reel_hook || ""} onChange={(event) => updateDraft("reel_hook", event.target.value)} placeholder="New arrival for you" /></label>
                                <label className="grid gap-2 text-sm font-semibold">CTA<input className="form-field" value={reelDraft.reel_cta || ""} onChange={(event) => updateDraft("reel_cta", event.target.value)} placeholder="DM to order" /></label>
                                <label className="grid gap-2 text-sm font-semibold md:col-span-2">Caption<textarea className="form-field min-h-28" value={reelDraft.reel_caption || ""} onChange={(event) => updateDraft("reel_caption", event.target.value)} /></label>
                                <label className="grid gap-2 text-sm font-semibold md:col-span-2">Hashtags<input className="form-field" value={reelDraft.reel_hashtags || ""} onChange={(event) => updateDraft("reel_hashtags", event.target.value)} placeholder="#ShopLocal #SmallBusiness #NewArrival #ORVA" /></label>
                            </div>
                            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Full caption preview</p>
                                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--mid)]">{caption}</p>
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <SectionHeading title="Publish" description="Publish to connected channels, or use copy/download as fallback." />
                                </div>
                                <button type="button" className="btn-primary justify-center" disabled={Boolean(working) || !reelDraft.reel_video_url} onClick={() => publish("instagram")}>{working === "instagram" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}Publish Instagram Reel</button>
                                <button type="button" className="btn-secondary justify-center" disabled={Boolean(working) || !reelDraft.reel_video_url} onClick={() => publish("facebook")}>{working === "facebook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Publish Facebook Reel</button>
                            </div>
                        </div>
                        </section>
                        </div>
                    </div>
                )}
                {musicModalOpen ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
                        <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/40 bg-white shadow-2xl">
                            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">ORVA music library</p>
                                    <h2 className="mt-1 text-2xl font-black text-[var(--ink)]">Choose reel music</h2>
                                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--muted)]">Preview licensed tracks, then select one for your reel. The final video will include music after you save, enhance, or publish it.</p>
                                </div>
                                <button type="button" className="btn-secondary shrink-0" onClick={() => setMusicModalOpen(false)}>Close</button>
                            </div>
                            <div className="max-h-[68vh] overflow-y-auto p-5">
                                {reelMusicLibrary.length ? (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {reelMusicLibrary.map((track) => {
                                            const selected = reelDraft.reel_audio_url === track.url;
                                            return (
                                                <div
                                                    key={track.id}
                                                    className={`rounded-2xl border p-4 shadow-sm transition ${selected ? "border-[var(--accent)] bg-[var(--accent-light)] ring-4 ring-[var(--accent)]/10" : "border-[var(--border)] bg-white"}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-base font-black text-[var(--ink)]">{track.name}</p>
                                                            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{track.mood}</p>
                                                        </div>
                                                        <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">{track.style}</span>
                                                    </div>
                                                    <p className="mt-3 text-sm font-semibold leading-6 text-[var(--mid)]">{track.bestFor}</p>
                                                    <audio className="mt-3 w-full" src={track.url} controls preload="metadata" />
                                                    <button
                                                        type="button"
                                                        onClick={() => selectLibraryMusic(track)}
                                                        disabled={Boolean(working)}
                                                        className={selected ? "btn-secondary mt-3 w-full justify-center" : "btn-primary mt-3 w-full justify-center"}
                                                    >
                                                        <Volume2 className="h-4 w-4" />
                                                        {selected ? "Selected" : "Use this music"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                                        <Music className="mx-auto h-8 w-8 text-[var(--accent)]" />
                                        <p className="mt-3 text-lg font-black text-[var(--ink)]">No library tracks added yet</p>
                                        <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--muted)]">Add licensed MP3/WAV files to <span className="font-black text-[var(--ink)]">public/orva-music</span> and list them in <span className="font-black text-[var(--ink)]">app/lib/reels.js</span>.</p>
                                    </div>
                                )}
                                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                                    <p className="text-sm font-black text-[var(--ink)]">Have your own audio?</p>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">Upload custom audio only if you own it or have permission to use it in business social media posts.</p>
                                    <label className="btn-secondary mt-3 cursor-pointer justify-center">
                                        {working === "upload-audio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        Upload licensed audio
                                        <input className="sr-only" type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg" onChange={uploadMusic} disabled={working === "upload-audio"} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DashboardShell>
        </AuthGate>
    );
}
