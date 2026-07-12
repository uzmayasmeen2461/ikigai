"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowRight,
    BadgeCheck,
    BriefcaseBusiness,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Sparkles,
    TriangleAlert,
    UserRound,
    UsersRound,
} from "lucide-react";
import { supabase } from "../app/lib/supabase";
import { dashboardForRole, getUserRole } from "../app/lib/authRouting";

const roleOptions = [
    {
        value: "client",
        title: "I am a Business Owner",
        helper: "I want help with digital services.",
        icon: BriefcaseBusiness,
    },
    {
        value: "worker",
        title: "I want to Earn with ORVA",
        helper: "I want to work as a digital setup specialist.",
        icon: UsersRound,
    },
];

const trustPoints = [
    "Simple service requests",
    "Clear updates",
    "Secure payments",
];

const checkoutIntentKey = "ikigai_pending_service_checkout";

function normalizeEmail(value = "") {
    return value.trim().toLowerCase();
}

function isValidEmail(value = "") {
    const normalizedEmail = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizedEmail);
}

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
    ]);
}

function withFallbackTimeout(promise, timeoutMs, fallback) {
    return Promise.race([
        promise,
        new Promise((resolve) => {
            window.setTimeout(() => resolve(fallback), timeoutMs);
        }),
    ]);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        window.clearTimeout(timeout);
    }
}

function checkoutIntentPath(role) {
    if (typeof window === "undefined" || role !== "client") return "";

    try {
        const rawIntent = window.localStorage.getItem(checkoutIntentKey);
        if (!rawIntent) return "";

        const intent = JSON.parse(rawIntent);
        if (!intent?.serviceType) return "";

        return `/services?checkout=${encodeURIComponent(intent.serviceType)}`;
    } catch {
        return "";
    }
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

function AuthModeToggle({ unified, href, active, onClick, children }) {
    const className = `rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
    }`;

    if (unified) {
        return (
            <button type="button" onClick={onClick} className={className}>
                {children}
            </button>
        );
    }

    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}

export function AuthExperience({ mode = "login", unified = false }) {
    const router = useRouter();
    const [activeMode, setActiveMode] = useState(mode);
    const isSignup = activeMode === "signup";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("client");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        let cancelled = false;

        async function redirectExistingSession() {
            try {
                const { data } = await supabase.auth.getSession();
                const userId = data.session?.user?.id;

                if (!userId || cancelled) return;

                setLoading(true);
                setMessage({ type: "success", text: "Opening your workspace..." });

                const userRole = await withFallbackTimeout(
                    getUserRole(userId),
                    2000,
                    "client"
                );

                if (!cancelled) {
                    redirectToPath(router, dashboardForRole(userRole));
                }
            } catch {
                if (!cancelled) setLoading(false);
            }
        }

        redirectExistingSession();

        return () => {
            cancelled = true;
        };
    }, [router]);

    const validate = () => {
        const nextErrors = {};
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            nextErrors.email = "Email is required.";
        } else if (!isValidEmail(normalizedEmail)) {
            nextErrors.email = "Enter a proper email address.";
        }

        if (!password) {
            nextErrors.password = "Password is required.";
        } else if (isSignup && password.length < 6) {
            nextErrors.password = "Password must be at least 6 characters.";
        }

        if (isSignup && !["client", "worker"].includes(role)) {
            nextErrors.role = "Choose one option to continue.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setLoading(true);
        setMessage({ type: "", text: "" });
        const normalizedEmail = normalizeEmail(email);

        try {
            const response = await fetchWithTimeout("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setLoading(false);
                setMessage({ type: "error", text: data.error || "Could not login. Please try again." });
                return;
            }

            const { error: sessionError } = await withTimeout(
                supabase.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                }),
                5000,
                "Saving login session took too long."
            );

            if (sessionError) {
                setLoading(false);
                setMessage({ type: "error", text: sessionError.message || "Could not save login session." });
                return;
            }

            const userRole = data.role || "client";

            setMessage({ type: "success", text: "Login successful. Opening your workspace..." });

            const pendingCheckoutPath = checkoutIntentPath(userRole);
            redirectToPath(router, pendingCheckoutPath || dashboardForRole(userRole));
        } catch (error) {
            setLoading(false);
            setMessage({
                type: "error",
                text: error?.name === "AbortError"
                    ? "Login is taking too long. Check your Supabase connection and try again."
                    : error?.message === "Failed to fetch"
                    ? "Could not reach ORVA login service. Check your connection and try again."
                    : error?.message || "Could not login. Please try again.",
            });
        }
    };

    const handleSignup = async () => {
        if (!validate()) return;

        setLoading(true);
        setMessage({ type: "", text: "" });
        const normalizedEmail = normalizeEmail(email);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
            });

            if (error) {
                setLoading(false);
                setMessage({ type: "error", text: error.message });
                return;
            }

            if (!data.user) {
                setLoading(false);
                setMessage({
                    type: "success",
                    text: "Please check your email to complete signup.",
                });
                return;
            }

            const { error: insertError } = await supabase.from("users").insert([
                {
                    id: data.user.id,
                    role,
                    name: normalizedEmail,
                },
            ]);

            if (insertError) {
                setLoading(false);
                setMessage({ type: "error", text: insertError.message });
                return;
            }

            fetchWithTimeout("/api/auth/registration-notification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: data.user.id,
                    email: normalizedEmail,
                    role,
                }),
            }, 5000).catch((notificationError) => {
                console.warn("Could not send registration notification.", notificationError?.message || notificationError);
            });

            const nextPath = checkoutIntentPath(role) || dashboardForRole(role);

            setEmail("");
            setPassword("");
            setRole("client");
            setErrors({});
            setLoading(false);
            setMessage({
                type: "success",
                text: "Account created. Opening your ORVA workspace...",
            });

            window.setTimeout(() => {
                redirectToPath(router, nextPath);
            }, 650);
        } catch (error) {
            setLoading(false);
            setMessage({
                type: "error",
                text: error?.message === "Failed to fetch"
                    ? "Could not reach ORVA signup service. Check your connection and try again."
                    : error?.message || "Could not create account. Please try again.",
            });
        }
    };

    const submit = (event) => {
        event.preventDefault();
        if (isSignup) {
            handleSignup();
        } else {
            handleLogin();
        }
    };

    return (
        <main className="gradient-page min-h-[calc(100vh-80px)] px-6 py-10 md:py-16">
            <section className="mx-auto grid max-w-[1440px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/70 shadow-2xl shadow-blue-100/50 backdrop-blur-2xl lg:grid-cols-[1.02fr_0.98fr]">
                <div className="auth-brand-panel relative m-3 overflow-hidden p-8 text-white md:p-12">
                    <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-28 translate-y-28 rounded-full bg-indigo-500/20 blur-3xl" />
                    <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">
                            <Sparkles className="h-4 w-4" />
                            Start with ORVA
                        </div>

                        <h1 className="mt-8 max-w-2xl text-5xl font-semibold leading-tight tracking-[-0.05em] md:text-6xl">
                            Get started without the confusion.
                        </h1>
                        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                            Sign up, start a service, or join as a partner in a few simple steps.
                        </p>

                        <div className="mt-10 grid gap-4 sm:grid-cols-3">
                            {trustPoints.map((point) => (
                                <div key={point} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                                    <ShieldCheck className="mb-3 h-5 w-5 text-blue-200" />
                                    <p className="text-sm font-semibold leading-6 text-white">{point}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                            <p className="text-sm font-semibold text-blue-200">Choose your path</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="font-semibold text-white">Business Owner</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-300">
                                        Start services, pay, and track progress.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Digital Setup Specialist</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-300">
                                        Complete assigned digital setup work and send updates.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-md">
                        <div className="mb-7 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                            <AuthModeToggle
                                unified={unified}
                                href="/login"
                                active={!isSignup}
                                onClick={() => {
                                    setActiveMode("login");
                                    setErrors({});
                                    setMessage({ type: "", text: "" });
                                }}
                            >
                                Login
                            </AuthModeToggle>
                            <AuthModeToggle
                                unified={unified}
                                href="/signup"
                                active={isSignup}
                                onClick={() => {
                                    setActiveMode("signup");
                                    setErrors({});
                                    setMessage({ type: "", text: "" });
                                }}
                            >
                                Sign Up
                            </AuthModeToggle>
                        </div>

                        <div className="mb-7">
                            <p className="eyebrow">{isSignup ? "Create account" : "Welcome back"}</p>
                            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">
                                {isSignup ? "Create your account" : "Login to ORVA"}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                {isSignup
                                    ? "Choose one option below, then continue."
                                    : "Enter your email and password to continue."}
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            {isSignup && (
                                <div>
                                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                                        Choose one option
                                    </label>
                                    <div className="grid gap-3">
                                        {roleOptions.map((option) => {
                                            const Icon = option.icon;
                                            const selected = role === option.value;

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setRole(option.value);
                                                        setErrors((prev) => ({ ...prev, role: "" }));
                                                    }}
                                                    className={`flex gap-4 rounded-2xl border p-4 text-left transition duration-200 ${
                                                        selected
                                                            ? "border-blue-300 bg-blue-50 text-blue-950 shadow-lg shadow-blue-100/70"
                                                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <span
                                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                                            selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </span>
                                                    <span>
                                                        <span className="block text-sm font-semibold">{option.title}</span>
                                                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                                                            {option.helper}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.role && <p className="mt-2 text-sm text-red-600">{errors.role}</p>}
                                </div>
                            )}

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
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setErrors((prev) => ({ ...prev, email: "" }));
                                        }}
                                        onBlur={() => setEmail((current) => normalizeEmail(current))}
                                        className={`form-field pl-12 ${errors.email ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                    />
                                </div>
                                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder={isSignup ? "Create a secure password" : "Enter your password"}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setErrors((prev) => ({ ...prev, password: "" }));
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
                                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
                                {isSignup && !errors.password && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        Use at least 6 characters.
                                    </p>
                                )}
                            </div>

                            <Message type={message.type}>{message.text}</Message>

                            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {isSignup ? "Creating account..." : "Logging in..."}
                                    </>
                                ) : (
                                    <>
                                        {isSignup ? "Create account" : "Login"}
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-500">
                            {isSignup ? "Already have an account?" : "New to ORVA?"}{" "}
                            {unified ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveMode(isSignup ? "login" : "signup");
                                        setErrors({});
                                        setMessage({ type: "", text: "" });
                                    }}
                                    className="font-semibold text-blue-700 transition hover:text-blue-800"
                                >
                                    {isSignup ? "Login" : "Create an account"}
                                </button>
                            ) : (
                                <Link
                                    href={isSignup ? "/login" : "/signup"}
                                    className="font-semibold text-blue-700 transition hover:text-blue-800"
                                >
                                    {isSignup ? "Login" : "Create an account"}
                                </Link>
                            )}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                                <BadgeCheck className="h-3.5 w-3.5 text-blue-600" />
                                Client access
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                                <UserRound className="h-3.5 w-3.5 text-blue-600" />
                                Specialist onboarding
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
