import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return createClient(supabaseUrl, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

export function createSupabaseAuthClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}

export function getBearerToken(request) {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
    return authHeader.slice(7).trim();
}

export async function getAuthenticatedUser(request) {
    const token = getBearerToken(request);

    if (!token) {
        return { user: null, error: "Missing authentication token." };
    }

    const supabase = createSupabaseAuthClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return { user: null, error: error?.message || "Invalid authentication token." };
    }

    return { user: data.user, token, error: null };
}

export async function getUserRole(userId) {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

    return data?.role || "client";
}
