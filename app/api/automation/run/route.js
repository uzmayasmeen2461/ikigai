import { NextResponse } from "next/server";
import { autoApproveStaleSubmissions, refreshSlaStatuses } from "../../../lib/automation";
import { createSupabaseAdmin } from "../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request) {
    const secret = request.headers.get("x-automation-secret");

    if (process.env.AUTOMATION_SECRET && secret !== process.env.AUTOMATION_SECRET) {
        return NextResponse.json({ error: "Unauthorized automation run." }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const [slaUpdates, autoApproved] = await Promise.all([
        refreshSlaStatuses(supabase),
        autoApproveStaleSubmissions(supabase),
    ]);

    return NextResponse.json({
        success: true,
        sla_updates: slaUpdates.length,
        auto_approved: autoApproved.length,
    });
}
