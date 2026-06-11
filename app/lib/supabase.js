import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const globalKey = "__orvaSupabaseClient";
const lockKey = "__orvaSupabaseAuthLocks";

function getLockStore() {
    if (typeof globalThis === "undefined") return new Map();
    if (!globalThis[lockKey]) globalThis[lockKey] = new Map();
    return globalThis[lockKey];
}

async function runWithAuthLock(name, _acquireTimeout, fn) {
    const locks = getLockStore();
    const previous = locks.get(name) || Promise.resolve();
    let releaseCurrent;
    const current = new Promise((resolve) => {
        releaseCurrent = resolve;
    });

    const queued = previous.catch(() => null).then(() => current);
    locks.set(name, queued);

    try {
        await previous.catch(() => null);
        return await fn();
    } finally {
        releaseCurrent();
        if (locks.get(name) === queued) locks.delete(name);
    }
}

function createBrowserSupabaseClient() {
    return createClient(
        supabaseUrl || "https://placeholder.supabase.co",
        supabaseAnonKey || "placeholder-anon-key",
        {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            lock: runWithAuthLock,
        },
        }
    );
}

export const supabase = globalThis[globalKey] || createBrowserSupabaseClient();

if (typeof globalThis !== "undefined") {
    globalThis[globalKey] = supabase;
}

export async function getAuthSession() {
    if (!hasSupabaseConfig) return { data: { session: null }, error: null };

    try {
        return await supabase.auth.getSession();
    } catch (error) {
        if (/lock:sb-|navigator lock|stole/i.test(error?.message || "")) {
            await new Promise((resolve) => setTimeout(resolve, 120));
            return supabase.auth.getSession();
        }
        throw error;
    }
}

export async function getAuthToken() {
    const { data } = await getAuthSession();
    return data.session?.access_token || "";
}

export async function getAuthUser() {
    if (!hasSupabaseConfig) return { data: { user: null }, error: null };

    try {
        return await supabase.auth.getUser();
    } catch (error) {
        if (/lock:sb-|navigator lock|stole/i.test(error?.message || "")) {
            await new Promise((resolve) => setTimeout(resolve, 120));
            return supabase.auth.getUser();
        }
        throw error;
    }
}
