import { Resend } from "resend";
import { BRAND } from "../../config/branding";

const assignmentStatuses = ["assigned", "in_progress", "submitted_for_review", "revision_requested", "needs_changes"];
const completedStatuses = ["completed", "client_approved", "auto_approved"];

export const serviceSlaDays = {
    whatsapp: 3,
    listing: 5,
    restaurant: 6,
    cloud_kitchen: 7,
    instagram: 4,
    social: 4,
    website: 10,
};

export function dueDateForService(serviceType = "whatsapp", fromDate = new Date()) {
    const days = serviceSlaDays[serviceType] || 5;
    const dueAt = new Date(fromDate);
    dueAt.setDate(dueAt.getDate() + days);
    return dueAt.toISOString();
}

export function getSlaStatus(task = {}, now = new Date()) {
    if (!task.due_at || completedStatuses.includes(task.status)) return "on_time";

    const dueAt = new Date(task.due_at);
    const hoursLeft = (dueAt.getTime() - now.getTime()) / 36e5;

    if (hoursLeft < 0) return "overdue";
    if (hoursLeft <= 24) return "due_soon";
    return "on_time";
}

export function payoutMath(task = {}) {
    const total = Number(task.total_amount || 0);
    const base = Number(task.base_amount || 0);
    const platformMargin = Math.max(Number(task.platform_fee || 0), Math.round(base * 0.2));
    const payoutAmount = Math.max(0, total - Number(task.gst_amount || 0) - platformMargin);
    return { payoutAmount, platformMargin };
}

function normalizeList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase());
    return String(value || "")
        .toLowerCase()
        .split(/[,|\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function partnerSupportsService(partner = {}, serviceType = "") {
    const skills = normalizeList(partner.skills || partner.service_skills);
    if (skills.length === 0) return true;
    const normalizedService = String(serviceType || "").toLowerCase();

    return skills.some((skill) => normalizedService.includes(skill) || skill.includes(normalizedService));
}

function completionRateForPartner(partnerId, tasks = []) {
    const partnerTasks = tasks.filter((task) => task.worker_id === partnerId);
    if (partnerTasks.length === 0) return 1;
    return partnerTasks.filter((task) => completedStatuses.includes(task.status)).length / partnerTasks.length;
}

function activeCountForPartner(partnerId, tasks = []) {
    return tasks.filter((task) => task.worker_id === partnerId && assignmentStatuses.includes(task.status || "assigned")).length;
}

function lastAssignedTime(partner = {}, tasks = []) {
    const explicit = partner.last_assigned_at ? new Date(partner.last_assigned_at).getTime() : 0;
    const fromTasks = tasks
        .filter((task) => task.worker_id === partner.id && task.assigned_at)
        .map((task) => new Date(task.assigned_at).getTime())
        .sort((a, b) => b - a)[0] || 0;
    return Math.max(explicit, fromTasks);
}

export async function sendOperationalEmail({ to, subject, text }) {
    if (!process.env.RESEND_API_KEY || !to) return { skipped: true };

    const resend = new Resend(process.env.RESEND_API_KEY);
    return resend.emails.send({
        from: `${BRAND.name} <onboarding@resend.dev>`,
        to,
        subject,
        text,
    });
}

export async function createNotification(supabase, notification = {}) {
    await supabase.from("notifications").insert([
        {
            user_id: notification.user_id || null,
            role: notification.role || null,
            task_id: notification.task_id ? String(notification.task_id) : null,
            type: notification.type || "info",
            title: notification.title || "ORVA update",
            message: notification.message || "",
            read_at: null,
        },
    ]);
}

export async function notifyUser(supabase, { userId, role, taskId, type, title, message, email }) {
    await createNotification(supabase, { user_id: userId, role, task_id: taskId, type, title, message });
    await sendOperationalEmail({ to: email, subject: title, text: message }).catch(() => null);
}

export async function autoAssignPaidTask(supabase, task) {
    const now = new Date();
    const dueAt = task.due_at || dueDateForService(task.service_type, now);

    const [{ data: partners = [] }, { data: partnerTasks = [] }] = await Promise.all([
        supabase
            .from("users")
            .select("*")
            .in("role", ["worker", "partner"])
            .eq("availability", "available"),
        supabase.from("tasks").select("id, worker_id, status, assigned_at, completed_at"),
    ]);

    const candidates = partners
        .filter((partner) => partnerSupportsService(partner, task.service_type))
        .map((partner) => {
            const activeCount = activeCountForPartner(partner.id, partnerTasks);
            const completionRate = completionRateForPartner(partner.id, partnerTasks);
            const lastAssigned = lastAssignedTime(partner, partnerTasks);
            const score = activeCount * 100 - completionRate * 30 + lastAssigned / 1e12;
            return { partner, activeCount, completionRate, lastAssigned, score };
        })
        .sort((a, b) => a.score - b.score);

    const best = candidates[0]?.partner;

    if (!best) {
        const { data } = await supabase
            .from("tasks")
            .update({
                status: "needs_admin_assignment",
                automation_status: "needs_admin_assignment",
                assignment_mode: "manual_required",
                due_at: dueAt,
                sla_status: getSlaStatus({ ...task, due_at: dueAt }),
            })
            .eq("id", task.id)
            .select("*")
            .single();

        await createNotification(supabase, {
            role: "admin",
            task_id: task.id,
            type: "assignment_exception",
            title: "Task needs admin assignment",
            message: `${task.title || "A paid task"} has no available skilled partner.`,
        });

        return { task: data || task, assigned: false };
    }

    const assignedAt = now.toISOString();
    const { data: assignedTask } = await supabase
        .from("tasks")
        .update({
            worker_id: best.id,
            status: "assigned",
            automation_status: "auto_assigned",
            assignment_mode: "auto",
            assigned_at: assignedAt,
            due_at: dueAt,
            sla_status: getSlaStatus({ ...task, due_at: dueAt }),
        })
        .eq("id", task.id)
        .select("*")
        .single();

    await supabase.from("users").update({ last_assigned_at: assignedAt }).eq("id", best.id);

    await notifyUser(supabase, {
        userId: best.id,
        taskId: task.id,
        type: "task_assigned",
        title: "New ORVA task assigned",
        message: `${task.title || "A client task"} has been auto-assigned to you. Due ${new Date(dueAt).toLocaleDateString("en-IN")}.`,
        email: best.email,
    });

    return { task: assignedTask || task, assigned: true, partner: best };
}

export async function createPayoutForCompletedTask(supabase, task) {
    if (!task?.worker_id) return { skipped: true };

    const { data: existing } = await supabase
        .from("partner_payouts")
        .select("*")
        .eq("task_id", String(task.id))
        .maybeSingle();

    if (existing) return { payout: existing, skipped: true };

    const { payoutAmount, platformMargin } = payoutMath(task);
    const { data, error } = await supabase
        .from("partner_payouts")
        .insert([
            {
                task_id: String(task.id),
                partner_id: task.worker_id,
                payout_amount: payoutAmount,
                platform_margin: platformMargin,
                status: "pending_approval",
            },
        ])
        .select("*")
        .single();

    if (error) return { error };
    return { payout: data };
}

export async function refreshSlaStatuses(supabase) {
    const { data: tasks = [] } = await supabase
        .from("tasks")
        .select("*")
        .not("due_at", "is", null);

    const updates = await Promise.all(
        tasks.map(async (task) => {
            const nextStatus = getSlaStatus(task);
            if (nextStatus === task.sla_status) return null;

            await supabase.from("tasks").update({ sla_status: nextStatus }).eq("id", task.id);

            if (nextStatus === "overdue") {
                await createNotification(supabase, {
                    role: "admin",
                    task_id: task.id,
                    type: "sla_overdue",
                    title: "Task overdue",
                    message: `${task.title || "A task"} is now overdue.`,
                });
            }

            return { id: task.id, sla_status: nextStatus };
        })
    );

    return updates.filter(Boolean);
}

export async function autoApproveStaleSubmissions(supabase) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);

    const { data: tasks = [] } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "submitted_for_review")
        .lte("submitted_at", cutoff.toISOString());

    const approved = [];

    for (const task of tasks) {
        const approvedAt = new Date().toISOString();
        const { data } = await supabase
            .from("tasks")
            .update({
                status: "auto_approved",
                client_approved_at: approvedAt,
                completed_at: approvedAt,
                sla_status: getSlaStatus({ ...task, status: "auto_approved" }),
            })
            .eq("id", task.id)
            .select("*")
            .single();

        await createPayoutForCompletedTask(supabase, data || task);
        approved.push(data || task);
    }

    return approved;
}
