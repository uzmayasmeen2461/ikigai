"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactCrop from "react-image-crop";
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    FileArchive,
    ImageIcon,
    Loader2,
    Sparkles,
    Star,
    Trash2,
    Upload,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { AuthGate } from "../AuthGate";
import { DashboardShell } from "../DashboardShell";
import { EmptyState, ErrorState, FeedbackMessage, SectionHeading, StatCard } from "../DashboardUI";
import { formatINR } from "../../app/lib/pricing";
import {
    cleanText,
    generateProductCode,
    normalizeInventoryStatus,
    productCode,
    productName,
    sampleInventoryCsv,
    toInteger,
} from "../../app/lib/inventory";
import { createCenteredCrop, getCroppedImg } from "../../app/lib/image/cropImage";
import {
    facebookMarketplaceCsv,
    generateProductContent,
    instagramContentPlanCsv,
    missingProductFields,
    normalizeFileStem,
    productCopyPaste,
    productReadyForExport,
    productStudioGuide,
    productStudioSteps,
    whatsappCatalogCsv,
} from "../../app/lib/productStudio";

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
    const headers = parseCsvLine(lines[0]).map((header) => header.trim());

    return lines.slice(1).map((line, index) => {
        const cells = parseCsvLine(line);
        const raw = {};
        headers.forEach((header, cellIndex) => {
            raw[header] = cells[cellIndex] || "";
        });

        const product = {
            row_number: index + 2,
            product_name: raw["Product Name"] || raw.product_name || raw.Name || "",
            category: raw.Category || raw.category || "",
            price: raw.Price || raw.price || "",
            stock: raw.Stock || raw.stock || "0",
            product_code: raw["Product Code"] || raw.product_code || raw.SKU || "",
            notes: raw.Notes || raw.notes || "",
        };
        const errors = [];
        if (!product.product_name) errors.push("Product Name required");
        if (product.price && Number.isNaN(Number(product.price))) errors.push("Price must be numeric");
        if (product.stock && Number.isNaN(Number(product.stock))) errors.push("Stock must be numeric");
        return { ...product, errors };
    });
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

function fileToImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            stem: normalizeFileStem(file.name),
            url: reader.result,
            originalUrl: reader.result,
            file,
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function isDataImage(value = "") {
    return String(value || "").startsWith("data:image/");
}

function compressDataImage(dataUrl, { maxSize = 1100, quality = 0.72 } = {}) {
    if (!isDataImage(dataUrl)) return Promise.resolve(dataUrl || "");

    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (!context) return resolve(dataUrl);
            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
    });
}

function chunkArray(items, size = 6) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        if (response.status === 413) {
            return { error: "The product images are too large for one upload. ORVA compressed them, so please click Upload Product List again." };
        }
        if (String(text).trim().startsWith("<")) {
            return { error: `The server returned an HTML error page (${response.status}). Please try again after redeploying the latest ORVA build.` };
        }
        return { error: `The server returned an invalid response (${response.status}).` };
    }
}

function useSessionToken() {
    return useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || "";
    }, []);
}

function serializeProduct(row, index = 1) {
    const stock = Math.max(0, toInteger(row.stock, 0));
    const name = cleanText(row.product_name);
    return {
        product_name: name,
        product_code: cleanText(row.product_code).toUpperCase() || generateProductCode(name, index),
        category: cleanText(row.category),
        price: Math.max(0, toInteger(row.price, 0)),
        stock,
        status: normalizeInventoryStatus(stock, "draft"),
        notes: cleanText(row.notes),
        image_url: row.image_url || "",
        cleaned_image_url: row.cleaned_image_url || "",
        is_featured: Boolean(row.is_featured),
    };
}

function normalizeMatchText(value = "") {
    return cleanText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function matchScore(image, product) {
    const imageStem = normalizeMatchText(image.stem || image.name);
    const code = normalizeMatchText(productCode(product));
    const name = normalizeMatchText(productName(product));
    const category = normalizeMatchText(product.category || "");

    if (!imageStem) return 0;
    if (code && imageStem === code) return 100;
    if (code && (imageStem.includes(code) || code.includes(imageStem))) return 90;
    if (name && (imageStem.includes(name) || name.includes(imageStem))) return 72;

    const imageTokens = new Set(imageStem.split(" ").filter((token) => token.length > 2));
    const productTokens = new Set(`${name} ${category}`.split(" ").filter((token) => token.length > 2));
    let overlap = 0;
    imageTokens.forEach((token) => {
        if (productTokens.has(token)) overlap += 1;
    });

    return overlap ? 45 + overlap * 8 : 0;
}

function ProductImage({ product }) {
    const image = product.cleaned_image_url || product.image_url;
    if (!image) {
        return (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <ImageIcon className="h-5 w-5" />
            </div>
        );
    }

    return <div className="h-14 w-14 shrink-0 rounded-xl border border-[var(--border)] bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />;
}

function getImageExtension(url = "", fallback = "jpg") {
    if (url.startsWith("data:image/png")) return "png";
    if (url.startsWith("data:image/webp")) return "webp";
    if (url.startsWith("data:image/jpeg") || url.startsWith("data:image/jpg")) return "jpg";
    return fallback;
}

function filteredImageDataUrl(imageUrl, filter = "studio") {
    const filters = {
        studio: "brightness(1.06) contrast(1.08) saturate(1.08)",
        bright: "brightness(1.12) contrast(1.04) saturate(1.04)",
        warm: "brightness(1.04) contrast(1.05) saturate(1.16) sepia(0.08)",
        crisp: "brightness(1.03) contrast(1.16) saturate(1.06)",
    };

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            context.filter = filters[filter] || filters.studio;
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        image.onerror = reject;
        image.src = imageUrl;
    });
}

function photoProductName(fileName = "", index = 1) {
    const stem = normalizeFileStem(fileName)
        .replace(/[-_]+/g, " ")
        .replace(/[^a-z0-9 ]/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
    const tokens = stem.split(" ").filter(Boolean);
    const hasReadableWord = tokens.some((token) => /[aeiou]/i.test(token) && token.length >= 3 && token.length <= 18);
    const looksLikeRandomId = !hasReadableWord || tokens.some((token) => token.length > 24) || stem.length > 48;

    if (looksLikeRandomId) return `Product ${String(index).padStart(2, "0")}`;
    return stem || `Product ${String(index).padStart(2, "0")}`;
}

export function ProductStudio({ role = "client", taskId = "", channel = "", workflow = "inventory" }) {
    const shellRole = role === "admin" ? "admin" : role === "partner" ? "partner" : "client";
    const allowedRole = role === "admin" ? "admin" : role === "partner" ? "partner" : "client";
    const canGenerateAndExport = role === "partner" || role === "admin";
    const getToken = useSessionToken();
    const [products, setProducts] = useState([]);
    const [outputs, setOutputs] = useState({});
    const [images, setImages] = useState([]);
    const [manualMatches, setManualMatches] = useState({});
    const [previewRows, setPreviewRows] = useState([]);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [task, setTask] = useState(null);
    const [pendingDeleteId, setPendingDeleteId] = useState("");
    const [imageBusyId, setImageBusyId] = useState("");
    const [activeImageId, setActiveImageId] = useState("");
    const [cropMode, setCropMode] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const cropImageRef = useRef(null);

    const featuredProducts = useMemo(() => {
        const featured = products.filter((product) => product.is_featured);
        return featured.length ? featured : products;
    }, [products]);
    const exportableProducts = useMemo(() => featuredProducts.filter(productReadyForExport), [featuredProducts]);
    const unmatchedImages = useMemo(() => images.filter((image) => !image.productId), [images]);
    const matchedImages = useMemo(() => images.filter((image) => image.productId), [images]);
    const draftProducts = useMemo(() => products.filter((product) => String(product.id).startsWith("draft-")), [products]);
    const hasUnsavedDrafts = draftProducts.length > 0;
    const validPreviewRows = useMemo(() => previewRows.filter((row) => !row.errors?.length), [previewRows]);
    const activeImage = useMemo(() => images.find((image) => image.id === activeImageId) || null, [activeImageId, images]);
    const exportChannel = channel === "whatsapp" || channel === "instagram" ? channel : "";
    const photosOnlyFlow = workflow === "photos";
    const exportTitle = exportChannel === "whatsapp"
        ? "WhatsApp Catalog Export"
        : exportChannel === "instagram"
            ? "Instagram Post Export"
            : "Export Kit";
    const exportDescription = exportChannel === "whatsapp"
        ? "Download catalog.csv, ready-to-copy product text, and product images for WhatsApp Business."
        : exportChannel === "instagram"
            ? "Download reviewed captions, hashtags, a content plan, and product images for Instagram."
            : "Review first. Exports are ready-to-upload files, not direct posting.";

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        if (role === "partner" && !taskId) {
            setError("Open Product Studio from an assigned paid task.");
            setLoading(false);
            return;
        }
        const token = await getToken();
        const endpoint = taskId ? `/api/product-studio/task/${taskId}` : "/api/inventory";
        const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJson(response);
        if (!response.ok) {
            setError(result.error || "Could not load Product Studio.");
            setLoading(false);
            return;
        }
        setTask(result.task || null);
        setProducts((result.products || []).map((product) => ({ ...product, is_featured: Boolean(product.is_featured) })));
        const outputMap = {};
        (result.outputs || []).forEach((output) => {
            outputMap[output.product_id] = output;
        });
        setOutputs(outputMap);
        setLoading(false);
    }, [getToken, role, taskId]);

    useEffect(() => {
        queueMicrotask(load);
    }, [load]);

    useEffect(() => {
        setCropMode(false);
        setCrop(undefined);
        setCompletedCrop(null);
        cropImageRef.current = null;
    }, [activeImageId]);

    const createMatchedDraftList = () => {
        if (!validPreviewRows.length) {
            setMessage({ type: "error", text: "Upload a valid inventory CSV before matching images." });
            return;
        }
        if (!images.length) {
            setMessage({ type: "error", text: "Upload product images before matching." });
            return;
        }

        setMessage({ type: "", text: "" });

        const stamp = Date.now();
        const savedProducts = products.filter((product) => !String(product.id).startsWith("draft-"));
        const draftList = validPreviewRows.map((row, index) => ({
            ...serializeProduct(row, savedProducts.length + index + 1),
                id: `draft-${stamp}-${index}`,
                is_featured: true,
        }));

        const usedProductIds = new Set();
        let matchedCount = 0;
        const nextImages = images.map((image) => {
            const best = draftList
                .filter((product) => !usedProductIds.has(product.id))
                .map((product) => ({ product, score: matchScore(image, product) }))
                .sort((a, b) => b.score - a.score)[0];

            if (!best || best.score < 45) return { ...image, productId: "", matchedCode: "", aiMatched: false };

            usedProductIds.add(best.product.id);
            matchedCount += 1;
            return {
                ...image,
                productId: best.product.id,
                matchedCode: productCode(best.product),
                aiMatched: true,
            };
        });

        const imageByProduct = new Map(nextImages.filter((image) => image.productId).map((image) => [image.productId, image.url]));
        const matchedDraftList = draftList.map((product) => ({
            ...product,
            image_url: imageByProduct.get(product.id) || product.image_url || "",
        }));

        setProducts([...matchedDraftList, ...savedProducts]);
        setImages(nextImages);
        setMessage({
            type: matchedCount ? "success" : "error",
            text: matchedCount
                ? `AI matched ${matchedCount} image${matchedCount === 1 ? "" : "s"} and created a demo product list below. Review it, adjust any unmatched images, then save products.`
                : "AI could not confidently match images. A demo product list was created below; please manually assign images before saving.",
        });
    };

    const handleInventoryFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPreviewRows(parseInventoryCsv(await file.text()));
        setMessage({ type: "", text: "" });
    };

    const loadDemoProducts = async () => {
        if (role !== "client") return;
        setSaving(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch("/api/inventory/demo", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJson(response);
        setSaving(false);
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not load demo products." });
            return;
        }
        setProducts(result.products || []);
        setMessage({ type: "success", text: "Demo products loaded." });
    };

    const handleImages = async (event) => {
        const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 50);
        const nextImages = await Promise.all(files.map(fileToImage));
        setImages((current) => [...current, ...nextImages].slice(0, 50));
        setMessage({
            type: "success",
            text: "Images uploaded. Upload inventory too, then click Match Images with AI.",
        });
    };

    const updateImagePrice = (imageId, price) => {
        setImages((current) => current.map((image) => (
            image.id === imageId ? { ...image, price: price.replace(/[^\d]/g, "") } : image
        )));
    };

    const updateUploadedImage = (imageId, patch) => {
        setImages((current) => current.map((image) => (
            image.id === imageId ? { ...image, ...patch } : image
        )));
    };

    const resetUploadedImage = (image) => {
        if (!image?.originalUrl) return;
        updateUploadedImage(image.id, { url: image.originalUrl, edited: false });
        setMessage({ type: "success", text: "Photo reset to original upload." });
    };

    const startManualCrop = () => {
        setCropMode(true);
        setCrop(undefined);
        setCompletedCrop(null);
    };

    const handleCropImageLoad = (event) => {
        cropImageRef.current = event.currentTarget;
        const nextCrop = createCenteredCrop(event.currentTarget.clientWidth, event.currentTarget.clientHeight);
        setCrop(nextCrop);
        setCompletedCrop(nextCrop);
    };

    const saveManualCrop = async (image) => {
        if (!cropImageRef.current || !completedCrop?.width || !completedCrop?.height) {
            setMessage({ type: "error", text: "Select an area before saving the crop." });
            return;
        }

        try {
            setImageBusyId(image.id);
            const { previewUrl } = await getCroppedImg(cropImageRef.current, completedCrop, `${image.stem || "orva-product"}-crop.png`);
            updateUploadedImage(image.id, { url: previewUrl, edited: true });
            setCropMode(false);
            setCrop(undefined);
            setCompletedCrop(null);
            setMessage({ type: "success", text: "Crop saved. This edited photo will be used for inventory." });
        } catch {
            setMessage({ type: "error", text: "Could not crop this photo." });
        } finally {
            setImageBusyId("");
        }
    };

    const applyUploadedImageFilter = async (image, filter) => {
        try {
            setImageBusyId(image.id);
            const filtered = await filteredImageDataUrl(image.url, filter);
            updateUploadedImage(image.id, { url: filtered, edited: true });
            setMessage({ type: "success", text: "Photo filter applied." });
        } catch {
            setMessage({ type: "error", text: "Could not apply this photo filter." });
        } finally {
            setImageBusyId("");
        }
    };

    const enhanceUploadedImage = async (image) => {
        setImageBusyId(image.id);
        setMessage({ type: "", text: "" });
        try {
            const token = await getToken();
            const response = await fetch("/api/product-studio/enhance-image", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ image_url: image.url }),
            });
            const result = await readJson(response);
            if (!response.ok || !result.image_url) {
                const fallback = await filteredImageDataUrl(image.url, "studio");
                updateUploadedImage(image.id, { url: fallback, edited: true });
                setMessage({
                    type: "warning",
                    text: result.error || "AI enhancement is not configured. ORVA applied a clean studio filter instead.",
                });
                return;
            }
            updateUploadedImage(image.id, { url: result.image_url, edited: true });
            setMessage({ type: "success", text: "Photo enhanced. Add the price, then create inventory." });
        } catch {
            try {
                const fallback = await filteredImageDataUrl(image.url, "studio");
                updateUploadedImage(image.id, { url: fallback, edited: true });
                setMessage({ type: "warning", text: "AI enhancement failed. ORVA applied a clean studio filter instead." });
            } catch {
                setMessage({ type: "error", text: "Could not enhance this photo." });
            }
        } finally {
            setImageBusyId("");
        }
    };

    const createPhotoDraftInventory = async () => {
        if (!images.length) {
            setMessage({ type: "error", text: "Upload product photos first." });
            return;
        }

        const missingPrice = images.some((image) => !(Number(image.price) > 0));
        if (missingPrice) {
            setMessage({ type: "error", text: "Enter a price below every photo before creating inventory." });
            return;
        }

        setSaving(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const analyses = await Promise.all(images.map(async (image, index) => {
            try {
                const response = await fetch("/api/product-studio/analyze-photo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        image_url: image.url,
                        price: image.price,
                        index: index + 1,
                    }),
                });
                const result = await readJson(response);
                if (!response.ok) {
                    return {
                        title: photoProductName(image.name, index + 1),
                        category: "Photo upload",
                        description: result.error || "Review this product description before publishing.",
                        warning: result.error,
                    };
                }
                return result;
            } catch {
                return {
                    title: photoProductName(image.name, index + 1),
                    category: "Photo upload",
                    description: "Review this product description before publishing.",
                    warning: "Could not read one image with AI.",
                };
            }
        }));

        const stamp = Date.now();
        const savedProducts = products.filter((product) => !String(product.id).startsWith("draft-"));
        const draftList = images.map((image, index) => {
            const analysis = analyses[index] || {};
            const name = cleanText(analysis.title) || photoProductName(image.name, index + 1);
            const stock = 1;
            const code = generateProductCode(name, savedProducts.length + index + 1);
            return {
                product_name: name,
                product_code: code,
                category: cleanText(analysis.category) || "Photo upload",
                price: Math.max(0, toInteger(image.price, 0)),
                stock,
                status: normalizeInventoryStatus(stock),
                notes: cleanText(analysis.description) || "Review product name, category, and stock before publishing.",
                image_url: image.url,
                cleaned_image_url: "",
                is_featured: true,
                id: `draft-${stamp}-${index}`,
            };
        });

        setProducts([...draftList, ...savedProducts]);
        setImages((current) => current.map((image, index) => ({
            ...image,
            productId: draftList[index]?.id || "",
            matchedCode: draftList[index]?.product_code || "",
            aiMatched: true,
        })));
        setSaving(false);
        const fallbackCount = analyses.filter((item) => item.warning || item.configured === false).length;
        setMessage({
            type: fallbackCount ? "warning" : "success",
            text: fallbackCount
                ? `Demo inventory created. ${fallbackCount} item${fallbackCount === 1 ? "" : "s"} used fallback text, so review before uploading.`
                : "AI read your photos and created a demo inventory list with titles, categories, and descriptions.",
        });
    };

    const aiMatchImages = () => {
        if (!images.length) {
            setMessage({ type: "error", text: "Upload product images before matching." });
            return;
        }
        if (!products.length) {
            setMessage({ type: "error", text: "Upload inventory first, then click Match Images with AI to create the demo list." });
            return;
        }

        const usedProductIds = new Set(images.filter((image) => image.productId).map((image) => image.productId));
        let matchedCount = 0;

        const nextImages = images.map((image) => {
            if (image.productId) return image;

            const best = products
                .filter((product) => !usedProductIds.has(product.id))
                .map((product) => ({ product, score: matchScore(image, product) }))
                .sort((a, b) => b.score - a.score)[0];

            if (!best || best.score < 45) return image;

            usedProductIds.add(best.product.id);
            matchedCount += 1;
            return {
                ...image,
                productId: best.product.id,
                matchedCode: productCode(best.product),
                aiMatched: true,
            };
        });

        setImages(nextImages);
        setMessage({
            type: matchedCount ? "success" : "error",
            text: matchedCount
                ? `AI matched ${matchedCount} image${matchedCount === 1 ? "" : "s"}. Review and save image links.`
                : "AI could not confidently match images. Use manual matching below.",
        });
    };

    const applyImageMatches = async () => {
        const nextImages = images.map((image) => {
            const productId = image.productId || manualMatches[image.id];
            const product = products.find((item) => item.id === productId);
            return product ? { ...image, productId, matchedCode: productCode(product) } : image;
        });
        setImages(nextImages);

        const imageByProduct = new Map(nextImages.filter((image) => image.productId).map((image) => [image.productId, image.url]));
        setProducts((current) => current.map((product) => imageByProduct.has(product.id) ? { ...product, image_url: imageByProduct.get(product.id) } : product));

        if (role === "client" || role === "admin") {
            const token = await getToken();
            await Promise.all([...imageByProduct.entries()].filter(([productId]) => !String(productId).startsWith("draft-")).map(([productId, imageUrl]) => (
                fetch(`/api/inventory/${productId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ image_url: imageUrl, note: "Image matched in ORVA Product Studio." }),
                })
            )));
        }

        setMessage({ type: "success", text: hasUnsavedDrafts ? "Image matches applied to staged products. Click Save Products to upload the final product list." : "Image matches saved." });
    };

    const updateProduct = async (product, patch) => {
        const updated = { ...product, ...patch };
        setProducts((current) => current.map((item) => item.id === product.id ? updated : item));
        if (String(product.id).startsWith("draft-") || role === "partner") return;

        const token = await getToken();
        await fetch(`/api/inventory/${product.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(patch),
        });
    };

    const deleteProduct = async (product) => {
        if (role !== "client") return;

        if (String(product.id).startsWith("draft-")) {
            setProducts((current) => current.filter((item) => item.id !== product.id));
            setImages((current) => current.filter((image) => image.productId !== product.id));
            setPendingDeleteId("");
            setMessage({ type: "success", text: "Draft product removed." });
            return;
        }

        if (pendingDeleteId !== product.id) {
            setPendingDeleteId(product.id);
            setMessage({ type: "error", text: `Click Confirm Delete to remove ${productName(product)}.` });
            return;
        }

        setSaving(true);
        setMessage({ type: "", text: "" });
        const token = await getToken();
        const response = await fetch(`/api/inventory/${product.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readJson(response);
        setSaving(false);
        setPendingDeleteId("");
        if (!response.ok) {
            setMessage({ type: "error", text: result.error || "Could not delete product." });
            return;
        }
        setProducts((current) => current.filter((item) => item.id !== product.id));
        setImages((current) => current.filter((image) => image.productId !== product.id));
        setMessage({ type: "success", text: "Product deleted." });
    };

    const generateContent = async () => {
        const selected = featuredProducts.filter((product) => productName(product) && Number(product.price || 0) > 0);
        if (!selected.length) {
            setMessage({ type: "error", text: "Add product name and price before generating content." });
            return;
        }
        const nextOutputs = { ...outputs };
        selected.forEach((product) => {
            nextOutputs[product.id] = generateProductContent(product);
        });
        setOutputs(nextOutputs);
        setMessage({ type: "success", text: "Content generated for selected products." });

        if (taskId) {
            const token = await getToken();
            await fetch("/api/product-studio/outputs", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    task_id: taskId,
                    outputs: selected.map((product) => ({
                        product_id: product.id,
                        ...nextOutputs[product.id],
                    })),
                }),
            });
        }
    };

    const saveDraftProducts = async () => {
        const validDrafts = draftProducts.filter((product) => productName(product));
        if (!validDrafts.length) {
            setMessage({ type: "error", text: "Add at least a product name before saving drafts." });
            return;
        }
        setSaving(true);
        const token = await getToken();
        const compressedProducts = await Promise.all(validDrafts.map(async (product) => ({
            ...product,
            image_url: await compressDataImage(product.image_url),
            cleaned_image_url: await compressDataImage(product.cleaned_image_url),
        })));

        const savedProducts = [];
        let result = {};
        let failedResponse = null;
        for (const batch of chunkArray(compressedProducts, 6)) {
            const response = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    client_id: task?.client_id,
                    products: batch.map((product) => ({
                        ...product,
                        status: normalizeInventoryStatus(product.stock),
                    })),
                }),
            });
            result = await readJson(response);
            if (!response.ok) {
                failedResponse = response;
                break;
            }
            savedProducts.push(...(result.products || []));
        }

        setSaving(false);
        if (failedResponse) {
            setMessage({ type: "error", text: result.error || "Could not save draft products." });
            return;
        }
        const savedByCode = new Map(savedProducts.map((product) => [productCode(product), product]));
        setProducts((current) => current.map((product) => {
            if (!String(product.id).startsWith("draft-")) return product;
            return savedByCode.get(productCode(product)) || product;
        }));
        setImages((current) => current.map((image) => {
            const saved = savedByCode.get(image.matchedCode);
            return saved ? { ...image, productId: saved.id } : image;
        }));
        setMessage({ type: "success", text: "Final product list saved to Products." });
    };

    const exportKit = async (type = "complete") => {
        if (!canGenerateAndExport) {
            setMessage({ type: "error", text: "Exports are available inside assigned ORVA tasks." });
            return;
        }

        const incomplete = featuredProducts.filter((product) => !productReadyForExport(product));
        if (incomplete.length) {
            setMessage({ type: "error", text: "Please complete product name, price, and image before export." });
            return;
        }
        if (!exportableProducts.length) {
            setMessage({ type: "error", text: "Select at least one product for export." });
            return;
        }

        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const outputMap = { ...outputs };
        exportableProducts.forEach((product) => {
            outputMap[product.id] ||= generateProductContent(product);
        });

        const addImages = async (folder) => {
            await Promise.all(exportableProducts.map(async (product, index) => {
                const imageUrl = product.cleaned_image_url || product.image_url;
                const extension = getImageExtension(imageUrl);
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error(`Could not download the image for ${productName(product)}.`);
                const blob = await response.blob();
                const code = productCode(product) || `PRODUCT-${index + 1}`;
                folder.file(`${code}.${extension}`, blob);
            }));
        };

        try {
            if (type === "whatsapp" || type === "complete") {
                const folder = type === "complete" ? zip.folder("whatsapp") : zip;
                folder.file("catalog.csv", whatsappCatalogCsv(exportableProducts, outputMap));
                folder.file("product-copy-paste.txt", productCopyPaste(exportableProducts, outputMap, "whatsapp"));
            }
            if (type === "instagram" || type === "complete") {
                const folder = type === "complete" ? zip.folder("instagram") : zip;
                folder.file("captions.txt", productCopyPaste(exportableProducts, outputMap, "instagram"));
                folder.file("hashtags.txt", exportableProducts.map((product) => outputMap[product.id].instagram_hashtags).join("\n"));
                folder.file("content-plan.csv", instagramContentPlanCsv(exportableProducts, outputMap));
            }
            if (type === "facebook" || type === "complete") {
                const folder = type === "complete" ? zip.folder("facebook") : zip;
                folder.file("facebook-marketplace.csv", facebookMarketplaceCsv(exportableProducts, outputMap));
                folder.file("facebook-copy-paste.txt", productCopyPaste(exportableProducts, outputMap, "facebook"));
                folder.file("setup-guide.txt", "Upload these listings manually to Facebook Marketplace. ORVA does not auto-post yet.");
            }
            await addImages(zip.folder("images"));
            zip.file("setup-guide.txt", productStudioGuide());

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `orva-${type}-marketing-kit.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setMessage({ type: "success", text: `${type === "whatsapp" ? "WhatsApp catalog" : type === "instagram" ? "Instagram post" : "Marketing"} kit exported.` });
        } catch (exportError) {
            setMessage({ type: "error", text: exportError.message || "Could not export this kit. Check the product images and try again." });
        }
    };

    const contentCount = Object.keys(outputs).length;

    return (
        <AuthGate allowedRoles={allowedRole}>
            <DashboardShell
                role={shellRole}
                eyebrow="Product Studio"
                title={role === "client" ? "Product Studio" : "Multi-Channel Product Studio"}
                description={role === "client" ? (photosOnlyFlow ? "Upload product photos, add prices, and ORVA creates a draft inventory list." : "Upload products and images for ORVA review.") : "Generate reviewed WhatsApp, Instagram, and Facebook-ready content."}
            >
                <FeedbackMessage type={message.type} className="mb-5">{message.text}</FeedbackMessage>
                {loading ? (
                    <div className="dashboard-panel p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : error ? (
                    <ErrorState title="Could not open Product Studio" message={error} onRetry={load} />
                ) : (
                    <div className="grid gap-6">
                        {task ? (
                            <section className="dashboard-panel p-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Linked task</p>
                                <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{task.title}</h2>
                                <p className="mt-1 text-sm text-[var(--mid)]">Client: {task.client_name || task.client_email || task.client_id}</p>
                            </section>
                        ) : null}

                        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                            {productStudioSteps.map((step, index) => (
                                <div key={step} className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-4">
                                    <p className="text-xs font-bold text-[var(--accent)]">0{index + 1}</p>
                                    <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{step}</p>
                                </div>
                            ))}
                        </section>

                        <section className="grid gap-5 md:grid-cols-4">
                            <StatCard label="Products" value={products.length} icon={Upload} accent="bg-[var(--accent)]" />
                            <StatCard label="Images" value={images.length} icon={ImageIcon} accent="bg-[var(--accent-mid)]" />
                            <StatCard label="Matched" value={matchedImages.length} icon={CheckCircle2} accent="bg-emerald-500" />
                            <StatCard label="Generated" value={contentCount} icon={Sparkles} accent="bg-amber-500" />
                        </section>

                        {!photosOnlyFlow ? (
                            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                                <div className="dashboard-panel p-6">
                                <SectionHeading
                                    title="1. Upload Inventory List"
                                    description="Add the product names, prices, stock, codes, and notes. Nothing is saved until you review the matched list."
                                    action={<button type="button" className="btn-secondary" onClick={() => downloadText("orva-product-studio-sample.csv", sampleInventoryCsv(), "text/csv")}>Download Sample CSV</button>}
                                />
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7 text-center transition hover:border-[var(--accent)] hover:bg-white">
                                    <Upload className="h-7 w-7 text-[var(--accent)]" />
                                    <span className="mt-3 text-sm font-semibold">Upload Inventory CSV</span>
                                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleInventoryFile} />
                                </label>
                                {previewRows.length ? (
                                    <div className="mt-5 overflow-x-auto">
                                        <table className="data-table">
                                            <thead><tr><th>Product</th><th>Code</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
                                            <tbody>
                                                {previewRows.map((row) => (
                                                    <tr key={row.row_number}>
                                                        <td>{row.product_name || "-"}</td>
                                                        <td>{row.product_code || "Auto"}</td>
                                                        <td>{row.price}</td>
                                                        <td>{row.stock}</td>
                                                        <td>{row.errors?.length ? row.errors.join(", ") : "Ready"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                                            {validPreviewRows.length} inventory row{validPreviewRows.length === 1 ? "" : "s"} ready for image matching.
                                        </div>
                                    </div>
                                ) : null}
                                </div>

                                <div className="dashboard-panel p-6">
                                <SectionHeading
                                    title="2. Upload Product Images"
                                    description="Upload product photos separately. ORVA will compare image filenames with product code, name, and category."
                                />
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7 text-center transition hover:border-[var(--accent)] hover:bg-white">
                                    <ImageIcon className="h-7 w-7 text-[var(--accent)]" />
                                    <span className="mt-3 text-sm font-semibold">Upload Product Images</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                                </label>
                                {images.length ? (
                                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                                        {images.map((image) => (
                                            <div key={image.id} className={`rounded-xl border p-2 ${image.productId ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                                                <div className="aspect-square rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} />
                                                <p className="mt-2 truncate text-xs font-semibold">{image.name}</p>
                                                <p className="text-xs text-[var(--mid)]">{image.productId ? `${image.aiMatched ? "AI matched" : "Matched"} ${image.matchedCode || ""}` : "Unmatched"}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                </div>
                            </section>
                        ) : (
                            <section className="dashboard-panel p-6">
                                <SectionHeading
                                    title="Upload Photos + Prices"
                                    description="Upload product photos and enter the price below each photo. ORVA will create a demo inventory list for review."
                                />
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-7 text-center transition hover:border-[var(--accent)] hover:bg-white">
                                    <ImageIcon className="h-7 w-7 text-[var(--accent)]" />
                                    <span className="mt-3 text-sm font-semibold">Upload Product Photos</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                                </label>
                                {images.length ? (
                                    <>
                                        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                                            {images.map((image) => (
                                                <div key={image.id} className="rounded-xl border border-[var(--border)] bg-white p-3">
                                                    <button
                                                        type="button"
                                                        className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-cover bg-center text-left"
                                                        style={{ backgroundImage: `url(${image.url})` }}
                                                        onClick={() => setActiveImageId(image.id)}
                                                        aria-label={`Edit ${image.name}`}
                                                    >
                                                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                                                            Click to enlarge and edit
                                                        </span>
                                                    </button>
                                                    <p className="mt-3 truncate text-sm font-semibold text-[var(--ink)]">{image.name}</p>
                                                    <button type="button" className="btn-secondary mt-3 w-full px-3 py-2 text-xs" onClick={() => setActiveImageId(image.id)}>
                                                        Edit / enhance photo
                                                    </button>
                                                    <label className="mt-3 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                                                        Price
                                                        <input
                                                            className={`form-field mt-2 ${!(Number(image.price) > 0) ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                                            inputMode="numeric"
                                                            value={image.price || ""}
                                                            onChange={(event) => updateImagePrice(image.id, event.target.value)}
                                                            placeholder="1299"
                                                        />
                                                    </label>
                                                    {!(Number(image.price) > 0) ? <p className="mt-2 text-xs font-semibold text-red-600">Price is required.</p> : null}
                                                    {image.edited ? <p className="mt-2 text-xs font-semibold text-emerald-700">Edited photo will be used for inventory.</p> : null}
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" className="btn-primary mt-5" disabled={saving} onClick={createPhotoDraftInventory}>
                                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            {saving ? "Reading Photos..." : "Create Inventory List with AI"}
                                        </button>
                                    </>
                                ) : null}
                            </section>
                        )}

                        {!photosOnlyFlow ? <section className="dashboard-panel p-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">3. Match and Create Demo List</p>
                                    <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Match images with AI</h2>
                                    <p className="mt-2 text-sm text-[var(--mid)]">
                                        Once both inventory and images are uploaded, ORVA creates a demo product list below. You can review it before uploading products.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={!validPreviewRows.length || !images.length || saving}
                                    onClick={createMatchedDraftList}
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Match Images with AI
                                </button>
                            </div>
                            {(!validPreviewRows.length || !images.length) ? (
                                <p className="mt-4 text-sm text-[var(--mid)]">
                                    Upload {validPreviewRows.length ? "" : "inventory"}{!validPreviewRows.length && !images.length ? " and " : ""}{images.length ? "" : "images"} to enable matching.
                                </p>
                            ) : null}
                        </section> : null}

                        {unmatchedImages.length && products.length && !photosOnlyFlow ? (
                            <section className="dashboard-panel p-6">
                                <SectionHeading title="Review Image Matches" description="Use AI matching first, then manually link any unmatched images." />
                                <div className="grid gap-3 md:grid-cols-2">
                                    {unmatchedImages.map((image) => (
                                        <div key={image.id} className="grid gap-3 rounded-xl border border-[var(--border)] bg-white p-3 sm:grid-cols-[72px_1fr]">
                                            <div className="h-20 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} />
                                            <div>
                                                <p className="text-sm font-semibold">{image.name}</p>
                                                <select className="form-field mt-2" value={manualMatches[image.id] || ""} onChange={(event) => setManualMatches((current) => ({ ...current, [image.id]: event.target.value }))}>
                                                    <option value="">Select product</option>
                                                    {products.map((product) => <option key={product.id} value={product.id}>{productCode(product)} - {productName(product)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="btn-primary mt-4" onClick={applyImageMatches}>Apply Image Matches</button>
                            </section>
                        ) : images.length && products.length && !photosOnlyFlow ? (
                            <section className="dashboard-panel p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-emerald-700">All uploaded images are matched.</p>
                                    <button type="button" className="btn-secondary" onClick={applyImageMatches}>Apply Image Matches</button>
                                </div>
                            </section>
                        ) : null}

                        <section className="dashboard-panel p-6">
                            <SectionHeading
                                title={photosOnlyFlow ? "Review Demo Inventory List" : "4. Review Demo Product List"}
                                description={hasUnsavedDrafts ? "This is the demo list created from your inventory and images. Review it, then upload the final list to Products." : "After matching, your demo product list will appear here before anything is saved."}
                                action={
                                    <div className="flex flex-wrap gap-2">
                                        {draftProducts.length && role !== "partner" ? <button type="button" className="btn-secondary" disabled={saving} onClick={saveDraftProducts}>{saving ? "Uploading..." : "Upload Product List"}</button> : null}
                                        {canGenerateAndExport ? <button type="button" className="btn-primary" onClick={generateContent}><Sparkles className="mr-2 h-4 w-4" />Generate Content</button> : null}
                                    </div>
                                }
                            />
                            {products.length ? (
                                <div className="grid gap-3">
                                    {products.map((product) => {
                                        const missing = missingProductFields(product);
                                        const output = outputs[product.id];
                                        return (
                                            <article key={product.id} className="interactive-tile rounded-xl border border-[var(--border)] bg-white p-4">
                                                <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-start">
                                                    <ProductImage product={product} />
                                                    <div className="grid gap-3 md:grid-cols-5">
                                                        <input className="form-field md:col-span-2" value={product.product_name || ""} onChange={(event) => updateProduct(product, { product_name: event.target.value })} placeholder="Product name" />
                                                        <input className="form-field" value={product.product_code || ""} onChange={(event) => updateProduct(product, { product_code: event.target.value.toUpperCase() })} placeholder="Code" />
                                                        <input className="form-field" value={product.price || ""} onChange={(event) => updateProduct(product, { price: event.target.value })} inputMode="numeric" placeholder="Price" />
                                                        <input className="form-field" value={product.stock || "0"} onChange={(event) => updateProduct(product, { stock: event.target.value })} inputMode="numeric" placeholder="Stock" />
                                                        <input className="form-field md:col-span-2" value={product.category || ""} onChange={(event) => updateProduct(product, { category: event.target.value })} placeholder="Category" />
                                                        <input className="form-field md:col-span-3" value={product.notes || ""} onChange={(event) => updateProduct(product, { notes: event.target.value })} placeholder="Notes" />
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 lg:justify-end">
                                                        <button type="button" className={`btn-secondary ${product.is_featured ? "border-amber-300 bg-amber-50 text-amber-700" : ""}`} onClick={() => updateProduct(product, { is_featured: !product.is_featured })}>
                                                            <Star className="mr-2 h-4 w-4" />{product.is_featured ? "Featured" : "Feature"}
                                                        </button>
                                                        {role === "client" ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className={`btn-secondary ${pendingDeleteId === product.id ? "border-red-200 bg-red-50 text-red-700" : ""}`}
                                                                    disabled={saving}
                                                                    onClick={() => deleteProduct(product)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    {pendingDeleteId === product.id ? "Confirm Delete" : "Delete"}
                                                                </button>
                                                                {pendingDeleteId === product.id ? (
                                                                    <button type="button" className="btn-secondary" onClick={() => setPendingDeleteId("")}>Cancel</button>
                                                                ) : null}
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {missing.length ? (
                                                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--warn-bg)] px-3 py-2 text-xs font-semibold text-[var(--warn)]">
                                                        <AlertTriangle className="h-4 w-4" /> Missing {missing.join(", ")}
                                                    </div>
                                                ) : null}
                                                {output ? (
                                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                        <div className="rounded-xl bg-[var(--surface)] p-3 text-sm"><b>WhatsApp</b><p className="mt-2 whitespace-pre-line text-xs text-[var(--mid)]">{output.whatsapp_description}</p></div>
                                                        <div className="rounded-xl bg-[var(--surface)] p-3 text-sm"><b>Instagram</b><p className="mt-2 whitespace-pre-line text-xs text-[var(--mid)]">{output.instagram_caption}</p></div>
                                                        <div className="rounded-xl bg-[var(--surface)] p-3 text-sm"><b>Facebook</b><p className="mt-2 whitespace-pre-line text-xs text-[var(--mid)]">{output.facebook_description}</p></div>
                                                    </div>
                                                ) : null}
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No products yet"
                                    description="Upload inventory, add products, or load demo products."
                                    action={
                                        role === "client" ? (
                                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                                <button type="button" className="btn-primary" disabled={saving} onClick={loadDemoProducts}>
                                                    {saving ? "Loading..." : "Load Demo Products"}
                                                </button>
                                                <Link href="/dashboard/inventory/new" className="btn-secondary inline-flex">Add Product</Link>
                                            </div>
                                        ) : (
                                            <Link href="/dashboard/inventory/new" className="btn-primary mt-6 inline-flex">Add Product</Link>
                                        )
                                    }
                                />
                            )}
                        </section>

                        <section className="dashboard-panel p-6">
                            <SectionHeading title={exportTitle} description={exportDescription} />
                            {canGenerateAndExport ? (
                                <div className={`grid gap-3 ${exportChannel ? "md:grid-cols-1" : "md:grid-cols-4"}`}>
                                    {!exportChannel || exportChannel === "whatsapp" ? <button type="button" className="btn-secondary" onClick={() => exportKit("whatsapp")}><FileArchive className="mr-2 h-4 w-4" />WhatsApp Catalog ZIP</button> : null}
                                    {!exportChannel || exportChannel === "instagram" ? <button type="button" className="btn-secondary" onClick={() => exportKit("instagram")}><FileArchive className="mr-2 h-4 w-4" />Instagram Post ZIP</button> : null}
                                    {!exportChannel ? <button type="button" className="btn-secondary" onClick={() => exportKit("facebook")}><FileArchive className="mr-2 h-4 w-4" />Facebook ZIP</button> : null}
                                    {!exportChannel ? <button type="button" className="btn-primary" onClick={() => exportKit("complete")}><Download className="mr-2 h-4 w-4" />Complete Kit</button> : null}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--mid)]">
                                    Your products and images can be prepared here. ORVA will generate and export marketing kits through a reviewed specialist task.
                                </div>
                            )}
                            <p className="mt-4 text-sm text-[var(--mid)]">{exportableProducts.length}/{featuredProducts.length} selected products are export-ready.</p>
                        </section>
                    </div>
                )}
                {activeImage ? (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
                        <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/15 bg-white shadow-2xl shadow-slate-950/30">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Photo editor</p>
                                    <h3 className="mt-1 text-xl font-bold text-[var(--ink)]">{activeImage.name}</h3>
                                </div>
                                <button type="button" className="btn-secondary" onClick={() => setActiveImageId("")}>Done</button>
                            </div>

                            <div className="grid gap-5 p-4 lg:grid-cols-[1fr_320px]">
                                <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                    {cropMode ? (
                                        <ReactCrop
                                            crop={crop}
                                            onChange={(nextCrop) => setCrop(nextCrop)}
                                            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                                            keepSelection
                                            className="max-h-[68vh]"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                ref={cropImageRef}
                                                src={activeImage.url}
                                                alt={activeImage.name}
                                                onLoad={handleCropImageLoad}
                                                className="max-h-[68vh] max-w-full rounded-lg object-contain shadow-lg shadow-slate-200/70"
                                            />
                                        </ReactCrop>
                                    ) : (
                                        <div
                                            role="img"
                                            aria-label={activeImage.name}
                                            className="h-[68vh] max-h-[680px] min-h-[320px] w-full rounded-lg bg-contain bg-center bg-no-repeat shadow-lg shadow-slate-200/70"
                                            style={{ backgroundImage: `url(${activeImage.url})` }}
                                        />
                                    )}
                                </div>

                                <aside className="rounded-xl border border-[var(--border)] bg-white p-4">
                                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                                        Price
                                        <input
                                            className={`form-field mt-2 ${!(Number(activeImage.price) > 0) ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                            inputMode="numeric"
                                            value={activeImage.price || ""}
                                            onChange={(event) => updateImagePrice(activeImage.id, event.target.value)}
                                            placeholder="1299"
                                        />
                                    </label>

                                    <div className="mt-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Edit photo before inventory</p>
                                        {imageBusyId === activeImage.id ? (
                                            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                Saving edited photo
                                            </p>
                                        ) : null}
                                        <div className="mt-3 grid gap-2">
                                            {cropMode ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn-primary justify-center px-3 py-2 text-sm"
                                                        disabled={imageBusyId === activeImage.id || !completedCrop?.width || !completedCrop?.height}
                                                        onClick={() => saveManualCrop(activeImage)}
                                                    >
                                                        Save crop
                                                    </button>
                                                    <button type="button" className="btn-secondary justify-center px-3 py-2 text-sm" disabled={imageBusyId === activeImage.id} onClick={() => setCropMode(false)}>
                                                        Cancel crop
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" className="btn-secondary justify-center px-3 py-2 text-sm" disabled={imageBusyId === activeImage.id} onClick={startManualCrop}>Crop</button>
                                                    <button type="button" className="btn-primary justify-center px-3 py-2 text-sm" disabled={imageBusyId === activeImage.id} onClick={() => enhanceUploadedImage(activeImage)}>Enhance with AI</button>
                                                </>
                                            )}
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button type="button" className="btn-secondary justify-center px-3 py-2 text-xs" disabled={imageBusyId === activeImage.id} onClick={() => applyUploadedImageFilter(activeImage, "studio")}>Studio</button>
                                            <button type="button" className="btn-secondary justify-center px-3 py-2 text-xs" disabled={imageBusyId === activeImage.id} onClick={() => applyUploadedImageFilter(activeImage, "bright")}>Bright</button>
                                            <button type="button" className="btn-secondary justify-center px-3 py-2 text-xs" disabled={imageBusyId === activeImage.id} onClick={() => applyUploadedImageFilter(activeImage, "warm")}>Warm</button>
                                            <button type="button" className="btn-secondary justify-center px-3 py-2 text-xs" disabled={imageBusyId === activeImage.id} onClick={() => applyUploadedImageFilter(activeImage, "crisp")}>Crisp</button>
                                        </div>
                                        {activeImage.edited ? (
                                            <button type="button" className="btn-secondary mt-3 w-full justify-center px-3 py-2 text-sm" disabled={imageBusyId === activeImage.id} onClick={() => resetUploadedImage(activeImage)}>Reset to original</button>
                                        ) : null}
                                    </div>

                                    <div className="mt-5 rounded-xl bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--mid)]">
                                        Edits are saved to this uploaded photo immediately. When you create the inventory list, ORVA will use this edited image.
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DashboardShell>
        </AuthGate>
    );
}
