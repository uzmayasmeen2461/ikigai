"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    LockKeyhole,
    Mail,
    ShieldCheck,
    TriangleAlert,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { dashboardForRole, getUserRole } from "../app/lib/authRouting";

function normalizeEmail(value = "") {
    return value.trim().toLowerCase();
}

function isValidEmail(value = "") {
    const normalizedEmail = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizedEmail);
}

function Message({ type, children }) {
    if (!children) return null;

    const isError = type === "error";

    return (
        <div
            className={`flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                isError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
            }`}
        >
            {isError ? (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{children}</p>
        </div>
    );
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

function RecoveryShell({ eyebrow, title, description, children }) {
    return (
        <main className="gradient-page min-h-[calc(100vh-80px)] px-6 py-10 md:py-16">
            <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/75 shadow-2xl shadow-blue-100/50 backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
                <div className="auth-brand-panel relative m-3 overflow-hidden p-8 text-white md:p-12">
                    <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-28 translate-y-28 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="relative">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight tracking-[-0.05em]">
                            Recover access without starting over.
                        </h1>
                        <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
                            ORVA will send a secure reset link to your registered email. After the password is changed, your workspace stays connected.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-md">
                        <p className="eyebrow">{eyebrow}</p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                            {title}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            {description}
                        </p>
                        <div className="mt-7">{children}</div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export function ForgotPasswordExperience() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState({ type: "", text: "" });
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            setError("Email is required.");
            return;
        }

        if (!isValidEmail(normalizedEmail)) {
            setError("Enter a proper email address.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage({ type: "", text: "" });

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                setMessage({ type: "error", text: resetError.message || "Could not send reset email." });
                return;
            }

            setMessage({
                type: "success",
                text: "If this email is registered with ORVA, a password reset link has been sent.",
            });
        } catch (submitError) {
            setMessage({
                type: "error",
                text: submitError?.message || "Could not send reset email. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <RecoveryShell
            eyebrow="Password help"
            title="Reset your password"
            description="Enter your ORVA email address and we will send a secure password reset link."
        >
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Email address
                    </label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setError("");
                            }}
                            onBlur={() => setEmail((current) => normalizeEmail(current))}
                            className={`form-field pl-12 ${error ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                        />
                    </div>
                    {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
                </div>

                <Message type={message.type}>{message.text}</Message>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending link...
                        </>
                    ) : (
                        <>
                            Send reset link
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
                Remembered your password?{" "}
                <Link href="/auth" className="font-semibold text-blue-700 transition hover:text-blue-800">
                    Login
                </Link>
            </p>
        </RecoveryShell>
    );
}

export function ResetPasswordExperience() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [checkingLink, setCheckingLink] = useState(true);
    const [canReset, setCanReset] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        let mounted = true;

        async function prepareRecoverySession() {
            setCheckingLink(true);
            setMessage({ type: "", text: "" });

            try {
                const code = searchParams.get("code");
                if (code) {
                    await supabase.auth.exchangeCodeForSession(code);
                }

                const { data } = await supabase.auth.getSession();

                if (!mounted) return;

                if (data.session?.user) {
                    setCanReset(true);
                    setCheckingLink(false);
                    return;
                }

                setCanReset(false);
                setCheckingLink(false);
                setMessage({
                    type: "error",
                    text: "This reset link is invalid or expired. Please request a new password reset link.",
                });
            } catch (error) {
                if (!mounted) return;
                setCanReset(false);
                setCheckingLink(false);
                setMessage({
                    type: "error",
                    text: error?.message || "Could not verify this reset link. Please request a new one.",
                });
            }
        }

        prepareRecoverySession();

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            if (event === "PASSWORD_RECOVERY" || session?.user) {
                setCanReset(true);
                setCheckingLink(false);
                setMessage({ type: "", text: "" });
            }
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, [searchParams]);

    const validate = () => {
        const nextErrors = {};

        if (!password) {
            nextErrors.password = "New password is required.";
        } else if (password.length < 6) {
            nextErrors.password = "Password must be at least 6 characters.";
        }

        if (!confirmPassword) {
            nextErrors.confirmPassword = "Please confirm your new password.";
        } else if (password !== confirmPassword) {
            nextErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!canReset || !validate()) return;

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const { data, error } = await supabase.auth.updateUser({ password });

            if (error) {
                setMessage({ type: "error", text: error.message || "Could not update password." });
                return;
            }

            const role = await getUserRole(data.user?.id);
            setMessage({ type: "success", text: "Password updated. Opening your workspace..." });

            window.setTimeout(() => {
                redirectToPath(router, dashboardForRole(role || "client"));
            }, 700);
        } catch (error) {
            setMessage({
                type: "error",
                text: error?.message || "Could not update password. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <RecoveryShell
            eyebrow="Secure reset"
            title="Create a new password"
            description="Use a new password for your ORVA account. After saving, you will be signed in automatically."
        >
            {checkingLink ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
                    Checking reset link...
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            New password
                        </label>
                        <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                value={password}
                                disabled={!canReset}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setErrors((previous) => ({ ...previous, password: "" }));
                                }}
                                className={`form-field px-12 ${errors.password ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password}</p> : null}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Confirm password
                        </label>
                        <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                disabled={!canReset}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    setErrors((previous) => ({ ...previous, confirmPassword: "" }));
                                }}
                                className={`form-field pl-12 ${errors.confirmPassword ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                            />
                        </div>
                        {errors.confirmPassword ? <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p> : null}
                    </div>

                    <Message type={message.type}>{message.text}</Message>

                    <button type="submit" disabled={!canReset || loading} className="btn-primary w-full py-3.5">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Updating password...
                            </>
                        ) : (
                            <>
                                Update password
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>
            )}

            {!canReset && !checkingLink ? (
                <p className="mt-6 text-center text-sm text-slate-500">
                    Need a fresh link?{" "}
                    <Link href="/forgot-password" className="font-semibold text-blue-700 transition hover:text-blue-800">
                        Request password reset
                    </Link>
                </p>
            ) : null}
        </RecoveryShell>
    );
}
