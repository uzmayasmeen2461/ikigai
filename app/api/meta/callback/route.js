import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        error: "Meta OAuth callback placeholder. Configure Meta credentials before enabling account connections.",
    }, { status: 501 });
}

