import { NextResponse } from "next/server";
import { detectProducts } from "../../../../lib/vision/detectProducts";
import { getAuthenticatedUser, getUserRole } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser(request);

        if (authError || !user) {
            return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
        }

        const role = await getUserRole(user.id);
        if (!["admin", "partner", "worker"].includes(role)) {
            return NextResponse.json({ error: "Only internal users can detect catalog products." }, { status: 403 });
        }

        const formData = await request.formData();
        const image = formData.get("image");
        const provider = String(formData.get("provider") || "heuristic").toLowerCase();

        if (!(image instanceof File)) {
            return NextResponse.json({ error: "Image file is required." }, { status: 400 });
        }

        if (!image.type.startsWith("image/")) {
            return NextResponse.json({ error: "Only image files are supported." }, { status: 400 });
        }

        if (image.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Image is too large. Please keep files under 8MB." }, { status: 400 });
        }

        const result = await detectProducts({ file: image, provider });

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Could not detect products in this image." },
            { status: error.message === "Roboflow is not configured" ? 400 : 500 }
        );
    }
}
