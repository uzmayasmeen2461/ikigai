"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthExperience } from "../../components/AuthExperience";
import { AuthRedirectLoading } from "../../components/AuthGate";
import { supabase } from "../lib/supabase";
import { dashboardForRole, getUserRole } from "../lib/authRouting";

function withTimeout(promise, timeoutMs, fallback) {
    return Promise.race([
        promise,
        new Promise((resolve) => {
            window.setTimeout(() => resolve(fallback), timeoutMs);
        }),
    ]);
}

function redirectToPath(router, path) {
    router.replace(path);

    window.setTimeout(() => {
        const targetPath = path.split("?")[0];
        if (window.location.pathname !== targetPath) {
            window.location.assign(path);
        }
    }, 700);
}

export default function AuthPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const user = data.session?.user;

                if (!isMounted) return;

                if (!user) {
                    setChecking(false);
                    return;
                }

                const role = await withTimeout(getUserRole(user.id), 2000, "client");

                if (!isMounted) return;

                redirectToPath(router, dashboardForRole(role));
            } catch (error) {
                console.warn("Could not check existing auth session.", error?.message || error);
                if (!isMounted) return;
                setChecking(false);
            }
        };

        checkSession();

        const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
            if (!session?.user) {
                setChecking(false);
                return;
            }

            try {
                const role = await withTimeout(getUserRole(session.user.id), 2000, "client");
                redirectToPath(router, dashboardForRole(role));
            } catch (error) {
                console.warn("Could not redirect after auth change.", error?.message || error);
                setChecking(false);
            }
        });

        return () => {
            isMounted = false;
            listener.subscription.unsubscribe();
        };
    }, [router]);

    if (checking) {
        return <AuthRedirectLoading />;
    }

    return <AuthExperience mode="login" unified />;
}
