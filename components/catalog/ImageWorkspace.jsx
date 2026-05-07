"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop from "react-image-crop";
import {
    AlertCircle,
    CheckCircle2,
    Clipboard,
    Crosshair,
    ImagePlus,
    Loader2,
    ScanLine,
    Sparkles,
    WandSparkles,
} from "lucide-react";
import { supabase } from "../../app/lib/supabase";
import { DashboardCard, EmptyState } from "../DashboardUI";
import {
    formatCatalogPrice,
    quickCatalogCategories,
    sanitizeText,
    suggestCatalogFieldsFromImage,
} from "../../app/lib/whatsappCatalog";
import {
    createCenteredCrop,
    detectProductCrop,
    getCroppedImg,
    getCroppedImgFromNaturalBox,
} from "../../app/lib/image/cropImage";

const categoryOptions = [...quickCatalogCategories, "General"];

function buildDescription(category, businessCategory) {
    const normalizedCategory = sanitizeText(category || businessCategory || "General");

    if (normalizedCategory === "Handbags") {
        return "Stylish handbag suitable for daily use, gifting, and occasions.";
    }
    if (normalizedCategory === "Cosmetics") {
        return "Everyday beauty essential prepared for quick WhatsApp ordering.";
    }
    if (normalizedCategory === "Perfumes") {
        return "Fragrance option suitable for gifting and regular use.";
    }
    if (normalizedCategory === "Skincare") {
        return "Skincare item prepared for catalogue listing and easy WhatsApp enquiries.";
    }
    if (normalizedCategory === "Accessories") {
        return "Versatile accessory suitable for daily styling and gifting.";
    }
    if (normalizedCategory === "Dresses") {
        return "Ready-to-show style option prepared for WhatsApp catalogue sharing.";
    }

    return `Prepared ${normalizedCategory.toLowerCase()} item for WhatsApp catalog review and customer enquiries.`;
}

function buildTitle(category, imageName) {
    const suggestion = suggestCatalogFieldsFromImage(imageName, category);
    const normalizedCategory = sanitizeText(category || suggestion.suggestedCategory || "General");

    if (normalizedCategory === "Handbags") return "Premium Designer Handbag";
    if (normalizedCategory === "Cosmetics") return "Premium Beauty Product";
    if (normalizedCategory === "Perfumes") return "Signature Perfume";
    if (normalizedCategory === "Skincare") return "Daily Skincare Essential";
    if (normalizedCategory === "Accessories") return "Premium Fashion Accessory";
    if (normalizedCategory === "Dresses") return "Premium Dress Collection";

    return suggestion.suggestedName || `Premium ${normalizedCategory} Item`;
}

function normalizePriceInput(value) {
    return String(value || "").replace(/[^\d.]/g, "");
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function dataUrlToFile(dataUrl, fileName = "shelf-photo.png") {
    const [header, data] = String(dataUrl || "").split(",");
    const mime = header?.match(/data:(.*?);base64/)?.[1] || "image/png";
    const binary = window.atob(data || "");
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], fileName, { type: mime });
}

async function imageUrlToFile(imageUrl, filename = "catalog-image.png") {
    if (!imageUrl) throw new Error("Image URL is required.");

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
}

function displayCropToNaturalBox(crop, imageElement) {
    const scaleX = imageElement.naturalWidth / imageElement.clientWidth;
    const scaleY = imageElement.naturalHeight / imageElement.clientHeight;

    return {
        x: Math.max(0, Math.round(crop.x * scaleX)),
        y: Math.max(0, Math.round(crop.y * scaleY)),
        width: Math.max(1, Math.round(crop.width * scaleX)),
        height: Math.max(1, Math.round(crop.height * scaleY)),
    };
}

function naturalBoxToDisplayCrop(box, imageElement) {
    const scaleX = imageElement.clientWidth / imageElement.naturalWidth;
    const scaleY = imageElement.clientHeight / imageElement.naturalHeight;

    return {
        unit: "px",
        x: Math.max(0, Math.round(box.x * scaleX)),
        y: Math.max(0, Math.round(box.y * scaleY)),
        width: Math.max(1, Math.round(box.width * scaleX)),
        height: Math.max(1, Math.round(box.height * scaleY)),
    };
}

function generateGenericProductCode(existingProducts = [], index = 0) {
    const used = new Set((existingProducts || []).map((product) => sanitizeText(product.itemCode || product.sku)));
    let count = index + 1;
    let code = `GEN${String(count).padStart(3, "0")}`;

    while (used.has(code)) {
        count += 1;
        code = `GEN${String(count).padStart(3, "0")}`;
    }

    return code;
}

function formatCleanupError(errorMessage = "") {
    if (!errorMessage) {
        return "Could not clean this cropped image. Try a tighter crop around one product and try again.";
    }

    if (errorMessage.includes("unknown_foreground") || errorMessage.toLowerCase().includes("could not identify foreground")) {
        return "Background cleanup could not isolate the product clearly. Try a tighter crop so one product fills most of the frame, then try again.";
    }

    return errorMessage;
}

export function ImageWorkspace({
    businessCategory,
    existingProducts,
    shelfImages,
    selectedImageId,
    onSelectImage,
    onUploadImages,
    uploading,
    onRemoveImage,
    onCreateProduct,
    onFeedback,
}) {
    const imageRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [cropPreviewUrl, setCropPreviewUrl] = useState("");
    const [cropFile, setCropFile] = useState(null);
    const [cropError, setCropError] = useState("");
    const [cropBusy, setCropBusy] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [cleaningError, setCleaningError] = useState("");
    const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState("");
    const [cleanedProvider, setCleanedProvider] = useState("");
    const [draftProduct, setDraftProduct] = useState(null);
    const [detectedProducts, setDetectedProducts] = useState([]);
    const [analyzingProducts, setAnalyzingProducts] = useState(false);
    const [analysisError, setAnalysisError] = useState("");
    const [keepCroppedPhoto, setKeepCroppedPhoto] = useState(true);
    const [autoDetectingCrop, setAutoDetectingCrop] = useState(false);
    const [detectingProducts, setDetectingProducts] = useState(false);
    const [detectionProvider, setDetectionProvider] = useState("heuristic");
    const [detectionError, setDetectionError] = useState("");
    const [detectedBoxes, setDetectedBoxes] = useState([]);
    const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 });
    const [activeDetectionBoxId, setActiveDetectionBoxId] = useState("");
    const [autoDraftProducts, setAutoDraftProducts] = useState([]);
    const [autoDraftStates, setAutoDraftStates] = useState({});

    const renderableShelfImages = useMemo(
        () => shelfImages.filter((image) => sanitizeText(image.previewUrl)),
        [shelfImages]
    );

    const activeImage = useMemo(
        () => renderableShelfImages.find((image) => image.id === selectedImageId) || renderableShelfImages[0] || null,
        [renderableShelfImages, selectedImageId]
    );

    useEffect(() => {
        setCrop(undefined);
        setCompletedCrop(null);
        setCropPreviewUrl("");
        setCropFile(null);
        setCropError("");
        setCleaning(false);
        setCleaningError("");
        setCleanedPreviewUrl("");
        setCleanedProvider("");
        setDraftProduct(null);
        setDetectedProducts([]);
        setAnalyzingProducts(false);
        setAnalysisError("");
        setKeepCroppedPhoto(true);
        setAutoDetectingCrop(false);
        setDetectingProducts(false);
        setDetectionError("");
        setDetectedBoxes([]);
        setImageDisplaySize({ width: 0, height: 0 });
        setActiveDetectionBoxId("");
        setAutoDraftProducts([]);
        setAutoDraftStates({});
    }, [selectedImageId]);

    const updateDraft = (field, value) => {
        setDraftProduct((current) => (current ? { ...current, [field]: value } : current));
    };

    const updateAutoDraft = (id, field, value) => {
        setAutoDraftProducts((current) =>
            current.map((product) => (product.id === id ? { ...product, [field]: value } : product))
        );
    };

    const removeAutoDraft = (id) => {
        setAutoDraftProducts((current) => current.filter((product) => product.id !== id));
        setAutoDraftStates((current) => {
            const next = { ...current };
            delete next[id];
            return next;
        });
    };

    const resetCrop = () => {
        if (!imageRef.current) return;
        const nextCrop = createCenteredCrop(imageRef.current.clientWidth, imageRef.current.clientHeight);
        setCrop(nextCrop);
        setCompletedCrop(nextCrop);
        setCropError("");
    };

    const autoDetectCrop = ({ silent = false } = {}) => {
        if (!imageRef.current) return;

        setAutoDetectingCrop(true);
        setCropError("");

        window.requestAnimationFrame(() => {
            const detectedCrop = detectProductCrop(imageRef.current);

            if (detectedCrop) {
                setCrop(detectedCrop);
                setCompletedCrop(detectedCrop);
                if (!silent) {
                    onFeedback?.("success", "Auto crop detected a likely product area. Adjust the frame if needed.");
                }
            } else {
                const fallbackCrop = createCenteredCrop(imageRef.current.clientWidth, imageRef.current.clientHeight);
                setCrop(fallbackCrop);
                setCompletedCrop(fallbackCrop);

                if (!silent) {
                    const message = "Auto crop could not find a clear product. A centered crop was applied instead.";
                    setCropError(message);
                    onFeedback?.("error", message);
                }
            }

            setAutoDetectingCrop(false);
        });
    };

    const handleImageLoad = (event) => {
        const image = event.currentTarget;
        const initialCrop = createCenteredCrop(image.clientWidth, image.clientHeight);
        setImageDisplaySize({ width: image.clientWidth, height: image.clientHeight });
        setCrop(initialCrop);
        setCompletedCrop(initialCrop);
        window.setTimeout(() => autoDetectCrop({ silent: true }), 80);
    };

    const detectionBoxStyle = (box) => {
        if (!imageRef.current || !imageDisplaySize.width || !imageDisplaySize.height) return {};

        const scaleX = imageDisplaySize.width / imageRef.current.naturalWidth;
        const scaleY = imageDisplaySize.height / imageRef.current.naturalHeight;

        return {
            left: `${box.x * scaleX}px`,
            top: `${box.y * scaleY}px`,
            width: `${box.width * scaleX}px`,
            height: `${box.height * scaleY}px`,
        };
    };

    const makeProductDraft = async () => {
        if (!activeImage || !completedCrop?.width || !completedCrop?.height || !imageRef.current) {
            const message = "Please select a product area first.";
            setCropError(message);
            onFeedback?.("error", message);
            return;
        }

        setCropBusy(true);
        setCropError("");
        setCleaningError("");

        try {
            const fileName = `${sanitizeText(activeImage.name).replace(/\.[a-z0-9]+$/i, "") || "catalog-crop"}.png`;
            const { file, previewUrl } = await getCroppedImg(imageRef.current, completedCrop, fileName);

            const initialCategory = sanitizeText(draftProduct?.category || businessCategory || "General") || "General";
            const nextCode = generateGenericProductCode(existingProducts);
            const nextDraft = {
                id: crypto.randomUUID(),
                sourceImageId: activeImage.id,
                originalSourceImage: activeImage.previewUrl,
                imageUrl: previewUrl,
                originalImageUrl: previewUrl,
                cleanedImageUrl: "",
                providerUsed: "",
                imageSource: "manual_crop",
                detectionBox: null,
                detectionConfidence: 0,
                originalShelfImageId: activeImage.id,
                productName: buildTitle(initialCategory, activeImage.name),
                category: initialCategory,
                price: "",
                descriptionNotes: buildDescription(initialCategory, businessCategory),
                sku: nextCode,
                itemCode: nextCode,
                availability: "In stock",
                cropNote: `Crop from ${activeImage.name}`,
            };

            setCropPreviewUrl(previewUrl);
            setCropFile(file);
            setCleanedPreviewUrl("");
            setDetectedProducts([]);
            setAnalysisError("");
            setKeepCroppedPhoto(true);
            setDraftProduct(nextDraft);
            onFeedback?.("success", "Crop created. Review the preview and complete the product details.");
        } catch (error) {
            const message = error.message || "Could not create cropped product preview.";
            setCropError(message);
            onFeedback?.("error", message);
        } finally {
            setCropBusy(false);
        }
    };

    const requestProductAnalysis = async (file, fallback = {}) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error("Please login again before identifying products.");
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("businessCategory", businessCategory || fallback.category || "General");

        const response = await fetch("/api/image/analyze-products", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.error || "Could not identify products from this crop.");
        }

        const product = Array.isArray(payload.products) ? payload.products[0] || null : null;
        if (product && payload.warning) {
            product.analysisWarning = payload.warning;
            product.analysisConfigured = payload.configured !== false;
        }

        return product;
    };

    const analyzeCropProducts = async () => {
        if (!cropFile) {
            const message = "Create a crop first before identifying products.";
            setAnalysisError(message);
            onFeedback?.("error", message);
            return;
        }

        setAnalyzingProducts(true);
        setAnalysisError("");

        try {
            const product = await requestProductAnalysis(cropFile, draftProduct || {});
            const products = product ? [product] : [];
            setDetectedProducts(products);

            if (products[0] && !products[0].analysisWarning) {
                applyDetectedProduct(products[0], false);
            }

            if (products[0]?.analysisWarning) {
                setAnalysisError(products[0].analysisWarning);
            }

            onFeedback?.(
                products[0]?.analysisWarning ? "error" : "success",
                products[0]?.analysisWarning
                    ? products[0].analysisWarning
                    : products.length
                    ? `Identified ${products.length} product${products.length > 1 ? "s" : ""} from the crop.`
                    : "No clear products were detected. Try a wider or sharper crop."
            );
        } catch (error) {
            const message = error.message || "Could not identify products from this crop.";
            setAnalysisError(message);
            onFeedback?.("error", message);
        } finally {
            setAnalyzingProducts(false);
        }
    };

    const analyzeAutoDraft = async (id) => {
        const product = autoDraftProducts.find((item) => item.id === id);
        if (!product?.imageUrl) return;

        setAutoDraftStates((current) => ({
            ...current,
            [id]: { ...(current[id] || {}), analyzing: true, error: "" },
        }));

        try {
            const file = await imageUrlToFile(product.imageUrl, `${sanitizeText(product.itemCode || "product")}.png`);
            const detectedProduct = await requestProductAnalysis(file, product);

            if (detectedProduct?.analysisWarning) {
                setAutoDraftStates((current) => ({
                    ...current,
                    [id]: { ...(current[id] || {}), analyzing: false, error: detectedProduct.analysisWarning },
                }));
                onFeedback?.("error", detectedProduct.analysisWarning);
                return;
            }

            if (detectedProduct) {
                setAutoDraftProducts((current) =>
                    current.map((item) =>
                        item.id === id
                        ? {
                                  ...item,
                                  productName: sanitizeText(detectedProduct.title) || item.productName,
                                  descriptionNotes: sanitizeText(detectedProduct.description) || item.descriptionNotes,
                                  category: sanitizeText(detectedProduct.category) || item.category,
                              }
                            : item
                    )
                );
            }

            setAutoDraftStates((current) => ({
                ...current,
                [id]: { ...(current[id] || {}), analyzing: false, error: "" },
            }));
            onFeedback?.("success", detectedProduct ? "Title and description generated from the product image." : "No clear product details were detected.");
        } catch (error) {
            setAutoDraftStates((current) => ({
                ...current,
                [id]: { ...(current[id] || {}), analyzing: false, error: error.message || "Could not study this product image." },
            }));
            onFeedback?.("error", error.message || "Could not study this product image.");
        }
    };

    const cleanAutoDraftBackground = async (id) => {
        const product = autoDraftProducts.find((item) => item.id === id);
        if (!product?.imageUrl) return;

        setAutoDraftStates((current) => ({
            ...current,
            [id]: { ...(current[id] || {}), cleaning: true, error: "" },
        }));

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Please login again before cleaning images.");
            }

            const file = await imageUrlToFile(product.imageUrl, `${sanitizeText(product.itemCode || "product")}.png`);
            const formData = new FormData();
            formData.append("image", file);
            formData.append("provider", "auto");

            const response = await fetch("/api/image/clean-background", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(formatCleanupError(payload.error || "Could not clean this cropped image."));
            }

            const payload = await response.json();
            const previewUrl = payload.cleanedImageUrl;

            if (!sanitizeText(previewUrl)) {
                throw new Error("Background cleanup finished, but no cleaned image was returned.");
            }

            setAutoDraftStates((current) => ({
                ...current,
                [id]: {
                    ...(current[id] || {}),
                    cleaning: false,
                    cleanedPreviewUrl: previewUrl,
                    provider: payload.provider || "auto",
                    error: "",
                },
            }));
            onFeedback?.("success", `Background cleaned${payload.provider ? ` with ${payload.provider}` : ""}.`);
        } catch (error) {
            const message = formatCleanupError(error.message || "Could not clean this cropped image.");
            setAutoDraftStates((current) => ({
                ...current,
                [id]: { ...(current[id] || {}), cleaning: false, error: message },
            }));
            onFeedback?.("error", message);
        }
    };

    const applyCleanedAutoDraftImage = (id) => {
        const state = autoDraftStates[id] || {};
        if (!state.cleanedPreviewUrl) return;

        setAutoDraftProducts((current) =>
            current.map((product) =>
                product.id === id
                    ? {
                          ...product,
                          imageUrl: state.cleanedPreviewUrl,
                          cleanedImageUrl: state.cleanedPreviewUrl,
                          providerUsed: state.provider || "auto",
                      }
                    : product
            )
        );
        onFeedback?.("success", "Cleaned image applied to this detected product.");
    };

    const cleanBackground = async () => {
        if (!cropFile) {
            const message = "Create a crop first before cleaning the background.";
            setCleaningError(message);
            onFeedback?.("error", message);
            return;
        }

        setCleaning(true);
        setCleaningError("");

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Please login again before cleaning images.");
            }

            const formData = new FormData();
            formData.append("image", cropFile);
            formData.append("provider", "auto");

            const response = await fetch("/api/image/clean-background", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(formatCleanupError(payload.error || "Could not clean this cropped image."));
            }

            const payload = await response.json();
            const previewUrl = payload.cleanedImageUrl;

            if (!sanitizeText(previewUrl)) {
                throw new Error("Background cleanup finished, but no cleaned image was returned.");
            }

            setCleanedPreviewUrl(previewUrl);
            setCleanedProvider(payload.provider || "auto");
            onFeedback?.(
                "success",
                `Background cleaned${payload.provider ? ` with ${payload.provider}` : ""}. Review the before and after previews.`
            );
        } catch (error) {
            const message = formatCleanupError(error.message || "Could not clean this cropped image.");
            setCleaningError(message);
            onFeedback?.("error", message);
        } finally {
            setCleaning(false);
        }
    };

    const useCleanedImage = () => {
        if (!cleanedPreviewUrl) return;

        setDraftProduct((current) =>
            current
                ? {
                      ...current,
                      imageUrl: cleanedPreviewUrl,
                      cleanedImageUrl: cleanedPreviewUrl,
                      providerUsed: cleanedProvider || "auto",
                  }
                : current
        );
        onFeedback?.("success", "Cleaned image applied to this product.");
    };

    const updateCategory = (value) => {
        const nextCategory = sanitizeText(value) || "General";
        const nextCode = generateGenericProductCode(existingProducts);
        setDraftProduct((current) =>
            current
                ? {
                      ...current,
                      category: nextCategory,
                      itemCode: nextCode,
                      sku: !sanitizeText(current.sku) || current.sku === current.itemCode ? nextCode : current.sku,
                  }
                : current
        );
    };

    const generateName = () => {
        if (!draftProduct) return;
        updateDraft("productName", buildTitle(draftProduct.category, activeImage?.name || ""));
    };

    const generateDescription = () => {
        if (!draftProduct) return;
        updateDraft("descriptionNotes", buildDescription(draftProduct.category, businessCategory));
    };

    const applyDetectedProduct = (product, notify = true) => {
        if (!product || !draftProduct) return;

        const nextCategory = sanitizeText(product.category || draftProduct.category || "General") || "General";
        const nextCode = generateGenericProductCode(existingProducts);

        setDraftProduct((current) =>
            current
                ? {
                      ...current,
                      productName: sanitizeText(product.title) || current.productName,
                      descriptionNotes: sanitizeText(product.description) || current.descriptionNotes,
                      category: nextCategory,
                      itemCode: current.itemCode || nextCode,
                      sku: current.sku || nextCode,
                  }
                : current
        );

        if (notify) {
            onFeedback?.("success", "Product details applied to the draft.");
        }
    };

    const buildWhatsAppCopy = (product = draftProduct) => {
        if (!product) return "";

        return [
            `*Product:* ${sanitizeText(product.productName || product.title) || "Product"}`,
            `*Price:* ${formatCatalogPrice(product.price) || "Price not provided"}`,
            `*Details:* ${sanitizeText(product.descriptionNotes || product.description) || "Details not provided"}`,
            sanitizeText(product.itemCode || product.sku) ? `*Code:* ${sanitizeText(product.itemCode || product.sku)}` : "",
        ]
            .filter(Boolean)
            .join("\n");
    };

    const copyWhatsAppText = async (product = draftProduct) => {
        const text = buildWhatsAppCopy(product);

        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            onFeedback?.("success", "WhatsApp product copy copied.");
        } catch {
            onFeedback?.("error", "Could not copy text. Please copy it manually from the preview.");
        }
    };

    const formatPrice = () => {
        if (!draftProduct) return;
        updateDraft("price", normalizePriceInput(draftProduct.price));
        onFeedback?.("success", `Price ready for export: ${formatCatalogPrice(draftProduct.price)}`);
    };

    const toggleDetectionBox = (boxId) => {
        setDetectedBoxes((current) =>
            current.map((box) => (box.id === boxId ? { ...box, selected: !box.selected } : box))
        );
    };

    const deleteDetectionBox = (boxId) => {
        setDetectedBoxes((current) => current.filter((box) => box.id !== boxId));
        setActiveDetectionBoxId((current) => (current === boxId ? "" : current));
    };

    const focusDetectionBox = (box) => {
        if (!imageRef.current) return;
        const nextCrop = naturalBoxToDisplayCrop(box, imageRef.current);
        setCrop(nextCrop);
        setCompletedCrop(nextCrop);
        setActiveDetectionBoxId(box.id);
        setCropError("");
    };

    const updateActiveDetectionBoxFromCrop = () => {
        if (!imageRef.current || !activeDetectionBoxId || !completedCrop?.width || !completedCrop?.height) {
            const message = "Select a detected box, adjust the crop frame, then update the box.";
            setDetectionError(message);
            onFeedback?.("error", message);
            return;
        }

        const naturalBox = displayCropToNaturalBox(completedCrop, imageRef.current);
        setDetectedBoxes((current) =>
            current.map((box) =>
                box.id === activeDetectionBoxId
                    ? {
                          ...box,
                          ...naturalBox,
                          selected: true,
                          manualAdjusted: true,
                      }
                    : box
            )
        );
        setDetectionError("");
        onFeedback?.("success", "Detected box updated from the crop frame.");
    };

    const addManualDetectionBox = () => {
        if (!imageRef.current || !completedCrop?.width || !completedCrop?.height) {
            const message = "Select an area in the crop editor before adding a manual box.";
            setDetectionError(message);
            onFeedback?.("error", message);
            return;
        }

        const naturalBox = displayCropToNaturalBox(completedCrop, imageRef.current);
        const nextBox = {
            id: `manual-${crypto.randomUUID()}`,
            ...naturalBox,
            label: "product",
            confidence: 1,
            selected: true,
            manual: true,
        };

        setDetectedBoxes((current) => [...current, nextBox]);
        setActiveDetectionBoxId(nextBox.id);
        setDetectionError("");
        onFeedback?.("success", "Manual product box added.");
    };

    const activeImageFile = () => {
        if (!activeImage) return null;
        if (activeImage.file instanceof File) return activeImage.file;
        if (activeImage.dataUrl) return dataUrlToFile(activeImage.dataUrl, activeImage.name || "shelf-photo.png");
        return null;
    };

    const detectShelfProducts = async () => {
        if (!activeImage) {
            const message = "Upload and select a shelf image before auto detecting products.";
            setDetectionError(message);
            onFeedback?.("error", message);
            return;
        }

        const file = activeImageFile();
        if (!file) {
            const message = "This shelf image is missing its source file. Re-upload the image and try again.";
            setDetectionError(message);
            onFeedback?.("error", message);
            return;
        }

        setDetectingProducts(true);
        setDetectionError("");

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Please login again before detecting products.");
            }

            const formData = new FormData();
            formData.append("image", file);
            formData.append("provider", detectionProvider);

            const response = await fetch("/api/vision/detect-products", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.error || "Could not detect products in this shelf image.");
            }

            const nextBoxes = (payload.boxes || []).map((box, index) => ({
                ...box,
                id: box.id || `detected-${index + 1}`,
                selected: true,
            }));

            setDetectedBoxes(nextBoxes);
            onFeedback?.(
                "success",
                nextBoxes.length
                    ? `Found ${nextBoxes.length} suggested product box${nextBoxes.length > 1 ? "es" : ""}. Review before creating products.`
                    : "No product boxes were found. Try heuristic mode or add a manual box."
            );
        } catch (error) {
            const message = error.message || "Could not detect products in this shelf image.";
            setDetectionError(message);
            onFeedback?.("error", message);
        } finally {
            setDetectingProducts(false);
        }
    };

    const createProductsFromSelectedBoxes = async () => {
        if (!activeImage || !imageRef.current) {
            const message = "Upload and select a shelf image before creating products.";
            setDetectionError(message);
            onFeedback?.("error", message);
            return;
        }

        const selectedBoxes = detectedBoxes.filter((box) => box.selected);

        if (selectedBoxes.length === 0) {
            const message = "Select at least one detected box before creating products.";
            setDetectionError(message);
            onFeedback?.("error", message);
            return;
        }

        setCropBusy(true);
        setDetectionError("");

        try {
            const sortedBoxes = [...selectedBoxes].sort((left, right) => left.y - right.y || left.x - right.x);
            const generatedCodes = new Set();

            const nextDrafts = [];

            for (let index = 0; index < sortedBoxes.length; index += 1) {
                const box = sortedBoxes[index];
                const productNumber = index + 1;
                let codeIndex = index;
                let itemCode = generateGenericProductCode([...existingProducts, ...autoDraftProducts, ...nextDrafts], codeIndex);
                while (generatedCodes.has(itemCode)) {
                    codeIndex += 1;
                    itemCode = generateGenericProductCode([...existingProducts, ...autoDraftProducts, ...nextDrafts], codeIndex);
                }
                generatedCodes.add(itemCode);
                const fileName = `${sanitizeText(activeImage.name).replace(/\.[a-z0-9]+$/i, "") || "auto-product"}-${productNumber}.png`;
                const { file, previewUrl } = await getCroppedImgFromNaturalBox(imageRef.current, box, fileName);
                const fallbackCategory = sanitizeText(businessCategory || "General") || "General";
                let detectedProduct = null;

                try {
                    detectedProduct = await requestProductAnalysis(file, {
                        category: fallbackCategory,
                    });
                } catch {
                    detectedProduct = null;
                }

                nextDrafts.push({
                    id: crypto.randomUUID(),
                    sourceImageId: activeImage.id,
                    originalShelfImageId: activeImage.id,
                    originalSourceImage: activeImage.previewUrl,
                    imageUrl: previewUrl,
                    originalImageUrl: previewUrl,
                    cleanedImageUrl: "",
                    providerUsed: "",
                    imageSource: "auto_detected",
                    detectionBox: {
                        x: box.x,
                        y: box.y,
                        width: box.width,
                        height: box.height,
                    },
                    detectionConfidence: box.confidence,
                    productName: sanitizeText(detectedProduct?.title) || `Product ${productNumber}`,
                    category: sanitizeText(detectedProduct?.category) || fallbackCategory,
                    price: "",
                    descriptionNotes:
                        sanitizeText(detectedProduct?.description) ||
                        "WhatsApp-ready product draft. Add final price and stock details before export.",
                    sku: itemCode,
                    itemCode,
                    availability: "In stock",
                    cropNote: `Auto detected crop from ${activeImage.name}`,
                    isNewArrival: true,
                });
            }

            setAutoDraftProducts((current) => [...nextDrafts, ...current]);
            setDetectedBoxes((current) => current.map((box) => ({ ...box, selected: false })));
            onFeedback?.("success", `${selectedBoxes.length} products added to review. Edit, clean, and save each product when ready.`);
        } catch (error) {
            const message = error.message || "Could not create products from detected boxes.";
            setDetectionError(message);
            onFeedback?.("error", message);
        } finally {
            setCropBusy(false);
        }
    };

    const saveAutoDraftToCatalog = (id) => {
        const product = autoDraftProducts.find((item) => item.id === id);
        if (!product) return;

        if (!sanitizeText(product.productName)) {
            const message = "Add a product name before saving this detected product.";
            setAutoDraftStates((current) => ({
                ...current,
                [id]: { ...(current[id] || {}), error: message },
            }));
            onFeedback?.("error", message);
            return;
        }

        onCreateProduct(product, { stayInWorkspace: true });
        removeAutoDraft(id);
    };

    const saveProductToCatalog = () => {
        if (!draftProduct) {
            const message = "Create a product crop first before saving to the catalog.";
            setCropError(message);
            onFeedback?.("error", message);
            return;
        }

        const missingFields = [];
        if (!sanitizeText(draftProduct.productName)) missingFields.push("product name");
        if (!sanitizeText(draftProduct.price)) missingFields.push("price");

        if (missingFields.length > 0) {
            const message = `Please add ${missingFields.join(" and ")} before saving this product.`;
            setCropError(message);
            onFeedback?.("error", message);
            return;
        }

        onCreateProduct({
            ...draftProduct,
            imageUrl: keepCroppedPhoto ? draftProduct.imageUrl : "",
            originalImageUrl: keepCroppedPhoto ? draftProduct.originalImageUrl || cropPreviewUrl : "",
            cleanedImageUrl: keepCroppedPhoto ? draftProduct.cleanedImageUrl || "" : "",
            providerUsed: keepCroppedPhoto ? draftProduct.providerUsed || "" : "",
            cropNote: keepCroppedPhoto ? draftProduct.cropNote : `${draftProduct.cropNote || "Crop created"} - photo removed`,
        });

        setDraftProduct(null);
        setCropPreviewUrl("");
        setCropFile(null);
        setCleanedPreviewUrl("");
        setCropError("");
        setCleaningError("");
        setDetectedProducts([]);
        setAnalysisError("");
        setKeepCroppedPhoto(true);
        resetCrop();
    };

    return (
        <section className="dashboard-panel p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Image Workspace</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Upload shelf photos, crop one product cleanly, remove the background, and send it into the catalog.
                    </p>
                </div>
                <label className="btn-secondary cursor-pointer">
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                    Upload More Images
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => onUploadImages(event.target.files)}
                    />
                </label>
            </div>

            {renderableShelfImages.length === 0 ? (
                <EmptyState
                    icon={ScanLine}
                    title="Upload and select a shelf image to start cropping"
                    description="Once you upload a shelf photo with a usable preview, it will appear here for product-by-product crop work."
                    className="p-8"
                />
            ) : (
                <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)_460px]">
                    <aside className="space-y-3">
                        {renderableShelfImages.map((image) => (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => onSelectImage(image.id)}
                                className={`w-full overflow-hidden rounded-2xl border text-left shadow-sm transition ${
                                    selectedImageId === image.id
                                        ? "border-blue-200 bg-blue-50/70 ring-2 ring-blue-100"
                                        : "border-slate-200 bg-white hover:border-blue-200"
                                }`}
                            >
                                <div className="h-24 bg-slate-100">
                                    {sanitizeText(image.previewUrl) ? (
                                        <img src={image.previewUrl} alt={image.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium text-slate-500">
                                            Preview unavailable
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-950">{image.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">Open in crop editor</p>
                                    </div>
                                    <span
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onRemoveImage(image.id);
                                        }}
                                        className="rounded-xl border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                    >
                                        Remove
                                    </span>
                                </div>
                            </button>
                        ))}
                    </aside>

                    <div className="space-y-4">
                        {!activeImage ? (
                            <EmptyState
                                icon={ImagePlus}
                                title="Upload and select a shelf image to start cropping"
                                description="Choose a thumbnail from the left panel and the full image will open here."
                                className="p-8"
                            />
                        ) : (
                            <>
                                <DashboardCard className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-950">Selected image</p>
                                            <p className="mt-1 text-sm text-slate-600">{activeImage.name}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Drag the crop frame around one product. Large shelf images stay inline here for easier inspection.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <select
                                                value={detectionProvider}
                                                onChange={(event) => setDetectionProvider(event.target.value)}
                                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm outline-none transition focus:border-blue-200 focus:ring-4 focus:ring-blue-50"
                                            >
                                                <option value="heuristic">Heuristic</option>
                                                <option value="roboflow">Roboflow</option>
                                            </select>
                                            <button type="button" onClick={detectShelfProducts} disabled={detectingProducts} className="btn-primary">
                                                {detectingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
                                                {detectingProducts ? "Finding products..." : "Auto Detect Products"}
                                            </button>
                                            <button type="button" onClick={resetCrop} className="btn-secondary">
                                                Reset Crop
                                            </button>
                                            <button type="button" onClick={() => autoDetectCrop()} disabled={autoDetectingCrop} className="btn-secondary">
                                                {autoDetectingCrop ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                                                Suggest Single Crop
                                            </button>
                                        </div>
                                    </div>
                                </DashboardCard>

                                <DashboardCard className="overflow-hidden p-0">
                                    <div className="min-h-[720px] overflow-auto bg-slate-100 p-5">
                                        <div className="flex min-h-[720px] items-start justify-center">
                                            <div className="relative inline-block">
                                                <ReactCrop
                                                    crop={crop}
                                                    onChange={(nextCrop) => setCrop(nextCrop)}
                                                    onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                                                    keepSelection
                                                    minWidth={24}
                                                    minHeight={24}
                                                >
                                                    <img
                                                        ref={imageRef}
                                                        src={activeImage.previewUrl}
                                                        alt={activeImage.name}
                                                        className="block h-auto max-w-none object-contain"
                                                        style={{
                                                            width: "min(100%, 1360px)",
                                                        }}
                                                        onLoad={handleImageLoad}
                                                    />
                                                </ReactCrop>
                                                {detectedBoxes.map((box, index) => (
                                                    <button
                                                        key={box.id}
                                                        type="button"
                                                        onClick={() => {
                                                            toggleDetectionBox(box.id);
                                                            focusDetectionBox(box);
                                                        }}
                                                        className={[
                                                            "absolute z-20 flex items-start justify-between rounded-xl border-2 p-1 text-left shadow-lg transition",
                                                            box.selected
                                                                ? "border-amber-300 bg-amber-300/20 shadow-amber-200/70"
                                                                : "border-blue-300 bg-blue-300/15 shadow-blue-200/60",
                                                        ].join(" ")}
                                                        style={detectionBoxStyle(box)}
                                                        title="Click to select and fine-tune this box"
                                                    >
                                                        <span className="rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                                            {index + 1} · {box.label} · {Math.round((box.confidence || 0) * 100)}%
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </DashboardCard>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={makeProductDraft}
                                        disabled={!completedCrop?.width || !completedCrop?.height || cropBusy}
                                        className="btn-primary"
                                    >
                                        {cropBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                                        Create Product From Crop
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addManualDetectionBox}
                                        disabled={!completedCrop?.width || !completedCrop?.height}
                                        className="btn-secondary"
                                    >
                                        Add Manual Box
                                    </button>
                                    <button
                                        type="button"
                                        onClick={updateActiveDetectionBoxFromCrop}
                                        disabled={!activeDetectionBoxId || !completedCrop?.width || !completedCrop?.height}
                                        className="btn-secondary"
                                    >
                                        Update Selected Box
                                    </button>
                                    <button
                                        type="button"
                                        onClick={createProductsFromSelectedBoxes}
                                        disabled={cropBusy || detectedBoxes.filter((box) => box.selected).length === 0}
                                        className="btn-primary"
                                    >
                                        {cropBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Create Products From Selected Boxes
                                    </button>
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                                        {!completedCrop?.width || !completedCrop?.height ? "Select a product area first" : "Crop ready"}
                                    </span>
                                </div>

                                {cropError ? (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {cropError}
                                    </div>
                                ) : null}

                                {detectionError ? (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {detectionError}
                                    </div>
                                ) : null}

                                {detectedBoxes.length > 0 ? (
                                    <DashboardCard className="p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-950">Detected product boxes</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Select boxes to create drafts. Click a box to fine-tune it in the crop editor.
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                                                {detectedBoxes.filter((box) => box.selected).length}/{detectedBoxes.length} selected
                                            </span>
                                        </div>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {detectedBoxes.map((box, index) => (
                                                <div
                                                    key={box.id}
                                                    className={`rounded-2xl border p-3 transition ${
                                                        activeDetectionBoxId === box.id
                                                            ? "border-blue-300 bg-blue-50"
                                                            : box.selected
                                                            ? "border-amber-200 bg-amber-50"
                                                            : "border-slate-200 bg-slate-50"
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            toggleDetectionBox(box.id);
                                                            focusDetectionBox(box);
                                                        }}
                                                        className="block w-full text-left"
                                                    >
                                                        <p className="text-sm font-semibold text-slate-950">
                                                            Box {index + 1} · {box.label}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {Math.round((box.confidence || 0) * 100)}% confidence
                                                        </p>
                                                    </button>
                                                    <div className="mt-3 flex gap-2">
                                                        <button type="button" onClick={() => focusDetectionBox(box)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700">
                                                            Fine tune
                                                        </button>
                                                        <button type="button" onClick={() => deleteDetectionBox(box.id)} className="rounded-xl border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </DashboardCard>
                                ) : null}
                            </>
                        )}
                    </div>

                    <aside className="space-y-4">
                        <DashboardCard className="p-5 xl:sticky xl:top-24">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-950">Product preview and actions</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Review the crop, clean the image, then complete the product details before saving.
                                    </p>
                                </div>
                                {draftProduct ? (
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                        Draft ready
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        Waiting for crop
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 grid gap-4">
                                {autoDraftProducts.length > 0 ? (
                                    <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-950">Auto-detected product review</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Review each crop, generate details from the image, clean the background, then save to the catalog.
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                                                {autoDraftProducts.length} waiting
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-4">
                                            {autoDraftProducts.map((product) => {
                                                const draftState = autoDraftStates[product.id] || {};

                                                return (
                                                    <div key={product.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                                            {product.imageUrl ? (
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.productName || "Auto-detected product"}
                                                                    className="h-64 w-full object-contain"
                                                                />
                                                            ) : (
                                                                <div className="flex h-64 items-center justify-center px-4 text-center text-xs text-slate-500">
                                                                    Product crop preview unavailable.
                                                                </div>
                                                            )}
                                                        </div>

                                                        {draftState.cleanedPreviewUrl ? (
                                                            <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">
                                                                <img
                                                                    src={draftState.cleanedPreviewUrl}
                                                                    alt="Cleaned auto-detected product"
                                                                    className="h-52 w-full object-contain"
                                                                />
                                                            </div>
                                                        ) : null}

                                                        <div className="mt-4 grid gap-3">
                                                            <div>
                                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Product name</label>
                                                                <input
                                                                    value={product.productName || ""}
                                                                    onChange={(event) => updateAutoDraft(product.id, "productName", event.target.value)}
                                                                    className="form-field"
                                                                    placeholder="Product name"
                                                                />
                                                            </div>

                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                                                                    <select
                                                                        value={product.category || "General"}
                                                                        onChange={(event) => updateAutoDraft(product.id, "category", event.target.value)}
                                                                        className="form-field"
                                                                    >
                                                                        {categoryOptions.map((category) => (
                                                                            <option key={category} value={category}>
                                                                                {category}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Price</label>
                                                                    <input
                                                                        value={product.price || ""}
                                                                        onChange={(event) => updateAutoDraft(product.id, "price", event.target.value)}
                                                                        onBlur={() => updateAutoDraft(product.id, "price", normalizePriceInput(product.price))}
                                                                        className="form-field"
                                                                        placeholder="Example: 299"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                                                <textarea
                                                                    value={product.descriptionNotes || ""}
                                                                    onChange={(event) => updateAutoDraft(product.id, "descriptionNotes", event.target.value)}
                                                                    className="form-field min-h-24"
                                                                    placeholder="Short WhatsApp-friendly product description"
                                                                />
                                                            </div>

                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">SKU</label>
                                                                    <input
                                                                        value={product.sku || product.itemCode || ""}
                                                                        onChange={(event) => {
                                                                            updateAutoDraft(product.id, "sku", event.target.value);
                                                                            updateAutoDraft(product.id, "itemCode", event.target.value);
                                                                        }}
                                                                        className="form-field"
                                                                        placeholder="GEN001"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Availability</label>
                                                                    <select
                                                                        value={product.availability || "In stock"}
                                                                        onChange={(event) => updateAutoDraft(product.id, "availability", event.target.value)}
                                                                        className="form-field"
                                                                    >
                                                                        <option>In stock</option>
                                                                        <option>Limited stock</option>
                                                                        <option>Made to order</option>
                                                                        <option>Out of stock</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">WhatsApp copy</p>
                                                                <button type="button" onClick={() => copyWhatsAppText(product)} className="btn-secondary">
                                                                    <Clipboard className="mr-2 h-4 w-4" />
                                                                    Copy
                                                                </button>
                                                            </div>
                                                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                                                                {buildWhatsAppCopy(product)}
                                                            </p>
                                                        </div>

                                                        {draftState.error ? (
                                                            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                                                {draftState.error}
                                                            </div>
                                                        ) : null}

                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => analyzeAutoDraft(product.id)}
                                                                disabled={draftState.analyzing}
                                                                className="btn-secondary"
                                                            >
                                                                {draftState.analyzing ? (
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <WandSparkles className="mr-2 h-4 w-4" />
                                                                )}
                                                                Study Image
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => cleanAutoDraftBackground(product.id)}
                                                                disabled={draftState.cleaning}
                                                                className="btn-secondary"
                                                            >
                                                                {draftState.cleaning ? (
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                                )}
                                                                Clean Background
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyCleanedAutoDraftImage(product.id)}
                                                                disabled={!draftState.cleanedPreviewUrl}
                                                                className="btn-secondary"
                                                            >
                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                Use Cleaned
                                                            </button>
                                                            <button type="button" onClick={() => saveAutoDraftToCatalog(product.id)} className="btn-primary">
                                                                Save To Catalog
                                                            </button>
                                                            <button type="button" onClick={() => removeAutoDraft(product.id)} className="btn-secondary">
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                        {cropPreviewUrl ? (
                                            <img src={cropPreviewUrl} alt="Cropped preview" className="h-44 w-full object-contain" />
                                        ) : (
                                            <div className="flex h-44 items-center justify-center px-4 text-center text-xs text-slate-500">
                                                Crop preview appears here after you create a product crop.
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                        {cleanedPreviewUrl ? (
                                            <img src={cleanedPreviewUrl} alt="Cleaned preview" className="h-44 w-full object-contain" />
                                        ) : (
                                            <div className="flex h-44 items-center justify-center px-4 text-center text-xs text-slate-500">
                                                Cleaned preview appears here after remove.bg runs.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button type="button" onClick={cleanBackground} disabled={!cropFile || cleaning} className="btn-secondary">
                                        {cleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Clean Background
                                    </button>
                                    <button type="button" onClick={analyzeCropProducts} disabled={!cropFile || analyzingProducts} className="btn-secondary">
                                        {analyzingProducts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                                        Identify Products
                                    </button>
                                    <button type="button" onClick={useCleanedImage} disabled={!cleanedPreviewUrl} className="btn-secondary">
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Use Cleaned Image
                                    </button>
                                </div>

                                {draftProduct ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cropped photo</p>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setKeepCroppedPhoto(true)}
                                                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                                                    keepCroppedPhoto
                                                        ? "bg-slate-950 text-white"
                                                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                                                }`}
                                            >
                                                Keep photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setKeepCroppedPhoto(false)}
                                                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                                                    !keepCroppedPhoto
                                                        ? "bg-slate-950 text-white"
                                                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                                                }`}
                                            >
                                                Remove photo
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                {cleaningError ? (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {cleaningError}
                                    </div>
                                ) : null}

                                {analysisError ? (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                        {analysisError}
                                    </div>
                                ) : null}

                                {detectedProducts.length > 0 ? (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-slate-950">Detected products</p>
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                                                {detectedProducts.length} found
                                            </span>
                                        </div>
                                        <div className="mt-3 grid gap-3">
                                            {detectedProducts.map((product, index) => (
                                                <div key={`${product.title}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h3 className="font-semibold text-slate-950">{product.title}</h3>
                                                            <p className="mt-1 text-sm leading-6 text-slate-600">{product.description}</p>
                                                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                                                {product.category}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <button type="button" onClick={() => applyDetectedProduct(product)} className="btn-secondary">
                                                            Use this
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyWhatsAppText({
                                                                    productName: product.title,
                                                                    descriptionNotes: product.description,
                                                                    category: product.category,
                                                                    price: draftProduct?.price,
                                                                    itemCode: draftProduct?.itemCode,
                                                                })
                                                            }
                                                            className="btn-secondary"
                                                        >
                                                            <Clipboard className="mr-2 h-4 w-4" />
                                                            Copy to WhatsApp
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick category buttons</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {categoryOptions.map((category) => (
                                            <button
                                                key={category}
                                                type="button"
                                                onClick={() => updateCategory(category)}
                                                disabled={!draftProduct}
                                                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                                                    draftProduct?.category === category
                                                        ? "bg-slate-950 text-white"
                                                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                }`}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Product name</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={draftProduct?.productName || ""}
                                                onChange={(event) => updateDraft("productName", event.target.value)}
                                                className="form-field"
                                                placeholder="Example: Premium Designer Handbag"
                                                disabled={!draftProduct}
                                            />
                                            <button type="button" onClick={generateName} disabled={!draftProduct} className="btn-secondary shrink-0">
                                                <WandSparkles className="mr-2 h-4 w-4" />
                                                Generate
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                                        <select
                                            value={draftProduct?.category || ""}
                                            onChange={(event) => updateCategory(event.target.value)}
                                            className="form-field"
                                            disabled={!draftProduct}
                                        >
                                            {categoryOptions.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Price</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={draftProduct?.price || ""}
                                                onChange={(event) => updateDraft("price", event.target.value)}
                                                className="form-field"
                                                placeholder="Example: 1999"
                                                disabled={!draftProduct}
                                            />
                                            <button type="button" onClick={formatPrice} disabled={!draftProduct} className="btn-secondary shrink-0">
                                                Format Price
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                                        <div className="flex gap-2">
                                            <textarea
                                                value={draftProduct?.descriptionNotes || ""}
                                                onChange={(event) => updateDraft("descriptionNotes", event.target.value)}
                                                className="form-field min-h-20"
                                                placeholder="Short WhatsApp-friendly product description"
                                                disabled={!draftProduct}
                                            />
                                            <button
                                                type="button"
                                                onClick={generateDescription}
                                                disabled={!draftProduct}
                                                className="btn-secondary shrink-0 self-start"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                    </div>

                                    {draftProduct ? (
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">WhatsApp copy</p>
                                                <button type="button" onClick={() => copyWhatsAppText()} className="btn-secondary">
                                                    <Clipboard className="mr-2 h-4 w-4" />
                                                    Copy to WhatsApp
                                                </button>
                                            </div>
                                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{buildWhatsAppCopy()}</p>
                                        </div>
                                    ) : null}

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">SKU</label>
                                            <input
                                                value={draftProduct?.sku || draftProduct?.itemCode || ""}
                                                onChange={(event) => updateDraft("sku", event.target.value)}
                                                className="form-field"
                                                placeholder="COS001"
                                                disabled={!draftProduct}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-slate-700">Availability</label>
                                            <select
                                                value={draftProduct?.availability || "In stock"}
                                                onChange={(event) => updateDraft("availability", event.target.value)}
                                                className="form-field"
                                                disabled={!draftProduct}
                                            >
                                                <option>In stock</option>
                                                <option>Limited stock</option>
                                                <option>Made to order</option>
                                                <option>Out of stock</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <button type="button" onClick={saveProductToCatalog} disabled={!draftProduct} className="btn-primary justify-center">
                                    Save Product To Catalog
                                </button>
                            </div>
                        </DashboardCard>

                        <section className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm leading-6 text-slate-700 shadow-sm">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                                <p>
                                    This workspace only prepares clean catalog assets. Final WhatsApp verification and publishing still require business owner confirmation.
                                </p>
                            </div>
                        </section>
                    </aside>
                </div>
            )}
        </section>
    );
}

export default ImageWorkspace;
