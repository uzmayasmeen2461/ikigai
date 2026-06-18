"use client";

import { useSearchParams } from "next/navigation";
import { ProductStudio } from "./ProductStudio";

export function PartnerProductStudio({ defaultChannel = "" }) {
    const searchParams = useSearchParams();
    const taskId = searchParams.get("taskId") || "";
    const channel = searchParams.get("channel") || defaultChannel;
    return <ProductStudio role="partner" taskId={taskId} channel={channel} />;
}

export function AdminProductStudio({ taskId }) {
    return <ProductStudio role="admin" taskId={taskId} />;
}
