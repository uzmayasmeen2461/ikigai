const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function partsFromDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    return {
        day: ist.getUTCDate(),
        month: MONTHS[ist.getUTCMonth()],
        year: ist.getUTCFullYear(),
        hour24: ist.getUTCHours(),
        minute: String(ist.getUTCMinutes()).padStart(2, "0"),
    };
}

function format12Hour(hour24 = 0, minute = "00") {
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour = hour24 % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
}

export function formatStableDate(value) {
    const parts = partsFromDate(value);
    if (!parts) return "";
    return `${parts.day} ${parts.month} ${parts.year}`;
}

export function formatStableDateTime(value) {
    const parts = partsFromDate(value);
    if (!parts) return "-";
    return `${parts.day} ${parts.month} ${parts.year}, ${format12Hour(parts.hour24, parts.minute)} IST`;
}

export function stableDateKey(value) {
    const parts = partsFromDate(value);
    if (!parts) return "";
    return `${parts.year}-${String(MONTHS.indexOf(parts.month) + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
