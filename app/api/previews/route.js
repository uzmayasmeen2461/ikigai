import { NextResponse } from "next/server";
import { createSupabaseUserClient, getAuthenticatedUser } from "../../lib/supabaseServer";

function slugify(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 42);
}

export async function POST(request) {
    const { user, token, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
        return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    }

    const body = await request.json();
    const baseSlug = slugify(body.business_name) || "orva-store";
    const businessSlug = `${baseSlug}-${user.id.slice(0, 6)}`;
    const supabase = createSupabaseUserClient(token);
    const payload = {
        user_id: user.id,
        business_slug: businessSlug,
        business_name: String(body.business_name || "My ORVA Store").trim().slice(0, 80),
        tagline: String(body.tagline || "Products selected for you").trim().slice(0, 140),
        whatsapp_number: String(body.whatsapp_number || "").replace(/[^\d+]/g, "").slice(0, 18),
        accent_color: /^#[0-9a-f]{6}$/i.test(body.accent_color || "") ? body.accent_color : "#1B4FD8",
        is_public: true,
    };

    const { data, error } = await supabase
        .from("catalog_previews")
        .upsert(payload, { onConflict: "user_id" })
        .select("business_slug, business_name, tagline, whatsapp_number, accent_color")
        .single();

    if (error) {
        return NextResponse.json({
            error: error.message.includes("catalog_previews")
                ? "Run scripts/orva-preview-studio.sql in Supabase before sharing a preview."
                : error.message,
        }, { status: 500 });
    }

    return NextResponse.json({ preview: data, path: `/preview/${data.business_slug}` });
}
