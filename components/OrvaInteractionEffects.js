"use client";

import { useEffect, useRef } from "react";

const reactiveSelector = [
    ".interactive-tile",
    ".ui-card",
    ".dashboard-card",
    ".dashboard-panel",
    ".premium-panel",
    ".btn",
    ".btn-primary",
    ".btn-secondary",
    ".btn-ghost",
    ".btn-dark",
].join(",");

function canRunMotion() {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTextEntryElement(element) {
    if (!element) return false;
    const tag = element.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || element.isContentEditable;
}

export function OrvaInteractionEffects() {
    const glowRef = useRef(null);
    const frameRef = useRef(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!canRunMotion()) return undefined;

        const root = document.documentElement;
        const glow = glowRef.current;

        const updatePointer = () => {
            frameRef.current = null;
            const { x, y } = lastPointerRef.current;
            root.style.setProperty("--orva-pointer-x", `${x}px`);
            root.style.setProperty("--orva-pointer-y", `${y}px`);

            if (glow) {
                glow.style.transform = `translate3d(${x - 130}px, ${y - 130}px, 0)`;
            }
        };

        const handlePointerMove = (event) => {
            lastPointerRef.current = { x: event.clientX, y: event.clientY };
            if (!frameRef.current) frameRef.current = window.requestAnimationFrame(updatePointer);

            const target = event.target.closest?.(reactiveSelector);
            if (!target) return;

            const rect = target.getBoundingClientRect();
            target.style.setProperty("--orva-card-x", `${event.clientX - rect.left}px`);
            target.style.setProperty("--orva-card-y", `${event.clientY - rect.top}px`);
        };

        const handleKeyDown = (event) => {
            if (!isTextEntryElement(event.target)) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key.length > 1 && !["Backspace", "Enter", " "].includes(event.key)) return;

            const rect = event.target.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const spark = document.createElement("span");
            spark.className = "orva-key-spark";
            spark.setAttribute("aria-hidden", "true");
            spark.textContent = event.key === "Backspace" ? "×" : event.key === "Enter" ? "↵" : "•";

            const left = rect.left + Math.min(rect.width - 20, Math.max(18, rect.width * 0.72 + (Math.random() * 18 - 9)));
            const top = rect.top + rect.height * 0.5 + (Math.random() * 12 - 6);
            spark.style.left = `${left}px`;
            spark.style.top = `${top}px`;

            document.body.appendChild(spark);
            window.setTimeout(() => spark.remove(), 720);
        };

        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("keydown", handleKeyDown);
            if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return <div ref={glowRef} className="orva-cursor-glow" aria-hidden="true" />;
}
