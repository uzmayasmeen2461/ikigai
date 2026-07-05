import { NextResponse } from "next/server";
import { maxProductAudioBytes, uploadProductAudioBuffer } from "../../../lib/productImageStorage";
import { getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg"];

export async function POST(request) {
    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) return NextResponse.json({ error: "Please sign in to upload reel music." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to upload reel music." }, { status: 500 });
    }

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Upload a valid audio file." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json({ error: "Choose an MP3, M4A, AAC, WAV, or OGG music file." }, { status: 400 });
    }

    const contentType = file.type || "audio/mpeg";
    if (!allowedAudioTypes.includes(contentType)) {
        return NextResponse.json({ error: "Choose an MP3, M4A, AAC, WAV, or OGG music file." }, { status: 400 });
    }
    if (file.size > maxProductAudioBytes) {
        return NextResponse.json({ error: "Audio must be under 25MB." }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadProductAudioBuffer(buffer, {
            contentType,
            userId: user.id,
            productId: `standalone-reel-audio-${Date.now()}`,
            label: formData.get("label") || file.name || "orva-reel-music",
        });
        return NextResponse.json({ url, name: file.name || "Uploaded music" });
    } catch (uploadError) {
        return NextResponse.json({ error: uploadError.message || "Could not upload reel music." }, { status: 500 });
    }
}
