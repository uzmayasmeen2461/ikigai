"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronRight,
    Download,
    FileText,
    Files,
    Filter,
    Loader2,
    Search,
    Trash2,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { AuthGate } from "./AuthGate";
import { DashboardShell } from "./DashboardShell";
import { EmptyState, FeedbackMessage, SectionHeading } from "./DashboardUI";
import {
    buildCatalogCsv,
    buildPrintableMiniCatalogHtml,
    buildQuickRepliesText,
    buildWhatsAppKitZip,
    determineProjectStatus,
    generateCatalogKit,
    getRealProducts,
    isWhatsAppServiceType,
    normalizeShelfImages,
    sanitizeText,
} from "../app/lib/whatsappCatalog";

const statusStyles = {
    draft: "bg-slate-100 text-slate-700 ring-slate-200",
    ready: "bg-blue-50 text-blue-700 ring-blue-200",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

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

function formatDate(value) {
    if (!value) return "Recently updated";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
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

function buildProjectPayload(project) {
    const business = {
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

    const products = getRealProducts(project.products || []);
    const kit = generateCatalogKit({
        business,
        products,
        exportedAt: project.exported_at || null,
    });

    return { business, products, kit };
}

function enrichProject(project) {
    const { business, products, kit } = buildProjectPayload(project);

    return {
        ...project,
        client_name: business.clientName || project.client_name || project.business_name || "",
        shelf_images: normalizeShelfImages(project.shelf_images || []),
        status: project.status || determineProjectStatus({ checklist: kit.checklist, exportedAt: project.exported_at || null }),
        completion_score:
            typeof project.completion_score === "number" ? project.completion_score : kit.completionScore,
        product_count: products.length,
        updated_at: project.updated_at || project.created_at,
        created_at: project.created_at || project.updated_at,
    };
}

function ProjectCard({
    project,
    deleting,
    exporting,
    onOpen,
    onDuplicate,
    onExport,
    onDelete,
}) {
    return (
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {project.business_name || "Untitled project"}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                        {project.client_name || "Owner name pending"}
                    </p>
                </div>
                <StatusBadge status={project.status} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                    {project.business_category || "Category pending"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                    {project.product_count} products
                </span>
                {project.service_type ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                        {project.service_type}
                    </span>
                ) : null}
            </div>

            {project.task_title ? (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Task</p>
                    <p className="mt-1 font-medium text-slate-700">{project.task_title}</p>
                </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-500">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Updated</p>
                    <p className="mt-1 font-medium text-slate-700">{formatDate(project.updated_at)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Created</p>
                    <p className="mt-1 font-medium text-slate-700">{formatDate(project.created_at)}</p>
                </div>
            </div>

            <div className="mt-4">
                <CompletionBar score={project.completion_score || 0} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button type="button" onClick={() => onOpen(project)} className="btn-primary justify-center">
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                </button>
                <button type="button" onClick={() => onDuplicate(project)} className="btn-secondary justify-center">
                    <Files className="mr-2 h-4 w-4" />
                    Duplicate
                </button>
                <button type="button" onClick={() => onExport(project, "csv")} className="btn-secondary justify-center">
                    {exporting === `${project.id}:csv` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    CSV
                </button>
                <button type="button" onClick={() => onExport(project, "full-kit")} className="btn-secondary justify-center">
                    {exporting === `${project.id}:full-kit` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Full Kit
                </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => onExport(project, "replies")} className="text-sm font-semibold text-slate-500 transition hover:text-blue-700">
                    Export Quick Replies
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(project)}
                    disabled={deleting}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition hover:text-red-700 disabled:text-slate-400"
                >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                </button>
            </div>
        </article>
    );
}

export function WhatsAppCatalogProjectHistory({ role = "partner" }) {
    const router = useRouter();
    const allowedRoles = role === "admin" ? ["admin"] : ["partner"];
    const roleKey = role === "admin" ? "admin" : "partner";
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState({ type: "", text: "" });
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("updated_desc");
    const [deletingProjectId, setDeletingProjectId] = useState("");
    const [exportingKey, setExportingKey] = useState("");

    const categoryOptions = useMemo(() => {
        const categories = Array.from(
            new Set(projects.map((project) => sanitizeText(project.business_category)).filter(Boolean))
        );
        return categories.sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const filteredProjects = useMemo(() => {
        const normalizedSearch = search.toLowerCase().trim();
        const filtered = projects.filter((project) => {
            const matchesSearch =
                !normalizedSearch ||
                `${project.business_name} ${project.business_category} ${project.client_name} ${project.task_title || ""} ${project.service_type || ""}`
                    .toLowerCase()
                    .includes(normalizedSearch);
            const matchesStatus = statusFilter === "all" || project.status === statusFilter;
            const matchesCategory = categoryFilter === "all" || project.business_category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        });

        return filtered.sort((left, right) => {
            if (sortBy === "updated_asc") {
                return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
            }
            if (sortBy === "created_desc") {
                return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            }
            if (sortBy === "created_asc") {
                return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
            }
            return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        });
    }, [categoryFilter, projects, search, sortBy, statusFilter]);

    const fetchProjects = useCallback(async () => {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setProjects([]);
            setLoading(false);
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
        setLoading(false);

        if (error) {
            setFeedback({ type: "error", text: error.message || "Could not load saved projects." });
            setProjects([]);
            return;
        }

        const taskIds = Array.from(
            new Set((data || []).map((project) => project.task_id).filter(Boolean))
        );

        let taskMap = new Map();
        if (taskIds.length) {
            const { data: taskData } = await supabase
                .from("tasks")
                .select("id, title, service_type, client_id, worker_id, payment_status, status")
                .in("id", taskIds);

            taskMap = new Map((taskData || []).map((task) => [task.id, task]));
        }

        const enrichedProjects = (data || [])
            .map((project) => {
                const linkedTask = taskMap.get(project.task_id);
                return enrichProject({
                    ...project,
                    task_title: linkedTask?.title || project.task_title || "",
                    service_type: linkedTask?.service_type || project.service_type || "",
                });
            })
            .filter((project) =>
                role === "admin"
                    ? true
                    : Boolean(project.task_id && isWhatsAppServiceType(project.service_type))
            );

        setProjects(enrichedProjects);
    }, [role]);

    useEffect(() => {
        queueMicrotask(() => {
            fetchProjects();
        });
    }, [fetchProjects]);

    const openProject = (project) => {
        const base = roleKey === "admin" ? "/admin/tools/whatsapp-catalog" : "/partner/tools/whatsapp-catalog";
        const params = new URLSearchParams();
        params.set("projectId", project.id);
        if (project.task_id) params.set("taskId", project.task_id);
        router.push(`${base}?${params.toString()}`);
    };

    const duplicateProject = async (project) => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setFeedback({ type: "error", text: "Please login again before duplicating this project." });
            return;
        }

        const { business, products } = buildProjectPayload(project);
        const payload = {
            client_name: business.clientName || business.businessName || "ORVA client",
            business_name: `${business.businessName || "WhatsApp Project"} Copy`,
            business_category: business.businessCategory,
            phone: business.phone || null,
            address: business.address || null,
            support_email: business.supportEmail || null,
            working_hours: business.workingHours || null,
            business_description: business.businessDescription || null,
            logo_url: business.logoUrl || null,
            notes: business.notes || null,
            template_type: business.templateType || null,
            shelf_images: normalizeShelfImages(project.shelf_images || []),
            products,
            generated_profile: project.generated_profile || null,
            checklist: project.checklist || null,
            status: "draft",
            completion_score: project.completion_score || 0,
            exported_at: null,
            task_id: project.task_id || null,
            client_id: project.client_id || null,
            partner_id: role === "admin" ? project.partner_id || null : user.id,
            project_type: project.task_id ? "client_task" : "internal",
            created_by: user.id,
            updated_at: nowISTISOString(),
        };

        const { data, error } = await supabase
            .from("whatsapp_catalog_projects")
            .insert([payload])
            .select()
            .single();

        if (error) {
            setFeedback({ type: "error", text: error.message || "Could not duplicate this project." });
            return;
        }

        const enriched = enrichProject(data);
        setProjects((current) => [enriched, ...current]);
        setFeedback({ type: "success", text: "Project duplicated. Opening the copied draft now." });
        openProject(enriched);
    };

    const deleteProject = async (project) => {
        if (!project?.id || deletingProjectId) return;

        setDeletingProjectId(project.id);
        const { error } = await supabase.from("whatsapp_catalog_projects").delete().eq("id", project.id);
        setDeletingProjectId("");

        if (error) {
            setFeedback({ type: "error", text: error.message || "Could not delete this project." });
            return;
        }

        setProjects((current) => current.filter((item) => item.id !== project.id));
        setFeedback({ type: "success", text: "Project deleted." });
    };

    const exportProject = async (project, kind) => {
        if (role !== "admin" && !project.task_id) {
            setFeedback({
                type: "error",
                text: "You can export only ORVA client projects assigned to you.",
            });
            return;
        }

        const { business, products, kit } = buildProjectPayload(project);
        if (!products.length) {
            setFeedback({ type: "error", text: "Add at least one product before exporting this project." });
            return;
        }

        setExportingKey(`${project.id}:${kind}`);

        if (kind === "csv") {
            downloadFile(`${project.business_name || "ORVA"}-catalog.csv`, buildCatalogCsv(kit.generatedProducts), "text/csv;charset=utf-8;");
        }
        if (kind === "replies") {
            downloadFile(`${project.business_name || "ORVA"}-quick-replies.txt`, buildQuickRepliesText(kit.generatedProfile), "text/plain;charset=utf-8;");
        }
        if (kind === "full-kit") {
            const zipBlob = await buildWhatsAppKitZip({
                business,
                generatedProfile: kit.generatedProfile,
                generatedProducts: kit.generatedProducts,
                checklist: kit.checklist,
                status: kit.status,
                completionScore: kit.completionScore,
            });
            downloadBlob(`${project.business_name || "ORVA"}-whatsapp-kit.zip`, zipBlob);
        }
        if (kind === "mini-catalog-pdf") {
            openPrintCatalog(buildPrintableMiniCatalogHtml({ business, generatedProducts: kit.generatedProducts }));
        }

        setExportingKey("");
        setFeedback({
            type: "success",
            text: kind === "full-kit" ? "WhatsApp Kit downloaded successfully." : "Export ready.",
        });
    };

    return (
        <AuthGate allowedRoles={allowedRoles}>
            <DashboardShell
                role={roleKey}
                eyebrow="History"
                title="Project History"
                description="View, reopen, duplicate, or export saved catalog projects."
            >
                <section className="mb-10">
                    <SectionHeading
                        title="Project History"
                        description="Saved catalog projects will appear here."
                        action={
                            <button
                                type="button"
                                onClick={() => router.push(roleKey === "admin" ? "/admin/tools/whatsapp-catalog" : "/partner/tasks")}
                                className="btn-primary"
                            >
                                {roleKey === "admin" ? "Create New Catalog" : "Go to My Tasks"}
                            </button>
                        }
                    />
                    <FeedbackMessage type={feedback.type} className="mt-5">
                        {feedback.text}
                    </FeedbackMessage>
                </section>

                <section className="dashboard-panel p-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="form-field pl-10"
                                placeholder="Search business name"
                            />
                        </div>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-field">
                            <option value="all">All statuses</option>
                            <option value="draft">Draft</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="form-field">
                            <option value="all">All categories</option>
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="form-field">
                            <option value="updated_desc">Updated: Newest</option>
                            <option value="updated_asc">Updated: Oldest</option>
                            <option value="created_desc">Created: Newest</option>
                            <option value="created_asc">Created: Oldest</option>
                        </select>
                    </div>

                    <div className="mt-6 space-y-4">
                        {loading ? (
                            [1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-[1.5rem] bg-slate-100" />)
                        ) : filteredProjects.length === 0 ? (
                            <EmptyState
                                icon={Filter}
                                title="Saved catalog projects will appear here."
                                description="Create a catalog in the tool and it will show up in this history."
                                action={
                                    <button
                                        type="button"
                                        onClick={() => router.push(roleKey === "admin" ? "/admin/tools/whatsapp-catalog" : "/partner/tasks")}
                                        className="btn-primary mt-6"
                                    >
                                        {roleKey === "admin" ? "Create New Catalog" : "Go to My Tasks"}
                                    </button>
                                }
                            />
                        ) : (
                            filteredProjects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    deleting={deletingProjectId === project.id}
                                    exporting={exportingKey}
                                    onOpen={openProject}
                                    onDuplicate={duplicateProject}
                                    onExport={exportProject}
                                    onDelete={deleteProject}
                                />
                            ))
                        )}
                    </div>
                </section>
            </DashboardShell>
        </AuthGate>
    );
}
