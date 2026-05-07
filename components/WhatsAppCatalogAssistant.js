"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    BadgeCheck,
    CheckCircle2,
    Copy,
    Download,
    FileText,
    Files,
    Loader2,
    MessageSquareMore,
    PackageCheck,
    Plus,
    RotateCcw,
    RefreshCw,
    Save,
    Sparkles,
    WandSparkles,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { AuthGate } from "./AuthGate";
import { DashboardShell } from "./DashboardShell";
import { ImageWorkspace } from "./catalog/ImageWorkspace";
import {
    DashboardCard,
    EmptyState,
    FeedbackMessage,
    SectionHeading,
    StatCard,
} from "./DashboardUI";
import {
    applyTemplateToDraft,
    buildBulkQuickRepliesText,
    buildCatalogCsv,
    buildChecklistText,
    buildPrintableMiniCatalogHtml,
    buildProfileText,
    buildQuickRepliesText,
    buildWhatsAppKitZip,
    createShelfImage,
    createEmptyProduct,
    determineProjectStatus,
    generateCatalogKit,
    getRealProducts,
    isWhatsAppServiceType,
    normalizeBusinessData,
    normalizeProduct,
    normalizeShelfImages,
    sanitizeText,
    slugify,
    whatsappCatalogTemplates,
} from "../app/lib/whatsappCatalog";

const STORAGE_KEY = "ikigaidigital-whatsapp-catalog-assistant";

const statusStyles = {
    draft: "bg-slate-100 text-slate-700 ring-slate-200",
    ready: "bg-blue-50 text-blue-700 ring-blue-200",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const WIZARD_STEPS = [
    { value: "details", label: "Business Details" },
    { value: "photos", label: "Upload Photos" },
    { value: "crop", label: "Crop Products" },
    { value: "catalog", label: "Add Name & Price" },
    { value: "export", label: "Export Catalog" },
];

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    downloadBlob(filename, blob);
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

function openPrintCatalog(html) {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!printWindow) return false;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
        printWindow.print();
    }, 300);
    return true;
}

async function imageUrlToFile(imageUrl, filename = "catalog-image.png") {
    if (!imageUrl) throw new Error("Image URL is required.");

    if (imageUrl.startsWith("data:")) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type || "image/png" });
    }

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
}

function formatDate(value) {
    if (!value) return "Recently updated";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function normalizeNullable(value) {
    const trimmed = sanitizeText(value);
    return trimmed || null;
}

function isPersistentImageReference(value = "") {
    const normalized = String(value || "");
    return normalized.startsWith("http://") || normalized.startsWith("https://");
}

function isAutosaveFriendlyImageReference(value = "") {
    const normalized = String(value || "");
    return (
        isPersistentImageReference(normalized) ||
        (normalized.startsWith("data:image/") && normalized.length <= 200000)
    );
}

function buildAutosaveBusiness(business = {}) {
    return {
        ...business,
        logoUrl: isAutosaveFriendlyImageReference(business.logoUrl) ? business.logoUrl : "",
    };
}

function buildAutosaveShelfImages(images = []) {
    return (images || []).map((image) =>
        createShelfImage({
            id: image.id,
            name: image.name,
            previewUrl: isPersistentImageReference(image.previewUrl) ? image.previewUrl : "",
            dataUrl: "",
            uploadedAt: image.uploadedAt,
            isObjectUrl: false,
        })
    );
}

function buildAutosaveProducts(products = []) {
    return (products || []).map((product) =>
        normalizeProduct({
            ...product,
            imageUrl: isPersistentImageReference(product.imageUrl) ? product.imageUrl : "",
            originalImageUrl: isPersistentImageReference(product.originalImageUrl) ? product.originalImageUrl : "",
            cleanedImageUrl: isPersistentImageReference(product.cleanedImageUrl) ? product.cleanedImageUrl : "",
        })
    );
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Could not read selected image."));
        reader.readAsDataURL(file);
    });
}

function isMeaningfulDraft(business, products, shelfImages = []) {
    const normalizedBusiness = normalizeBusinessData(business);
    const realProducts = getRealProducts(products);

    return Boolean(
        normalizedBusiness.businessName ||
            normalizedBusiness.businessCategory ||
            normalizedBusiness.phone ||
            normalizedBusiness.address ||
            normalizedBusiness.businessDescription ||
            realProducts.length > 0 ||
            (shelfImages || []).length > 0
    );
}

function StatusBadge({ status = "draft" }) {
    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[status] || statusStyles.draft}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function CompletionBar({ score = 0 }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <span>Completion</span>
                <span className="text-slate-700">{score}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
                <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.max(6, score)}%` }}
                />
            </div>
        </div>
    );
}

function ProductEditor({
    product,
    index,
    onChange,
    onRemove,
    onCleanImage,
    onUseCleanedImage,
    cleaningState,
}) {
    const setValue = (field, value) => onChange(product.id, field, value);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">Product {index + 1}</p>
                    <p className="text-xs text-slate-500">Add only the details needed for WhatsApp-ready catalog content.</p>
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(product.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                    Remove
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {product.imageUrl ? (
                    <div className="md:col-span-2">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                <Image
                                    src={product.originalImageUrl || product.imageUrl}
                                    alt={product.productName || `Product ${index + 1}`}
                                    width={1200}
                                    height={520}
                                    unoptimized
                                    className="h-44 w-full object-cover"
                                />
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                {cleaningState?.cleanedPreview || product.cleanedImageUrl ? (
                                    <Image
                                        src={cleaningState?.cleanedPreview || product.cleanedImageUrl}
                                        alt={`${product.productName || `Product ${index + 1}`} cleaned`}
                                        width={1200}
                                        height={520}
                                        unoptimized
                                        className="h-44 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-44 items-center justify-center px-6 text-center text-sm text-slate-500">
                                        Cleaned preview will appear here after provider processing.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Background cleanup providers</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    { key: "auto", label: "Auto Clean" },
                                    { key: "removebg", label: "Clean with remove.bg" },
                                    { key: "photoroom", label: "Clean with PhotoRoom" },
                                    { key: "cloudinary", label: "Clean with Cloudinary" },
                                ].map((provider) => (
                                    <button
                                        key={provider.key}
                                        type="button"
                                        onClick={() => onCleanImage(product, provider.key)}
                                        className="btn-secondary justify-center"
                                    >
                                        {cleaningState?.provider === provider.key && cleaningState?.loading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="mr-2 h-4 w-4" />
                                        )}
                                        {provider.label}
                                    </button>
                                ))}
                            </div>
                            {cleaningState?.error ? (
                                <p className="mt-3 text-sm font-medium text-red-600">{cleaningState.error}</p>
                            ) : null}
                            {(cleaningState?.cleanedPreview || product.cleanedImageUrl) ? (
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => onUseCleanedImage(product.id)}
                                        className="btn-primary"
                                    >
                                        Use cleaned image
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onCleanImage(product, cleaningState?.provider || "removebg")}
                                        className="btn-secondary"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Product name</label>
                    <input
                        value={product.productName}
                        onChange={(event) => setValue("productName", event.target.value)}
                        className="form-field"
                        placeholder="Example: Pure Cotton Kurti"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                    <input
                        value={product.category}
                        onChange={(event) => setValue("category", event.target.value)}
                        className="form-field"
                        placeholder="Example: Women Wear"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Price</label>
                    <input
                        value={product.price}
                        onChange={(event) => setValue("price", event.target.value)}
                        className="form-field"
                        placeholder="Example: 1999"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Availability</label>
                    <select
                        value={product.availability}
                        onChange={(event) => setValue("availability", event.target.value)}
                        className="form-field"
                    >
                        <option>In stock</option>
                        <option>Limited stock</option>
                        <option>Made to order</option>
                        <option>Out of stock</option>
                    </select>
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Image URL / upload placeholder</label>
                    <input
                        value={product.imageUrl}
                        onChange={(event) => setValue("imageUrl", event.target.value)}
                        className="form-field"
                        placeholder="Paste image URL or asset note"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">SKU (optional)</label>
                    <input
                        value={product.sku}
                        onChange={(event) => setValue("sku", event.target.value)}
                        className="form-field"
                        placeholder="Example: KURTI-001"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Item code (optional)</label>
                    <input
                        value={product.itemCode || ""}
                        onChange={(event) => setValue("itemCode", event.target.value)}
                        className="form-field"
                        placeholder="Auto-generated if left blank"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Cropped image placeholder</label>
                    <input
                        value={product.cropNote || ""}
                        onChange={(event) => setValue("cropNote", event.target.value)}
                        className="form-field"
                        placeholder="Example: Crop top-left shelf section before client upload"
                    />
                </div>
                <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={Boolean(product.isBestSeller)}
                            onChange={(event) => setValue("isBestSeller", event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-950"
                        />
                        Mark as Best Seller
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={Boolean(product.isNewArrival)}
                            onChange={(event) => setValue("isNewArrival", event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-950"
                        />
                        Mark as New Arrival
                    </label>
                </div>
            </div>

            <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Description notes</label>
                <textarea
                    value={product.descriptionNotes}
                    onChange={(event) => setValue("descriptionNotes", event.target.value)}
                    className="form-field min-h-24"
                    placeholder="Key features, quality notes, flavor notes, sizes, or delivery points."
                />
            </div>
        </div>
    );
}

export function WhatsAppCatalogAssistant({ role = "admin" }) {
    const allowedRoles = role === "admin" ? ["admin"] : ["partner"];
    const roleKey = role === "admin" ? "admin" : "partner";
    const router = useRouter();
    const searchParams = useSearchParams();
    const businessNameRef = useRef(null);
    const businessCategoryRef = useRef(null);
    const hydratedDraftRef = useRef(false);
    const shelfImagesRef = useRef([]);
    const [business, setBusiness] = useState({
        clientName: "",
        businessName: "",
        businessCategory: "",
        phone: "",
        address: "",
        supportEmail: "",
        workingHours: "",
        businessDescription: "",
        logoUrl: "",
        notes: "",
        templateType: "",
    });
    const [shelfImages, setShelfImages] = useState([]);
    const [products, setProducts] = useState([createEmptyProduct()]);
    const [cleaningStates, setCleaningStates] = useState({});
    const [selectedImageId, setSelectedImageId] = useState(null);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [exportedAt, setExportedAt] = useState(null);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState("");
    const [savedProjects, setSavedProjects] = useState([]);
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", text: "" });
    const [validationErrors, setValidationErrors] = useState({});
    const [templateIntent, setTemplateIntent] = useState("");
    const [autosaveStamp, setAutosaveStamp] = useState("");
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [uploadingShelfImages, setUploadingShelfImages] = useState(false);
    const [currentStep, setCurrentStep] = useState("details");
    const queryProjectId = searchParams.get("projectId");
    const queryTaskId = searchParams.get("taskId");
    const [accessChecking, setAccessChecking] = useState(roleKey === "partner");
    const [taskContext, setTaskContext] = useState(null);
    const [accessLockedMessage, setAccessLockedMessage] = useState("");

    const autosaveKey = `${STORAGE_KEY}-${roleKey}${queryTaskId ? `-${queryTaskId}` : ""}`;

    const computedKit = useMemo(
        () => generateCatalogKit({ business, products, exportedAt }),
        [business, products, exportedAt]
    );

    const overviewCards = useMemo(
        () => [
            {
                label: "Saved projects",
                value: savedProjects.length,
                icon: FileText,
                accent: "bg-slate-950",
            },
            {
                label: "Completion score",
                value: `${computedKit.completionScore}%`,
                icon: BadgeCheck,
                accent: "bg-blue-500",
            },
            {
                label: "Catalog items",
                value: computedKit.generatedProducts.length,
                icon: PackageCheck,
                accent: "bg-emerald-500",
            },
            {
                label: "Project status",
                value: computedKit.status.charAt(0).toUpperCase() + computedKit.status.slice(1),
                icon: Sparkles,
                accent: "bg-indigo-500",
            },
        ],
        [computedKit, savedProjects.length]
    );

    const currentStepIndex = useMemo(
        () => WIZARD_STEPS.findIndex((step) => step.value === currentStep),
        [currentStep]
    );

    const previousStep = currentStepIndex > 0 ? WIZARD_STEPS[currentStepIndex - 1] : null;
    const nextStep = currentStepIndex >= 0 && currentStepIndex < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[currentStepIndex + 1] : null;

    const enrichProject = useCallback((project) => {
        const draftBusiness = {
            clientName: project.client_name || "",
            businessName: project.business_name || "",
            businessCategory: project.business_category || "",
            phone: project.phone || "",
            address: project.address || "",
            supportEmail: project.support_email || "",
            workingHours: project.working_hours || "",
            businessDescription: project.business_description || "",
            logoUrl: project.logo_url || "",
            notes: project.notes || "",
            templateType: project.template_type || "",
        };
        const kit = generateCatalogKit({
            business: draftBusiness,
            products: project.products || [],
            exportedAt: project.exported_at || null,
        });

        return {
            ...project,
            shelf_images: normalizeShelfImages(project.shelf_images || []),
            status: project.status || kit.status,
            completion_score:
                typeof project.completion_score === "number" ? project.completion_score : kit.completionScore,
            product_count: getRealProducts(project.products || []).length,
            updated_at: project.updated_at || project.created_at,
        };
    }, []);

    const fetchTaskContext = useCallback(async () => {
        if (roleKey === "admin") {
            if (!queryTaskId) {
                setTaskContext(null);
                setAccessLockedMessage("");
                setAccessChecking(false);
                return;
            }

            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("id", queryTaskId)
                .single();

            setTaskContext(!error && data ? data : null);
            setAccessLockedMessage(!error && data ? "" : "This task could not be found.");
            setAccessChecking(false);
            return;
        }

        if (!queryTaskId) {
            setTaskContext(null);
            setAccessLockedMessage("This tool is available only for paid ikigaidigital client tasks assigned to you.");
            setAccessChecking(false);
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setTaskContext(null);
            setAccessLockedMessage("Please login again to continue.");
            setAccessChecking(false);
            return;
        }

        const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", queryTaskId)
            .single();

        const isValidTask =
            !error &&
            data &&
            data.worker_id === user.id &&
            isWhatsAppServiceType(`${data.service_type || ""} ${data.title || ""}`) &&
            data.payment_status === "paid" &&
            !["completed", "cancelled"].includes(data.status || "assigned");

        if (!isValidTask) {
            setTaskContext(null);
            setAccessLockedMessage("This tool is available only for paid ikigaidigital client tasks assigned to you.");
            setAccessChecking(false);
            return;
        }

        setTaskContext(data);
        setAccessLockedMessage("");
        setAccessChecking(false);
    }, [queryTaskId, roleKey]);

    const fetchProjects = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setSavedProjects([]);
            setProjectsLoaded(true);
            return;
        }

        let query = supabase
            .from("whatsapp_catalog_projects")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(100);

        if (role !== "admin") {
            query = query
                .eq("partner_id", user.id)
                .not("task_id", "is", null)
                .eq("project_type", "client_task");
        }

        const { data, error } = await query;

        if (error) {
            setSavedProjects([]);
            setProjectsLoaded(true);
            setFeedback({ type: "error", text: error.message || "Could not load saved WhatsApp catalog projects." });
            return;
        }

        setSavedProjects((data || []).map(enrichProject));
        setProjectsLoaded(true);
    }, [enrichProject, role]);

    const resetDraft = useCallback(() => {
        setBusiness({
            clientName: "",
            businessName: "",
            businessCategory: "",
            phone: "",
            address: "",
            supportEmail: "",
            workingHours: "",
            businessDescription: "",
            logoUrl: "",
            notes: "",
            templateType: "",
        });
        setShelfImages([]);
        setSelectedImageId(null);
        setProducts([createEmptyProduct()]);
        setCleaningStates({});
        setActiveProjectId(null);
        setExportedAt(null);
        setValidationErrors({});
        setPreviewEnabled(false);
        setUnsavedChanges(false);
        setTemplateIntent("");
        localStorage.removeItem(autosaveKey);
        const base = roleKey === "admin" ? "/admin/tools/whatsapp-catalog" : "/partner/tools/whatsapp-catalog";
        const params = new URLSearchParams();
        if (queryTaskId) params.set("taskId", queryTaskId);
        router.replace(params.toString() ? `${base}?${params.toString()}` : base);
    }, [autosaveKey, queryTaskId, roleKey, router]);

    const hydrateProject = useCallback((project) => {
        setBusiness({
            clientName: project.client_name || "",
            businessName: project.business_name || "",
            businessCategory: project.business_category || "",
            phone: project.phone || "",
            address: project.address || "",
            supportEmail: project.support_email || "",
            workingHours: project.working_hours || "",
            businessDescription: project.business_description || "",
            logoUrl: project.logo_url || "",
            notes: project.notes || "",
            templateType: project.template_type || "",
        });
        setShelfImages(normalizeShelfImages(project.shelf_images || []));
        setSelectedImageId(normalizeShelfImages(project.shelf_images || [])[0]?.id || null);
        setProducts(
            getRealProducts(project.products || []).length
                ? getRealProducts(project.products || [])
                : [createEmptyProduct()]
        );
        setCleaningStates({});
        setActiveProjectId(project.id);
        setExportedAt(project.exported_at || null);
        setValidationErrors({});
        setPreviewEnabled(true);
        setUnsavedChanges(false);
        setCurrentStep("details");
        setFeedback({ type: "success", text: "Project loaded into the editor." });
    }, []);

    const createDraftProjectFromTask = useCallback(async () => {
        if (!taskContext?.id) return;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const draftBusiness = normalizeBusinessData({
            clientName: taskContext.client_name || taskContext.client_email || "",
            businessName:
                taskContext.client_business_name ||
                taskContext.business_name ||
                taskContext.title ||
                "ikigaidigital Client",
            businessCategory: "WhatsApp Catalog",
            phone: taskContext.client_phone || "",
            address: taskContext.client_address || "",
            supportEmail: taskContext.client_email || "",
            workingHours: "",
            businessDescription: taskContext.description || "",
            logoUrl: "",
            notes: "",
            templateType: "",
        });

        const draftKit = generateCatalogKit({
            business: draftBusiness,
            products: [],
            exportedAt: null,
        });

        const payload = {
            client_name: draftBusiness.clientName || "ikigaidigital client",
            business_name: draftBusiness.businessName,
            business_category: draftBusiness.businessCategory,
            phone: normalizeNullable(draftBusiness.phone),
            address: normalizeNullable(draftBusiness.address),
            support_email: normalizeNullable(draftBusiness.supportEmail),
            working_hours: normalizeNullable(draftBusiness.workingHours),
            business_description: normalizeNullable(draftBusiness.businessDescription),
            logo_url: normalizeNullable(draftBusiness.logoUrl),
            notes: normalizeNullable(draftBusiness.notes),
            template_type: normalizeNullable(draftBusiness.templateType),
            shelf_images: [],
            products: [],
            generated_profile: draftKit.generatedProfile,
            checklist: draftKit.checklist,
            status: determineProjectStatus({ checklist: draftKit.checklist, exportedAt: null }),
            completion_score: draftKit.completionScore,
            exported_at: null,
            task_id: taskContext.id,
            client_id: taskContext.client_id || null,
            partner_id: user.id,
            created_by: user.id,
            project_type: "client_task",
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("whatsapp_catalog_projects")
            .insert([payload])
            .select()
            .single();

        if (error || !data) {
            setFeedback({
                type: "error",
                text: error?.message || "Could not create the task-linked catalog draft.",
            });
            return;
        }

        const enriched = enrichProject(data);
        setSavedProjects((current) => [enriched, ...current.filter((item) => item.id !== enriched.id)]);
        hydrateProject(enriched);
        const params = new URLSearchParams();
        params.set("taskId", taskContext.id);
        params.set("projectId", enriched.id);
        router.replace(`/partner/tools/whatsapp-catalog?${params.toString()}`);
    }, [enrichProject, hydrateProject, router, taskContext]);

    useEffect(() => {
        queueMicrotask(() => {
            fetchTaskContext();
        });
    }, [fetchTaskContext]);

    useEffect(() => {
        queueMicrotask(() => {
            fetchProjects();
        });
    }, [fetchProjects]);

    useEffect(() => {
        if (!queryProjectId || !savedProjects.length || activeProjectId === queryProjectId) return;

        const matchingProject = savedProjects.find((project) => project.id === queryProjectId);
        if (
            matchingProject &&
            (roleKey === "admin" ||
                (queryTaskId && matchingProject.task_id === queryTaskId))
        ) {
            hydrateProject(matchingProject);
        }
    }, [activeProjectId, hydrateProject, queryProjectId, queryTaskId, roleKey, savedProjects]);

    useEffect(() => {
        if (roleKey !== "partner") return;
        if (!taskContext?.id || !projectsLoaded || queryProjectId || activeProjectId) return;

        const existingProject = savedProjects.find((project) => project.task_id === taskContext.id);
        if (existingProject) {
            hydrateProject(existingProject);
            const params = new URLSearchParams();
            params.set("taskId", taskContext.id);
            params.set("projectId", existingProject.id);
            router.replace(`/partner/tools/whatsapp-catalog?${params.toString()}`);
            return;
        }

        queueMicrotask(() => {
            createDraftProjectFromTask();
        });
    }, [
        activeProjectId,
        createDraftProjectFromTask,
        hydrateProject,
        projectsLoaded,
        queryProjectId,
        roleKey,
        router,
        savedProjects,
        taskContext,
    ]);

    useEffect(() => {
        if (hydratedDraftRef.current) return;
        hydratedDraftRef.current = true;

        const savedDraft = localStorage.getItem(autosaveKey);
        if (!savedDraft) return;

        try {
            const parsed = JSON.parse(savedDraft);
            if (!parsed || !isMeaningfulDraft(parsed.business, parsed.products, parsed.shelfImages)) return;

            queueMicrotask(() => {
                setBusiness({
                    clientName: parsed.business?.clientName || "",
                    businessName: parsed.business?.businessName || "",
                    businessCategory: parsed.business?.businessCategory || "",
                    phone: parsed.business?.phone || "",
                    address: parsed.business?.address || "",
                    supportEmail: parsed.business?.supportEmail || "",
                    workingHours: parsed.business?.workingHours || "",
                    businessDescription: parsed.business?.businessDescription || "",
                    logoUrl: parsed.business?.logoUrl || "",
                    notes: parsed.business?.notes || "",
                    templateType: parsed.business?.templateType || "",
                });
                setShelfImages(normalizeShelfImages(parsed.shelfImages || []));
                setSelectedImageId(parsed.selectedImageId || normalizeShelfImages(parsed.shelfImages || [])[0]?.id || null);
                setProducts(getRealProducts(parsed.products || []).length ? getRealProducts(parsed.products || []) : [createEmptyProduct()]);
                setCleaningStates({});
                setActiveProjectId(parsed.activeProjectId || null);
                setExportedAt(parsed.exportedAt || null);
                setPreviewEnabled(Boolean(parsed.previewEnabled));
                setAutosaveStamp(parsed.savedAt || "");
                setFeedback({ type: "success", text: "Recovered your local draft." });
            });
        } catch {
            localStorage.removeItem(autosaveKey);
        }
    }, [autosaveKey]);

    useEffect(() => {
        if (!hydratedDraftRef.current) return;
        if (!isMeaningfulDraft(business, products, shelfImages)) return;

        const timer = window.setTimeout(() => {
            try {
                const savedAt = new Date().toISOString();
                localStorage.setItem(
                    autosaveKey,
                    JSON.stringify({
                        business: buildAutosaveBusiness(business),
                        shelfImages: buildAutosaveShelfImages(shelfImages),
                        products: buildAutosaveProducts(products),
                        selectedImageId,
                        activeProjectId,
                        exportedAt,
                        previewEnabled,
                        savedAt,
                    })
                );
                setAutosaveStamp(savedAt);
            } catch (error) {
                if (error?.name === "QuotaExceededError") {
                    localStorage.removeItem(autosaveKey);
                    setFeedback({
                        type: "error",
                        text: "Local draft storage was full, so heavy image previews were skipped. Save the project to keep image work safely in Supabase.",
                    });
                    return;
                }

                setFeedback({
                    type: "error",
                    text: "Could not update the local draft cache for this catalog project.",
                });
            }
        }, 500);

        return () => window.clearTimeout(timer);
    }, [activeProjectId, autosaveKey, business, exportedAt, previewEnabled, products, selectedImageId, shelfImages]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!unsavedChanges) return;
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [unsavedChanges]);

    useEffect(() => {
        shelfImagesRef.current = shelfImages;
    }, [shelfImages]);

    useEffect(() => {
        return () => {
            shelfImagesRef.current.forEach((image) => {
                if (image.isObjectUrl && image.previewUrl?.startsWith("blob:")) {
                    URL.revokeObjectURL(image.previewUrl);
                }
            });
        };
    }, []);

    const setBusinessField = (field, value) => {
        setBusiness((current) => ({ ...current, [field]: value }));
        setUnsavedChanges(true);
        setValidationErrors((current) => ({ ...current, [field]: "" }));
        setFeedback({ type: "", text: "" });
    };

    const uploadLogoImage = async (file) => {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setFeedback({ type: "error", text: "Please select an image file for the business logo." });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setFeedback({ type: "error", text: "Please keep the logo image under 5MB." });
            return;
        }

        try {
            const logoDataUrl = await fileToDataUrl(file);
            setBusiness((current) => ({
                ...current,
                logoUrl: logoDataUrl,
            }));
            setUnsavedChanges(true);
            setFeedback({ type: "success", text: "Logo uploaded. You can keep it as the project logo or replace it anytime." });
        } catch {
            setFeedback({ type: "error", text: "Could not read this logo image. Please try another file." });
        }
    };

    const setProductField = (id, field, value) => {
        setProducts((current) => current.map((product) => (product.id === id ? { ...product, [field]: value } : product)));
        setUnsavedChanges(true);
        setFeedback({ type: "", text: "" });
    };

    const uploadShelfImages = async (files) => {
        if (!files?.length) return;

        setUploadingShelfImages(true);

        const fileList = Array.from(files);
        const invalidType = fileList.find((file) => !file.type.startsWith("image/"));
        if (invalidType) {
            setUploadingShelfImages(false);
            setFeedback({ type: "error", text: "Only image files can be uploaded to the catalog workspace." });
            return;
        }

        const oversizedFile = fileList.find((file) => file.size > 5 * 1024 * 1024);
        if (oversizedFile) {
            setUploadingShelfImages(false);
            setFeedback({
                type: "error",
                text: `${oversizedFile.name} is larger than 5MB. Please upload a smaller image.`,
            });
            return;
        }

        const loadedImages = await Promise.all(
            fileList.map(async (file) => {
                const previewUrl = URL.createObjectURL(file);
                const dataUrl = await fileToDataUrl(file);
                const imageRecord = createShelfImage({
                    name: file.name,
                    previewUrl,
                    dataUrl,
                    file,
                    isObjectUrl: true,
                });

                return imageRecord;
            })
        ).catch((error) => {
            setFeedback({ type: "error", text: error.message || "Could not process selected images." });
            return [];
        });

        if (loadedImages.length) {
            setShelfImages((current) => [...loadedImages, ...current]);
            setSelectedImageId(loadedImages[0].id);
            setUnsavedChanges(true);
            setFeedback({
                type: "success",
                text: `${loadedImages.length} shelf ${loadedImages.length === 1 ? "image" : "images"} added. Create product cards from the gallery below.`,
            });
        }

        setUploadingShelfImages(false);
    };

    const removeShelfImage = (imageId) => {
        const imageToRemove = shelfImages.find((image) => image.id === imageId);
        if (imageToRemove?.isObjectUrl && imageToRemove.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
        }

        const remainingImages = shelfImages.filter((image) => image.id !== imageId);
        setShelfImages(remainingImages);
        setProducts((current) =>
            current.map((product) =>
                product.sourceImageId === imageId
                    ? { ...product, sourceImageId: "", imageUrl: "", cropNote: product.cropNote || "" }
                    : product
            )
        );
        if (selectedImageId === imageId) {
            setSelectedImageId(remainingImages[0]?.id || null);
        }
        setUnsavedChanges(true);
    };

    const addProductFromWorkspace = (productDraft, options = {}) => {
        const normalizedProduct = normalizeProduct({
            ...productDraft,
            isNewArrival: productDraft.isNewArrival ?? true,
        });

        setProducts((current) => [normalizedProduct, ...current]);
        setPreviewEnabled(true);
        if (!options.stayInWorkspace) {
            setCurrentStep("catalog");
        }
        setUnsavedChanges(true);
        setFeedback({
            type: "success",
            text: options.stayInWorkspace
                ? "Product saved to the catalog. You can continue reviewing detected crops."
                : "Product added to the catalog. You can refine it further below and include it in exports.",
        });
    };

    const cleanProductImage = async (product, provider) => {
        if (!product?.imageUrl) {
            setFeedback({ type: "error", text: "This product does not have an image to clean yet." });
            return;
        }

        setCleaningStates((current) => ({
            ...current,
            [product.id]: {
                ...(current[product.id] || {}),
                loading: true,
                provider,
                error: "",
            },
        }));

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Please login again before cleaning images.");
            }

            const file = await imageUrlToFile(product.imageUrl, `${slugify(product.productName || "catalog-product") || "catalog-product"}.png`);
            const formData = new FormData();
            formData.append("image", file);
            formData.append("provider", provider);

            const response = await fetch("/api/image/clean-background", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error || "Could not clean this image.");
            }

            setCleaningStates((current) => ({
                ...current,
                [product.id]: {
                    loading: false,
                    provider: payload.provider || provider,
                    cleanedPreview: payload.cleanedImageUrl,
                    originalImageUrl: payload.originalImageUrl || product.originalImageUrl || product.imageUrl,
                    error: "",
                },
            }));
            setFeedback({
                type: "success",
                text: `${payload.provider || provider} cleaned the image. Review the before/after preview and apply it when ready.`,
            });
        } catch (error) {
            setCleaningStates((current) => ({
                ...current,
                [product.id]: {
                    ...(current[product.id] || {}),
                    loading: false,
                    provider,
                    error: error.message || "Could not clean this image.",
                },
            }));
            setFeedback({ type: "error", text: error.message || "Could not clean this image." });
        }
    };

    const goToStep = (stepValue) => {
        setCurrentStep(stepValue);
    };

    const goToPreviousStep = () => {
        if (!previousStep) return;
        setCurrentStep(previousStep.value);
    };

    const goToNextStep = () => {
        if (!nextStep) return;

        if (currentStep === "photos" && shelfImages.length === 0) {
            setFeedback({
                type: "error",
                text: "Upload at least one shelf photo before moving to crop products.",
            });
            return;
        }

        setCurrentStep(nextStep.value);
        setFeedback({
            type: "success",
            text: `Moved to ${nextStep.label}. Your current project data stays linked to this WhatsApp catalog flow.`,
        });
    };

    const useCleanedImage = (productId) => {
        const state = cleaningStates[productId];
        if (!state?.cleanedPreview) return;

        setProducts((current) =>
            current.map((product) =>
                product.id === productId
                    ? {
                          ...product,
                          originalImageUrl: product.originalImageUrl || product.imageUrl,
                          cleanedImageUrl: state.cleanedPreview,
                          imageUrl: state.cleanedPreview,
                          providerUsed: state.provider || product.providerUsed,
                      }
                    : product
            )
        );
        setUnsavedChanges(true);
        setFeedback({ type: "success", text: "Cleaned image applied to the product card." });
    };

    const addProduct = () => {
        setProducts((current) => [...current, createEmptyProduct()]);
        setUnsavedChanges(true);
    };

    const removeProduct = (id) => {
        setProducts((current) => {
            if (current.length === 1) return current;
            return current.filter((product) => product.id !== id);
        });
        setUnsavedChanges(true);
    };

    const handleGenerate = () => {
        setPreviewEnabled(true);
        setCurrentStep("export");
        setFeedback({
            type: "success",
            text: "Catalog kit generated. Review the preview, checklist, and exports before saving or sharing.",
        });
    };

    const applyTemplate = (templateType = templateIntent) => {
        if (!templateType) return;

        const appliedDraft = applyTemplateToDraft(templateType, business, products);
        setBusiness((current) => ({
            ...current,
            ...appliedDraft.business,
            clientName: current.clientName,
            phone: current.phone,
            address: current.address,
            supportEmail: current.supportEmail,
            logoUrl: current.logoUrl,
        }));
        setProducts(appliedDraft.products.length ? appliedDraft.products : [createEmptyProduct()]);
        setTemplateIntent("");
        setPreviewEnabled(true);
        setUnsavedChanges(true);
        setFeedback({
            type: "success",
            text: `${whatsappCatalogTemplates[templateType]?.label || "Template"} applied. Review the draft and adjust any client-specific details.`,
        });
    };

    const requestTemplate = (templateType) => {
        if (!templateType) {
            setTemplateIntent("");
            return;
        }

        if (isMeaningfulDraft(business, products, shelfImages)) {
            setTemplateIntent(templateType);
            return;
        }

        applyTemplate(templateType);
    };

    const validateDraft = () => {
        const normalizedBusiness = normalizeBusinessData(business);
        const realProducts = getRealProducts(products).map(normalizeProduct);
        const errors = {};

        if (!normalizedBusiness.businessName) {
            errors.businessName = "Please enter business name";
        }

        if (!normalizedBusiness.businessCategory) {
            errors.businessCategory = "Please choose business category";
        }

        if (
            !normalizedBusiness.phone &&
            !normalizedBusiness.address &&
            !normalizedBusiness.businessDescription &&
            realProducts.length === 0
        ) {
            errors.supporting = "Add at least one contact detail or one product";
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setFeedback({ type: "error", text: Object.values(errors)[0] });

            if (errors.businessName) businessNameRef.current?.focus();
            else if (errors.businessCategory) businessCategoryRef.current?.focus();
            return null;
        }

        setValidationErrors({});
        return { normalizedBusiness, realProducts };
    };

    const buildProjectPayload = (normalizedBusiness, realProducts, nextExportedAt = exportedAt, nextShelfImages = shelfImages) => {
        const kit = generateCatalogKit({
            business: normalizedBusiness,
            products: realProducts,
            exportedAt: nextExportedAt,
        });

        return {
            client_name: normalizeNullable(normalizedBusiness.clientName || normalizedBusiness.businessName) || "ikigaidigital client",
            business_name: normalizedBusiness.businessName,
            business_category: normalizedBusiness.businessCategory,
            phone: normalizeNullable(normalizedBusiness.phone),
            address: normalizeNullable(normalizedBusiness.address),
            support_email: normalizeNullable(normalizedBusiness.supportEmail),
            working_hours: normalizeNullable(normalizedBusiness.workingHours),
            business_description: normalizeNullable(normalizedBusiness.businessDescription),
            logo_url: normalizeNullable(normalizedBusiness.logoUrl),
            notes: normalizeNullable(normalizedBusiness.notes),
            template_type: normalizeNullable(normalizedBusiness.templateType),
            shelf_images: normalizeShelfImages(nextShelfImages),
            products: realProducts,
            generated_profile: kit.generatedProfile,
            checklist: kit.checklist,
            status: determineProjectStatus({ checklist: kit.checklist, exportedAt: nextExportedAt }),
            completion_score: kit.completionScore,
            exported_at: nextExportedAt,
            task_id: taskContext?.id || null,
            client_id: taskContext?.client_id || null,
            partner_id: taskContext?.worker_id || null,
            project_type: taskContext ? "client_task" : "internal",
            updated_at: new Date().toISOString(),
        };
    };

    const saveProject = async () => {
        if (saving) return;

        const validated = validateDraft();
        if (!validated) return;

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setFeedback({ type: "error", text: "Please login again before saving this project." });
            return;
        }

        if (roleKey === "partner" && !taskContext?.id) {
            setFeedback({ type: "error", text: "Open this tool from an assigned client task before saving." });
            return;
        }

        const { normalizedBusiness, realProducts } = validated;
        const payload = {
            ...buildProjectPayload(normalizedBusiness, realProducts, exportedAt, shelfImages),
            created_by: user.id,
        };

        setSaving(true);

        const query = activeProjectId
            ? supabase.from("whatsapp_catalog_projects").update(payload).eq("id", activeProjectId).select().single()
            : supabase.from("whatsapp_catalog_projects").insert([payload]).select().single();

        const { data, error } = await query;
        setSaving(false);

        if (error) {
            setFeedback({ type: "error", text: error.message || "Could not save this WhatsApp catalog project." });
            return;
        }

        if (data) {
            const enriched = enrichProject(data);
            setActiveProjectId(enriched.id);
            setExportedAt(enriched.exported_at || null);
            setSavedProjects((current) => {
                const next = current.filter((item) => item.id !== enriched.id);
                return [enriched, ...next];
            });
            router.replace(
                roleKey === "admin"
                    ? `/admin/tools/whatsapp-catalog?${new URLSearchParams(
                          Object.fromEntries(
                              Object.entries({
                                  projectId: enriched.id,
                                  taskId: taskContext?.id || "",
                              }).filter(([, value]) => value)
                          )
                      ).toString()}`
                    : `/partner/tools/whatsapp-catalog?${new URLSearchParams(
                          Object.fromEntries(
                              Object.entries({
                                  projectId: enriched.id,
                                  taskId: taskContext?.id || "",
                              }).filter(([, value]) => value)
                          )
                      ).toString()}`
            );
        }

        setPreviewEnabled(true);
        setUnsavedChanges(false);
        setFeedback({
            type: "success",
            text: activeProjectId
                ? "Project updated. Your latest WhatsApp catalog draft is saved."
                : "Project saved. You can reopen it anytime from project history.",
        });
    };

    const handleExport = async (kind) => {
        if (roleKey === "partner" && !taskContext?.id) {
            setFeedback({
                type: "error",
                text: "You can export only ikigaidigital client projects assigned to you.",
            });
            return;
        }

        if (!previewEnabled) {
            setFeedback({ type: "error", text: "Generate the catalog kit first so there is something to export." });
            return;
        }

        if (computedKit.generatedProducts.length === 0) {
            setFeedback({ type: "error", text: "Add at least one product before exporting the catalog deliverables." });
            return;
        }

        const incompleteProducts = computedKit.generatedProducts.filter(
            (product) =>
                !sanitizeText(product.productName || product.cleanedTitle) ||
                product.formattedPrice === "Price not provided"
        );

        if (incompleteProducts.length > 0) {
            setFeedback({
                type: "error",
                text: "Please add product name and price for every item before export.",
            });
            return;
        }

        setExporting(kind);

        if (kind === "csv") {
            downloadFile("ikigaidigital-whatsapp-catalog.csv", buildCatalogCsv(computedKit.generatedProducts), "text/csv;charset=utf-8;");
        }

        if (kind === "profile") {
            downloadFile("ikigaidigital-whatsapp-profile.txt", buildProfileText(computedKit.generatedProfile), "text/plain;charset=utf-8;");
        }

        if (kind === "replies") {
            downloadFile("ikigaidigital-whatsapp-quick-replies.txt", buildQuickRepliesText(computedKit.generatedProfile), "text/plain;charset=utf-8;");
        }

        if (kind === "checklist") {
            downloadFile(
                "ikigaidigital-whatsapp-setup-checklist.txt",
                buildChecklistText({
                    business,
                    checklist: computedKit.checklist,
                    generatedProducts: computedKit.generatedProducts,
                }),
                "text/plain;charset=utf-8;"
            );
        }

        if (kind === "bulk-replies") {
            downloadFile(
                "ikigaidigital-whatsapp-bulk-replies.txt",
                buildBulkQuickRepliesText({
                    business,
                    generatedProducts: computedKit.generatedProducts,
                    profile: computedKit.generatedProfile,
                }),
                "text/plain;charset=utf-8;"
            );
        }

        if (kind === "full-kit") {
            const zipBlob = await buildWhatsAppKitZip({
                business,
                generatedProfile: computedKit.generatedProfile,
                generatedProducts: computedKit.generatedProducts,
                checklist: computedKit.checklist,
                status: computedKit.status,
                completionScore: computedKit.completionScore,
            });
            downloadBlob("ikigaidigital-whatsapp-kit.zip", zipBlob);
        }

        if (kind === "mini-catalog-pdf") {
            const didOpen = openPrintCatalog(
                buildPrintableMiniCatalogHtml({
                    business,
                    generatedProducts: computedKit.generatedProducts,
                })
            );

            if (!didOpen) {
                setExporting("");
                setFeedback({
                    type: "error",
                    text: "Could not open the printable mini catalog window. Please allow pop-ups and try again.",
                });
                return;
            }
        }

        if (activeProjectId) {
            const nextExportedAt = new Date().toISOString();
            const payload = buildProjectPayload(normalizeBusinessData(business), getRealProducts(products), nextExportedAt, shelfImages);

            const { data, error } = await supabase
                .from("whatsapp_catalog_projects")
                .update(payload)
                .eq("id", activeProjectId)
                .select()
                .single();

            if (!error && data) {
                const enriched = enrichProject(data);
                setExportedAt(enriched.exported_at || nextExportedAt);
                setSavedProjects((current) => current.map((item) => (item.id === enriched.id ? enriched : item)));
            }
        }

        setExporting("");
        setFeedback({
            type: "success",
            text:
                kind === "full-kit"
                    ? "WhatsApp Kit downloaded successfully."
                    : "Export ready. Your WhatsApp catalog deliverable was prepared successfully.",
        });
    };

    const copyProductWhatsAppText = async (product) => {
        const text = sanitizeText(product?.whatsappReadyCopy);

        if (!text) {
            setFeedback({ type: "error", text: "No WhatsApp copy is available for this product yet." });
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            setFeedback({ type: "success", text: "Product WhatsApp copy copied." });
        } catch {
            setFeedback({ type: "error", text: "Could not copy the WhatsApp text. Please copy it manually." });
        }
    };

    if (roleKey === "partner" && accessChecking) {
        return (
            <AuthGate allowedRoles={allowedRoles}>
                <DashboardShell
                    role="partner"
                    eyebrow="Internal Tool"
                    title="WhatsApp Catalog Assistant"
                    description="Checking task access."
                >
                    <EmptyState
                        icon={Loader2}
                        title="Checking access"
                        description="We are confirming the client task linked to this tool."
                        className="bg-slate-50"
                    />
                </DashboardShell>
            </AuthGate>
        );
    }

    if (roleKey === "partner" && !taskContext) {
        return (
            <AuthGate allowedRoles={allowedRoles}>
                <DashboardShell
                    role="partner"
                    eyebrow="Internal Tool"
                    title="Tool Locked"
                    description="Open this tool from an assigned client task."
                >
                    <EmptyState
                        icon={AlertCircle}
                        title="This tool is locked"
                        description={accessLockedMessage || "This tool is available only for paid ikigaidigital client tasks assigned to you."}
                        action={
                            <Link href="/partner/tasks" className="btn-primary mt-6 inline-flex">
                                Go to My Tasks
                            </Link>
                        }
                        className="bg-slate-50"
                    />
                </DashboardShell>
            </AuthGate>
        );
    }

    return (
        <AuthGate allowedRoles={allowedRoles}>
            <DashboardShell
                role={roleKey}
                eyebrow="Internal Tool"
                title="WhatsApp Catalog Assistant"
                description="Build and export a WhatsApp catalog in a few simple steps."
            >
                <section className="mb-10">
                    <SectionHeading
                        eyebrow="Workspace"
                        icon={Sparkles}
                        title="Create one catalog at a time"
                        description="Add business details, upload photos, crop products, and export the final catalog."
                        action={
                            <div className="flex flex-wrap gap-3">
                                <button type="button" onClick={resetDraft} className="btn-secondary">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    New Project
                                </button>
                                <button type="button" onClick={saveProject} disabled={saving} className="btn-primary">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {activeProjectId ? "Update Project" : "Save Project"}
                                </button>
                            </div>
                        }
                    />
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {overviewCards.map((card) => (
                            <StatCard key={card.label} {...card} />
                        ))}
                    </div>
                    <FeedbackMessage type={feedback.type} className="mt-5">
                        {feedback.text}
                    </FeedbackMessage>
                    {activeProjectId ? (
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                                Editing: {business.businessName || "Saved project"}
                            </span>
                            {roleKey === "partner" ? (
                                <Link
                                    href="/partner/project-history"
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Back to Project History
                                </Link>
                            ) : null}
                        </div>
                    ) : null}
                    {taskContext ? (
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                Working on client task: {taskContext.title || "WhatsApp task"}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
                                {taskContext.service_type || "whatsapp"}
                            </span>
                        </div>
                    ) : null}
                </section>

                <section className="mb-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-3">
                        {WIZARD_STEPS.map((step, index) => (
                            <button
                                key={step.value}
                                type="button"
                                onClick={() => goToStep(step.value)}
                                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                    currentStep === step.value
                                        ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                                }`}
                            >
                                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Step {index + 1}
                                </span>
                                <span className="mt-1 block">{step.label}</span>
                            </button>
                        ))}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                            <p className="font-semibold text-slate-900">
                                Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Your project stays connected as you move through each step.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="space-y-6">
                    {currentStep === "details" && (
                        <section className="dashboard-panel p-6">
                            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Editor</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Fill the business details, add products, apply templates, and generate a polished WhatsApp-ready kit.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <StatusBadge status={computedKit.status} />
                                    {autosaveStamp ? (
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            Autosaved {formatDate(autosaveStamp)}
                                        </span>
                                    ) : null}
                                    {unsavedChanges ? (
                                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                                            Unsaved changes
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Client / owner name</label>
                                    <input
                                        value={business.clientName}
                                        onChange={(event) => setBusinessField("clientName", event.target.value)}
                                        className="form-field"
                                        placeholder="Example: Uzma Yasmeen"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Template</label>
                                    <select
                                        value={templateIntent || business.templateType}
                                        onChange={(event) => requestTemplate(event.target.value)}
                                        className="form-field"
                                    >
                                        <option value="">Choose a template</option>
                                        {Object.entries(whatsappCatalogTemplates).map(([key, template]) => (
                                            <option key={key} value={key}>
                                                {template.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="hidden xl:block" />
                            </div>

                            {templateIntent && isMeaningfulDraft(business, products) ? (
                                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                                    <p className="text-sm font-semibold text-slate-950">
                                        Apply the {whatsappCatalogTemplates[templateIntent]?.label} template?
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        This will refresh the category, suggested content tone, checklist guidance, and sample product categories.
                                    </p>
                                    <div className="mt-4 flex gap-3">
                                        <button type="button" onClick={applyTemplate} className="btn-primary">
                                            Apply Template
                                        </button>
                                        <button type="button" onClick={() => setTemplateIntent("")} className="btn-secondary">
                                            Keep Current Draft
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Business name</label>
                                    <input
                                        ref={businessNameRef}
                                        value={business.businessName}
                                        onChange={(event) => setBusinessField("businessName", event.target.value)}
                                        className={`form-field ${validationErrors.businessName ? "border-red-300 ring-2 ring-red-100" : ""}`}
                                        placeholder="Example: Uzma Boutique"
                                    />
                                    {validationErrors.businessName ? (
                                        <p className="mt-2 text-xs font-medium text-red-600">{validationErrors.businessName}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Business category</label>
                                    <input
                                        ref={businessCategoryRef}
                                        value={business.businessCategory}
                                        onChange={(event) => setBusinessField("businessCategory", event.target.value)}
                                        className={`form-field ${validationErrors.businessCategory ? "border-red-300 ring-2 ring-red-100" : ""}`}
                                        placeholder="Example: Boutique"
                                    />
                                    {validationErrors.businessCategory ? (
                                        <p className="mt-2 text-xs font-medium text-red-600">{validationErrors.businessCategory}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp phone number</label>
                                    <input
                                        value={business.phone}
                                        onChange={(event) => setBusinessField("phone", event.target.value)}
                                        className="form-field"
                                        placeholder="10-digit business number"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Support email</label>
                                    <input
                                        value={business.supportEmail}
                                        onChange={(event) => setBusinessField("supportEmail", event.target.value)}
                                        className="form-field"
                                        placeholder="hello@business.com"
                                    />
                                </div>
                                <div className="xl:col-span-2">
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Business address</label>
                                    <input
                                        value={business.address}
                                        onChange={(event) => setBusinessField("address", event.target.value)}
                                        className="form-field"
                                        placeholder="Banjara Hills, Hyderabad"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Working hours</label>
                                    <input
                                        value={business.workingHours}
                                        onChange={(event) => setBusinessField("workingHours", event.target.value)}
                                        className="form-field"
                                        placeholder="10 AM - 7 PM"
                                    />
                                </div>
                                <div className="xl:col-span-2">
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Business logo</label>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                {sanitizeText(business.logoUrl) ? (
                                                    <img
                                                        src={business.logoUrl}
                                                        alt={`${business.businessName || "Business"} logo`}
                                                        className="h-full w-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="px-4 text-center text-xs font-medium text-slate-500">
                                                        Upload logo
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-900">Add logo from device</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Upload a JPG, PNG, or WebP logo for this business profile.
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-3">
                                                    <label className="btn-secondary cursor-pointer">
                                                        Upload Logo
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(event) => {
                                                                const file = event.target.files?.[0];
                                                                uploadLogoImage(file);
                                                                event.target.value = "";
                                                            }}
                                                        />
                                                    </label>
                                                    {sanitizeText(business.logoUrl) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setBusinessField("logoUrl", "")}
                                                            className="btn-secondary"
                                                        >
                                                            Remove Logo
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="xl:col-span-3">
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Business description</label>
                                    <textarea
                                        value={business.businessDescription}
                                        onChange={(event) => setBusinessField("businessDescription", event.target.value)}
                                        className="form-field min-h-32"
                                        placeholder="What the business sells, tone of service, and what should be highlighted on WhatsApp."
                                    />
                                </div>
                                <div className="xl:col-span-3">
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Internal notes</label>
                                    <textarea
                                        value={business.notes}
                                        onChange={(event) => setBusinessField("notes", event.target.value)}
                                        className="form-field min-h-28"
                                        placeholder="Checklist notes, client reminders, or upload requirements."
                                    />
                                </div>
                            </div>

                            {validationErrors.supporting ? (
                                <p className="mt-4 text-sm font-medium text-red-600">{validationErrors.supporting}</p>
                            ) : null}
                        </section>
                    )}

                    {currentStep === "catalog" && (
                        <section className="dashboard-panel p-6">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Product catalog</p>
                                    <p className="mt-1 text-sm text-slate-500">Draft the product rows that will become WhatsApp-ready catalog entries.</p>
                                </div>
                                <button type="button" onClick={addProduct} className="btn-secondary">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Product
                                </button>
                            </div>

                            <div className="space-y-4">
                                {products.map((product, index) => (
                                    <ProductEditor
                                        key={product.id}
                                        product={product}
                                        index={index}
                                        onChange={setProductField}
                                        onRemove={removeProduct}
                                        onCleanImage={cleanProductImage}
                                        onUseCleanedImage={useCleanedImage}
                                        cleaningState={cleaningStates[product.id]}
                                    />
                                ))}
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button type="button" onClick={handleGenerate} className="btn-primary">
                                    <WandSparkles className="mr-2 h-4 w-4" />
                                    Generate Catalog Kit
                                </button>
                                <button type="button" onClick={saveProject} disabled={saving} className="btn-secondary">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {activeProjectId ? "Update Project" : "Save Project"}
                                </button>
                            </div>
                        </section>
                    )}

                    {currentStep === "export" && (
                        <section className="dashboard-panel p-6">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Preview mode</p>
                                    <p className="mt-1 text-sm text-slate-500">Prepare a real client-facing deliverable before WhatsApp verification and publishing.</p>
                                </div>
                                <StatusBadge status={computedKit.status} />
                            </div>

                            {!previewEnabled ? (
                                <EmptyState
                                    icon={Sparkles}
                                    title="Generate the catalog kit"
                                    description="Click Generate Catalog Kit to open profile preview, checklist progress, and export actions."
                                    className="p-8"
                                />
                            ) : (
                                <div className="space-y-5">
                                    <DashboardCard className="p-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-950">Project readiness</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {computedKit.stats.completedChecklist}/{computedKit.stats.totalChecklist} checklist items completed
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                {computedKit.completionScore}% ready
                                            </span>
                                        </div>
                                        <div className="mt-4">
                                            <CompletionBar score={computedKit.completionScore} />
                                        </div>
                                    </DashboardCard>

                                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                        <div className="space-y-5">
                                            <DashboardCard className="p-5">
                                                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                    <MessageSquareMore className="h-4 w-4 text-blue-600" />
                                                    WhatsApp profile preview
                                                </div>
                                                <div className="grid gap-3 xl:grid-cols-2 text-sm text-slate-600">
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Short description</p>
                                                        <p className="mt-2">{computedKit.generatedProfile.shortDescription}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">About text</p>
                                                        <p className="mt-2">{computedKit.generatedProfile.aboutText}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Greeting message</p>
                                                        <p className="mt-2">{computedKit.generatedProfile.greetingMessage}</p>
                                                    </div>
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Away message</p>
                                                        <p className="mt-2">{computedKit.generatedProfile.awayMessage}</p>
                                                    </div>
                                                </div>
                                            </DashboardCard>

                                            <DashboardCard className="p-5">
                                                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                    <PackageCheck className="h-4 w-4 text-blue-600" />
                                                    Catalog item preview
                                                </div>
                                                <div className="space-y-3">
                                                    {computedKit.generatedProducts.length === 0 ? (
                                                        <p className="text-sm text-slate-500">Add at least one product with a name to generate catalog-ready previews.</p>
                                                    ) : (
                                                        Object.entries(computedKit.groupedProducts || {}).map(([category, items]) => (
                                                            <div key={category} className="space-y-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{category}</p>
                                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                                        {items.length} item{items.length > 1 ? "s" : ""}
                                                                    </span>
                                                                </div>
                                                                {items.map((product) => (
                                                                    <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div>
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                                                                                        {product.itemCode}
                                                                                    </span>
                                                                                    {product.isBestSeller ? (
                                                                                        <span className="rounded-full bg-slate-950/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                                                                                            Best Seller
                                                                                        </span>
                                                                                    ) : null}
                                                                                    {product.isNewArrival ? (
                                                                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
                                                                                            New Arrival
                                                                                        </span>
                                                                                    ) : null}
                                                                                </div>
                                                                                <p className="mt-3 font-semibold text-slate-950">{product.premiumTitle || product.cleanedTitle}</p>
                                                                                <p className="mt-1 text-sm text-slate-500">{product.salesDescription || product.shortDescription}</p>
                                                                            </div>
                                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                                                                                {product.formattedPrice}
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                                            {product.suggestedTags.map((tag) => (
                                                                                <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                                                                    {tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">WhatsApp-ready copy</p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => copyProductWhatsAppText(product)}
                                                                                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                                                                                >
                                                                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                                                                    Copy to WhatsApp
                                                                                </button>
                                                                            </div>
                                                                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{product.whatsappReadyCopy}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </DashboardCard>
                                        </div>

                                        <div className="space-y-5">
                                            <DashboardCard className="p-5">
                                                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                                    Checklist progress
                                                </div>
                                                <div className="space-y-3">
                                                    {computedKit.checklist.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
                                                                item.complete
                                                                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                                                    : "border-amber-100 bg-amber-50 text-amber-700"
                                                            }`}
                                                        >
                                                            <span>{item.label}</span>
                                                            <span>{item.complete ? "Ready" : "Missing"}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </DashboardCard>

                                            <DashboardCard className="p-5">
                                                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                    <MessageSquareMore className="h-4 w-4 text-blue-600" />
                                                    Quick replies preview
                                                </div>
                                                <div className="space-y-3">
                                                    {(computedKit.generatedProfile.quickReplies || []).map((item) => (
                                                        <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                                                            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                                                        </div>
                                                    ))}
                                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Customer order format</p>
                                                        <p className="mt-2 text-sm font-semibold text-slate-900">Send product code + address</p>
                                                    </div>
                                                </div>
                                            </DashboardCard>

                                            <DashboardCard className="p-5">
                                                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                                                    <Download className="h-4 w-4 text-blue-600" />
                                                    One-click exports
                                                </div>
                                                <div className="grid gap-3">
                                            <button type="button" onClick={() => handleExport("csv")} className="btn-secondary justify-center">
                                                {exporting === "csv" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                                Export Catalog CSV
                                            </button>
                                            <button type="button" onClick={() => handleExport("profile")} className="btn-secondary justify-center">
                                                {exporting === "profile" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                                                Export Profile TXT
                                            </button>
                                            <button type="button" onClick={() => handleExport("replies")} className="btn-secondary justify-center">
                                                {exporting === "replies" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                                                Export Quick Replies TXT
                                            </button>
                                            <button type="button" onClick={() => handleExport("bulk-replies")} className="btn-secondary justify-center">
                                                {exporting === "bulk-replies" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareMore className="mr-2 h-4 w-4" />}
                                                Export Bulk Quick Replies
                                            </button>
                                            <button type="button" onClick={() => handleExport("checklist")} className="btn-secondary justify-center">
                                                {exporting === "checklist" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                                Export Setup Checklist TXT
                                            </button>
                                            <button type="button" onClick={() => handleExport("mini-catalog-pdf")} className="btn-secondary justify-center">
                                                {exporting === "mini-catalog-pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                                Export Printable Mini Catalog PDF
                                            </button>
                                            <button type="button" onClick={() => handleExport("full-kit")} className="btn-primary justify-center">
                                                {exporting === "full-kit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4" />}
                                                Export Full WhatsApp Kit
                                            </button>
                                                </div>
                                            </DashboardCard>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {(currentStep === "photos" || currentStep === "crop") && (
                        <section className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5 text-sm leading-6 text-slate-700 shadow-sm">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                                <p>
                                    {currentStep === "photos"
                                        ? "Step 2: Upload shelf photos, then pick one image to work on."
                                        : "Step 3: Crop one product clearly, clean the image if needed, then save it to the catalog."}
                                </p>
                            </div>
                        </section>
                    )}

                    {(currentStep === "photos" || currentStep === "crop") && (
                        <ImageWorkspace
                            businessCategory={business.businessCategory}
                            existingProducts={products}
                            shelfImages={shelfImages}
                            selectedImageId={selectedImageId}
                            onSelectImage={setSelectedImageId}
                            onUploadImages={uploadShelfImages}
                            uploading={uploadingShelfImages}
                            onRemoveImage={removeShelfImage}
                            onCreateProduct={addProductFromWorkspace}
                            onFeedback={(type, text) => setFeedback({ type, text })}
                        />
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Step navigation</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Use Previous and Next to move through the catalog process. Your work stays in this project as you continue.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={goToPreviousStep}
                                    disabled={!previousStep}
                                    className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={goToNextStep}
                                    disabled={!nextStep}
                                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {nextStep ? `Next: ${nextStep.label}` : "All steps complete"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </DashboardShell>
        </AuthGate>
    );
}
