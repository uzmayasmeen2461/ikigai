import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../lib/supabaseServer";

export async function GET(_request, { params }) {
    const { businessSlug } = await params;
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("get_public_catalog_preview", {
        preview_slug: businessSlug,
    });

    if (error) {
        return NextResponse.json({
            error: error.message.includes("get_public_catalog_preview")
                ? "Public preview is not configured yet."
                : error.message,
        }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }

    return NextResponse.json({ preview: data });
}
