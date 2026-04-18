import { calculatePricing, getServicePricing } from "./pricing";

export const invoiceSupplierConfig = {
    legalName: process.env.IKIGAI_SUPPLIER_NAME || "IKIGAI Digital Services",
    brandName: "IKIGAI",
    tagline: "Connecting Purpose with Productivity",
    address: process.env.IKIGAI_SUPPLIER_ADDRESS || "Hyderabad, Telangana, India",
    email: process.env.IKIGAI_SUPPORT_EMAIL || "support@ikigai.in",
    phone: process.env.IKIGAI_SUPPORT_PHONE || "Phone to be updated",
    gstin: process.env.IKIGAI_GSTIN || "GSTIN-TO-BE-UPDATED",
    pan: process.env.IKIGAI_PAN || "PAN-TO-BE-UPDATED",
};

const invoiceTheme = {
    page: "#ffffff",
    subtlePage: "#f8fafc",
    ink: "#0f172a",
    muted: "#64748b",
    soft: "#f1f5f9",
    border: "#e2e8f0",
    accent: "#2563eb",
    accentSoft: "#eff6ff",
    accentInk: "#1e3a8a",
    dark: "#020617",
    paidSoft: "#ecfdf5",
    paidInk: "#047857",
};

function padInvoiceNumber(value) {
    return String(value).padStart(4, "0");
}

function hashId(value = "") {
    return String(value)
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function createInvoiceNumber(taskId) {
    const year = new Date().getFullYear();
    const numericId = String(taskId || "").replace(/\D/g, "");
    const sequence = numericId.slice(-4) || String(hashId(taskId || Date.now())).slice(-4);
    return `IKG-${year}-${padInvoiceNumber(sequence || "1")}`;
}

export function invoiceUrlForTask(taskId) {
    return `/api/invoices/${taskId}`;
}

function formatDateTime(value) {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatDate(value) {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function truncate(value = "", max = 115) {
    const text = String(value || "");
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3)}...`;
}

function cleanValue(value = "", fallback = "") {
    const cleaned = String(value || "").replace(/\s+/g, " ").trim();
    return cleaned || fallback;
}

function firstAvailable(...values) {
    return values.map((value) => cleanValue(value)).find(Boolean) || "";
}

function stripGeneratedDescriptionLines(description = "") {
    return String(description || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
            const normalized = line.toLowerCase();
            return (
                line &&
                !normalized.startsWith("service requested:") &&
                !normalized.startsWith("business name:") &&
                !normalized.startsWith("contact number:") &&
                !normalized.startsWith("number of products/items:")
            );
        });
}

function buildServiceDescription(task, serviceLabel) {
    const explicitNotes = firstAvailable(task.requirement_notes, task.notes);
    const cleanedLines = stripGeneratedDescriptionLines(task.description);
    const meaningfulDescription = cleanedLines.find((line) => {
        const normalized = line.toLowerCase();
        return (
            normalized !== serviceLabel.toLowerCase() &&
            normalized !== cleanValue(task.title).toLowerCase()
        );
    });
    const assetNote = cleanValue(task.assets_note);

    const summary = firstAvailable(explicitNotes, meaningfulDescription, assetNote);

    if (!summary) {
        return `${serviceLabel} for ${cleanValue(task.client_business_name, "client business")}`;
    }

    return truncate(summary, 115);
}

function buildTaskTitle(task, serviceLabel) {
    const title = cleanValue(task.title);

    if (!title || title.toLowerCase() === serviceLabel.toLowerCase()) {
        return `${serviceLabel} request`;
    }

    return title;
}

function formatCurrency(amount = 0) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

export function buildInvoiceData(task) {
    const service = getServicePricing(task.service_type);
    const fallbackPricing = calculatePricing(task.service_type);
    const paidAt = task.paid_at || new Date().toISOString();
    const invoiceNumber = task.invoice_number || createInvoiceNumber(task.id);
    const invoiceUrl = task.invoice_url || invoiceUrlForTask(task.id);

    const baseAmount = Number(task.base_amount || fallbackPricing.base_amount || 0);
    const gstPercent = Number(task.gst_percent || fallbackPricing.gst_percent || 18);
    const gstAmount = Number(task.gst_amount || fallbackPricing.gst_amount || 0);
    const platformFee = Number(task.platform_fee || fallbackPricing.platform_fee || 0);
    const totalAmount = Number(task.total_amount || baseAmount + gstAmount + platformFee);
    const clientName = firstAvailable(
        task.client_name,
        task.users?.name,
        task.user?.name,
        task.client_email?.split("@")[0],
        "IKIGAI Client"
    );
    const clientEmail = firstAvailable(task.client_email, task.users?.email, task.user?.email, "Email not provided");
    const clientPhone = firstAvailable(task.client_phone, task.phone, "Phone not provided");
    const clientBusinessName = firstAvailable(task.client_business_name, task.business_name, "Business name not provided");
    const billingAddress = firstAvailable(task.billing_address, task.client_address, "Billing address not provided");
    const taskTitle = buildTaskTitle(task, service.label);
    const serviceDescription = buildServiceDescription(task, service.label);

    return {
        supplier: invoiceSupplierConfig,
        client: {
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            businessName: clientBusinessName,
            billingAddress,
        },
        invoice: {
            title: "Tax Invoice",
            number: invoiceNumber,
            url: invoiceUrl,
            invoiceDate: formatDate(paidAt),
            paymentDate: formatDateTime(paidAt),
            status: "Paid",
        },
        payment: {
            orderId: cleanValue(task.payment_order_id, "Order ID not available"),
            paymentId: cleanValue(task.payment_id, "Payment ID not available"),
            paidAt: formatDateTime(paidAt),
            rawPaidAt: paidAt,
        },
        item: {
            serviceName: service.label,
            serviceType: task.service_type || "service",
            taskTitle,
            description: serviceDescription,
            quantity: 1,
            unitPrice: baseAmount,
        },
        amounts: {
            baseAmount,
            gstPercent,
            gstAmount,
            platformFee,
            taxableAmount: baseAmount,
            totalAmount,
        },
    };
}

function escapePdfText(value = "") {
    return String(value)
        .replace(/\s+/g, " ")
        .trim()
        .replaceAll("\\", "\\\\")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll("\r", " ")
        .replaceAll("\n", " ");
}

function text(textValue, x, y, size = 10, font = "F1") {
    return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(textValue)}) Tj ET`;
}

function estimateTextWidth(value = "", size = 10) {
    return String(value || "").length * size * 0.5;
}

function textRight(textValue, rightX, y, size = 10, font = "F1") {
    return text(textValue, rightX - estimateTextWidth(textValue, size), y, size, font);
}

function color(hex) {
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
}

function strokeColor(hex) {
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`;
}

function rect(x, y, width, height, fillHex) {
    return `${color(fillHex)} ${x} ${y} ${width} ${height} re f`;
}

function outlineRect(x, y, width, height, strokeHex = invoiceTheme.border) {
    return `${strokeColor(strokeHex)} ${x} ${y} ${width} ${height} re S`;
}

function separator(y) {
    return rect(48, y, 499, 1, invoiceTheme.border);
}

function amountRow(label, value, y, bold = false) {
    return [
        color(invoiceTheme.muted),
        text(label, 330, y, 10, bold ? "F2" : "F1"),
        color(invoiceTheme.ink),
        textRight(value, 531, y, 10, "F2"),
    ].join("\n");
}

function labelValue(label, value, x, y) {
    return [
        color(invoiceTheme.muted),
        text(label.toUpperCase(), x, y + 16, 7, "F2"),
        color(invoiceTheme.ink),
        text(value, x, y, 9, "F2"),
    ].join("\n");
}

function sectionLabel(label, x, y) {
    return [
        color(invoiceTheme.accentInk),
        text(label.toUpperCase(), x, y, 8, "F2"),
    ].join("\n");
}

export function generateInvoicePdf(task) {
    const data = buildInvoiceData(task);
    const { supplier, client, invoice, payment, item, amounts } = data;
    const baseAmount = formatCurrency(amounts.baseAmount);
    const gstAmount = formatCurrency(amounts.gstAmount);
    const platformFee = formatCurrency(amounts.platformFee);
    const taxableAmount = formatCurrency(amounts.taxableAmount);
    const totalAmount = formatCurrency(amounts.totalAmount);
    const unitPrice = formatCurrency(item.unitPrice);

    const content = [
        rect(0, 0, 595, 842, invoiceTheme.subtlePage),
        rect(28, 28, 539, 786, invoiceTheme.page),
        outlineRect(28, 28, 539, 786, invoiceTheme.border),
        rect(28, 808, 539, 6, invoiceTheme.accent),

        color(invoiceTheme.ink),
        text(supplier.brandName, 48, 772, 30, "F2"),
        color(invoiceTheme.muted),
        text(supplier.tagline, 48, 750, 10),
        color(invoiceTheme.ink),
        text(invoice.title, 404, 772, 24, "F2"),
        color(invoiceTheme.muted),
        text(invoice.number, 405, 750, 11, "F2"),

        rect(404, 712, 92, 24, invoiceTheme.paidSoft),
        color(invoiceTheme.paidInk),
        text("PAID", 433, 721, 9, "F2"),
        rect(502, 712, 45, 24, invoiceTheme.accentSoft),
        color(invoiceTheme.accentInk),
        text("INR", 516, 721, 9, "F2"),

        rect(48, 646, 499, 48, invoiceTheme.soft),
        labelValue("Invoice date", invoice.invoiceDate, 64, 664),
        labelValue("Payment date", invoice.paymentDate, 220, 664),
        labelValue("Invoice number", invoice.number, 404, 664),

        rect(48, 506, 235, 112, "#ffffff"),
        outlineRect(48, 506, 235, 112),
        rect(312, 506, 235, 112, "#ffffff"),
        outlineRect(312, 506, 235, 112),
        sectionLabel("Supplier", 64, 592),
        sectionLabel("Billed To", 328, 592),
        color(invoiceTheme.ink),
        text(supplier.legalName, 64, 570, 11, "F2"),
        text(client.name, 328, 570, 11, "F2"),
        color(invoiceTheme.muted),
        text(supplier.address, 64, 552, 8),
        text(`Email: ${supplier.email}`, 64, 538, 8),
        text(`Phone: ${supplier.phone}`, 64, 524, 8),
        text(`GSTIN: ${supplier.gstin}`, 64, 510, 8),
        text(client.businessName, 328, 552, 8),
        text(client.email, 328, 538, 8),
        text(client.billingAddress, 328, 524, 8),

        color(invoiceTheme.ink),
        text("Service Details", 48, 468, 16, "F2"),
        rect(48, 420, 499, 32, invoiceTheme.accentSoft),
        color(invoiceTheme.accentInk),
        text("Service", 64, 433, 8, "F2"),
        text("Qty", 344, 433, 8, "F2"),
        text("Unit price", 394, 433, 8, "F2"),
        text("Taxable", 478, 433, 8, "F2"),
        rect(48, 338, 499, 82, "#ffffff"),
        outlineRect(48, 338, 499, 82),
        color(invoiceTheme.ink),
        text(item.serviceName, 64, 394, 11, "F2"),
        color(invoiceTheme.muted),
        text(item.taskTitle, 64, 376, 9, "F2"),
        text(item.description, 64, 358, 8),
        color(invoiceTheme.ink),
        text(String(item.quantity), 350, 382, 10, "F2"),
        textRight(unitPrice, 452, 382, 10, "F2"),
        textRight(taxableAmount, 531, 382, 10, "F2"),

        rect(48, 178, 238, 126, invoiceTheme.soft),
        outlineRect(48, 178, 238, 126),
        color(invoiceTheme.ink),
        text("Payment Details", 64, 280, 15, "F2"),
        rect(64, 250, 70, 22, invoiceTheme.paidSoft),
        color(invoiceTheme.paidInk),
        text("Paid", 87, 258, 9, "F2"),
        color(invoiceTheme.muted),
        text(`Payment ID: ${payment.paymentId}`, 64, 230, 8),
        text(`Order ID: ${payment.orderId}`, 64, 214, 8),
        text(`Paid at: ${payment.paidAt}`, 64, 198, 8),

        rect(314, 178, 233, 126, "#ffffff"),
        outlineRect(314, 178, 233, 126),
        color(invoiceTheme.ink),
        text("Pricing Summary", 330, 280, 15, "F2"),
        amountRow("Base amount", baseAmount, 252),
        amountRow(`GST (${amounts.gstPercent}%)`, gstAmount, 228),
        amountRow("Platform fee", platformFee, 204),
        rect(314, 120, 233, 42, invoiceTheme.dark),
        color("#ffffff"),
        text("Grand Total Paid", 330, 137, 12, "F2"),
        textRight(totalAmount, 531, 137, 13, "F2"),

        separator(94),
        color(invoiceTheme.ink),
        text("Thank you for choosing IKIGAI.", 48, 72, 10, "F2"),
        color(invoiceTheme.muted),
        text("Your task is ready for managed execution. This is a system-generated invoice.", 48, 56, 8),
        text(`Support: ${supplier.email}`, 402, 56, 8),
    ].join("\n");

    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf);
}
