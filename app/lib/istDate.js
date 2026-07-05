const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function pad(value) {
    return String(value).padStart(2, "0");
}

export function nowISTISOString() {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().replace("Z", "+05:30");
}

export function toISTISOString(date) {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() + IST_OFFSET_MS).toISOString().replace("Z", "+05:30");
}

export function istDateParts(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    return {
        day: ist.getUTCDate(),
        month: ist.getUTCMonth(),
        year: ist.getUTCFullYear(),
        hour: ist.getUTCHours(),
        minute: ist.getUTCMinutes(),
    };
}

export function istTodayISO() {
    return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istNow() {
    return new Date(Date.now() + IST_OFFSET_MS);
}

export function scheduledISTISOString(dayOffset = 0, hour = 11, minute = 0) {
    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    ist.setUTCDate(ist.getUTCDate() + Number(dayOffset || 0));
    const year = ist.getUTCFullYear();
    const month = pad(ist.getUTCMonth() + 1);
    const day = pad(ist.getUTCDate());
    return `${year}-${month}-${day}T${pad(hour)}:${pad(minute)}:00.000+05:30`;
}

export function nextISTSlotISOString(hour = 10, minute = 0) {
    const current = istDateParts();
    const shouldStartTomorrow = current.hour > hour || (current.hour === hour && current.minute >= minute);
    return scheduledISTISOString(shouldStartTomorrow ? 1 : 0, hour, minute);
}
