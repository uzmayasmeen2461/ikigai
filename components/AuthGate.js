"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { dashboardForRole, getUserRole } from "../app/lib/authRouting";

function AuthLoading() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    Checking your workspace access
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    IKIGAI is confirming your account and role before opening this page.
                </p>
            </div>
        </main>
    );
}

export function AuthGate({ allowedRoles, children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [status, setStatus] = useState("checking");
    const allowedRoleKey = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).join("|");

    useEffect(() => {
        let isMounted = true;

        const checkAccess = async () => {
            const allowedRoleList = allowedRoleKey.split("|");
            setStatus("checking");

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!isMounted) return;

            if (!user) {
                router.replace("/auth");
                return;
            }

            const role = await getUserRole(user.id);

            if (!isMounted) return;

            if (!allowedRoleList.includes(role)) {
                router.replace(dashboardForRole(role));
                return;
            }

            setStatus("ready");
        };

        checkAccess();

        const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
            if (!session?.user) {
                router.replace("/auth");
                return;
            }

            checkAccess();
        });

        return () => {
            isMounted = false;
            listener.subscription.unsubscribe();
        };
    }, [allowedRoleKey, pathname, router]);

    if (status !== "ready") {
        return <AuthLoading />;
    }

    return children;
}

export function AuthRedirectLoading() {
    return (
        <main className="gradient-page flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-2xl shadow-blue-100/60 backdrop-blur-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <ShieldCheck className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    Preparing your IKIGAI workspace
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    One moment while we check your session.
                </p>
            </div>
        </main>
    );
}
