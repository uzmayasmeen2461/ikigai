import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
    return (
        <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
            <section className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)]">
                    <WifiOff className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-2xl font-black tracking-[-0.02em] text-[var(--ink)]">You are offline</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--mid)]">ORVA needs internet for uploads, publishing, and live dashboard data. Reconnect and open the app again.</p>
                <Link className="btn-primary mt-6 w-full" href="/">
                    Open ORVA
                </Link>
            </section>
        </main>
    );
}
