"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
    return (
        <div className="fixed bottom-24 right-6 group z-50">

            {/* Tooltip */}
            <div className="absolute right-14 bottom-2 opacity-0 group-hover:opacity-100 transition bg-gray-900 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap">
                Chat with us
            </div>

            {/* Button */}
            <a
                href="https://wa.me/919700838230"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white shadow-lg hover:scale-110 hover:bg-green-600 transition"
            >
                <MessageCircle size={24} />
            </a>
        </div>
    );
}