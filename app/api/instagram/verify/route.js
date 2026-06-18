import { NextResponse } from "next/server";
import { verifyInstagramConnection } from "../../../lib/instagramPublishing";
import { createSupabaseServiceRole, getAuthenticatedUser, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export async function POST(request) {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) return NextResponse.json({ error: authError || "Not authenticated." }, { status: 401 });
    if (!hasSupabaseServiceRoleKey()) {
        return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required before verifying Instagram." }, { status: 503 });
    }

    const supabase = createSupabaseServiceRole();
    const mockMode = process.env.NEXT_PUBLIC_META_MOCK_MODE === "true";
    const { data: connection, error } = await supabase
        .from("social_connections")
        .select("id, external_account_id, external_account_name, access_token, status, metadata")
        .eq("user_id", user.id)
        .eq("channel", "instagram")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message || "Could not load Instagram connection." }, { status: 500 });
    if (!mockMode && connection?.status !== "connected") {
        return NextResponse.json({ error: "Connect Instagram Business through Meta before verifying." }, { status: 400 });
    }

    try {
        const account = await verifyInstagramConnection({ connection, mockMode });
        const metadata = {
            ...(connection?.metadata || {}),
            instagram_account_id: account.id,
            instagram_username: account.username || connection?.metadata?.instagram_username || null,
            instagram_account_type: account.account_type || null,
            instagram_media_count: account.media_count ?? null,
            last_verified_at: new Date().toISOString(),
            last_verification_error: null,
        };

        if (connection?.id) {
            await supabase
                .from("social_connections")
                .update({
                    external_account_name: account.username ? `@${account.username}` : connection.external_account_name,
                    status: "connected",
                    metadata,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", connection.id);
        }

        return NextResponse.json({
            message: account.mock
                ? "Instagram verified in demo mode."
                : `Instagram verified${account.username ? `: @${account.username}` : ""}.`,
            account: {
                id: account.id,
                username: account.username || null,
                account_type: account.account_type || null,
                media_count: account.media_count ?? null,
                mock: Boolean(account.mock),
            },
        });
    } catch (verifyError) {
        if (connection?.id) {
            await supabase
                .from("social_connections")
                .update({
                    status: "failed",
                    metadata: {
                        ...(connection.metadata || {}),
                        last_verification_error: verifyError.message,
                        last_verified_at: null,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq("id", connection.id);
        }
        return NextResponse.json({ error: verifyError.message || "Could not verify Instagram." }, { status: 400 });
    }
}
