"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthExperience } from "../../components/AuthExperience";
import { AuthRedirectLoading } from "../../components/AuthGate";
import { supabase } from "../lib/supabase";
import { dashboardForRole, getUserRole } from "../lib/authRouting";

export default function AuthPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!isMounted) return;

            if (!user) {
                setChecking(false);
                return;
            }

            const role = await getUserRole(user.id);

            if (!isMounted) return;

            router.replace(dashboardForRole(role));
        };

        checkSession();

        const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
            if (!session?.user) {
                setChecking(false);
                return;
            }

            const role = await getUserRole(session.user.id);
            router.replace(dashboardForRole(role));
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
