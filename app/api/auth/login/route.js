import { NextResponse } from "next/server";
import { createSupabaseAdmin, createSupabaseAuthClient } from "../../../lib/supabaseServer";

function normalizeRole(role) {
    const value = role?.toLowerCase();

    if (value === "admin") return "admin";
    if (value === "worker" || value === "partner") return "partner";

    return "client";
}

function withFallbackTimeout(promise, timeoutMs, fallback) {
    return Promise.race([
        promise,
        new Promise((resolve) => {
            setTimeout(() => resolve(fallback), timeoutMs);
        }),
    ]);
}

export async function POST(request) {
    try {
        const { email, password } = await request.json();
        const normalizedEmail = `${email || ""}`.trim().toLowerCase();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!normalizedEmail || !password) {
            return NextResponse.json(
                { error: "Email and password are required." },
                { status: 400 }
            );
        }

        try {
            new URL(supabaseUrl);
        } catch {
            return NextResponse.json(
                { error: "Supabase URL is missing or invalid. Check NEXT_PUBLIC_SUPABASE_URL in .env.local." },
                { status: 500 }
            );
        }

        const authClient = createSupabaseAuthClient();
        const { data, error } = await authClient.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        });

        if (error || !data?.session || !data?.user) {
            return NextResponse.json(
                { error: error?.message || "Invalid login details." },
                { status: 401 }
            );
        }

        const supabase = createSupabaseAdmin();
        const profileResult = await withFallbackTimeout(
            supabase
                .from("users")
                .select("role")
                .eq("id", data.user.id)
                .maybeSingle(),
            2000,
            { data: null, error: null }
        );
        const { data: profile, error: profileError } = profileResult;

        if (profileError) {
            console.warn("Could not load login profile.", profileError.message);
        }

        return NextResponse.json({
            user: {
                id: data.user.id,
                email: data.user.email,
            },
            role: normalizeRole(profile?.role || data.user.user_metadata?.role),
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        });
    } catch (error) {
        const code = error?.cause?.code || error?.code;

        if (code === "ENOTFOUND") {
            return NextResponse.json(
                { error: "Could not resolve the configured Supabase project host. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and make sure the Supabase project is active." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                error: error?.message === "fetch failed" || error?.message === "Failed to fetch"
                    ? "Could not reach ORVA login service. Check Supabase connection settings."
                    : error?.message || "Could not login. Please try again.",
            },
            { status: 500 }
        );
    }
}
