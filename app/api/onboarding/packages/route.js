import { NextResponse } from "next/server";
import { defaultPackages, fetchPackages } from "../../../lib/onboarding";
import { createSupabaseServiceRole, hasSupabaseServiceRoleKey } from "../../../lib/supabaseServer";

export async function GET() {
    const supabase = hasSupabaseServiceRoleKey() ? createSupabaseServiceRole() : null;
    const packages = supabase ? await fetchPackages(supabase) : defaultPackages();
    return NextResponse.json({ packages });
}
