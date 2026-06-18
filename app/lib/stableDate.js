const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function partsFromDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return {
        day: date.getUTCDate(),
        month: MONTHS[date.getUTCMonth()],
        year: date.getUTCFullYear(),
        hour: String(date.getUTCHours()).padStart(2, "0"),
        minute: String(date.getUTCMinutes()).padStart(2, "0"),
    };
}

export function formatStableDate(value) {
    const parts = partsFromDate(value);
    if (!parts) return "";
    return `${parts.day} ${parts.month} ${parts.year}`;
}

export function formatStableDateTime(value) {
    const parts = partsFromDate(value);
    if (!parts) return "-";
    return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} UTC`;
}

export function stableDateKey(value) {
    const parts = partsFromDate(value);
    if (!parts) return "";
    return `${parts.year}-${String(MONTHS.indexOf(parts.month) + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
