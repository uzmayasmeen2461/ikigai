import { Suspense } from "react";
import { ProtectedPaymentSuccessExperience } from "../../../components/PaymentSuccessExperience";

function PaymentSuccessFallback() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70">
                <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-blue-50" />
                <div className="mx-auto mt-5 h-7 w-56 animate-pulse rounded-full bg-slate-100" />
                <div className="mx-auto mt-3 h-4 w-72 animate-pulse rounded-full bg-slate-100" />
            </div>
        </main>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<PaymentSuccessFallback />}>
            <ProtectedPaymentSuccessExperience />
        </Suspense>
    );
}
