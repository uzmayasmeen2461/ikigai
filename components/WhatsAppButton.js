"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
    return (
        <div className="fixed bottom-24 right-6 group z-50">

            {/* Tooltip */}
            <div className="absolute right-14 bottom-2 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1 text-xs text-white opacity-0 shadow-sm transition duration-200 group-hover:opacity-100">
                Chat with us
            </div>

            {/* Button */}
            <a
                href="https://wa.me/919700838230"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-xl shadow-green-200/50 transition duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-300/50"
            >
                <MessageCircle size={24} />
            </a>
        </div>
    );
}
