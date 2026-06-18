import { NextResponse } from "next/server";
import { maxProductVideoBytes, uploadProductVideoBuffer } from "../../../lib/productImageStorage";
import { getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];

export async function POST(request) {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return NextResponse.json({ error: "Please sign in to upload reel videos." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to upload reel videos." }, { status: 500 });
    }

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Upload a valid reel video file." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json({ error: "Choose an MP4, MOV, or WebM reel video." }, { status: 400 });
    }

    const contentType = file.type || "video/webm";
    if (!allowedVideoTypes.includes(contentType)) {
        return NextResponse.json({ error: "Upload an MP4, MOV, or WebM video." }, { status: 400 });
    }
    if (file.size > maxProductVideoBytes) {
        return NextResponse.json({ error: "Video must be under 200MB." }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadProductVideoBuffer(buffer, {
            contentType,
            userId: user.id,
            productId: `standalone-reel-${Date.now()}`,
            label: formData.get("label") || file.name || "orva-reel",
        });
        return NextResponse.json({ url });
    } catch (uploadError) {
        return NextResponse.json({ error: uploadError.message || "Could not upload reel video." }, { status: 500 });
    }
}
