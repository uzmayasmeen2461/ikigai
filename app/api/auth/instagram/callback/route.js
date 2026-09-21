import { NextResponse } from "next/server";
import { completeInstagramLogin, markInstagramConnectionFailed } from "../../../../lib/socialConnections";

function redirectToConnections(request, status, message = "") {
    const url = new URL("/dashboard/connections", request.url);
    url.searchParams.set("instagram", status);
    if (message) url.searchParams.set("message", message);
    return NextResponse.redirect(url);
}

export async function GET(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauthError = [
        url.searchParams.get("error_description"),
        url.searchParams.get("error_message"),
        url.searchParams.get("error_reason"),
        url.searchParams.get("error"),
    ].filter(Boolean).join(" ");

    if (oauthError) {
        await markInstagramConnectionFailed(state, oauthError);
        return redirectToConnections(request, "failed", oauthError);
    }
    if (!code || !state) {
        const message = "Instagram did not return an authorization code. Confirm this is a professional account with an app role while the app is in development.";
        await markInstagramConnectionFailed(state, message);
        return redirectToConnections(request, "failed", message);
    }

    try {
        await completeInstagramLogin({ code, state, origin: url.origin });
        return redirectToConnections(request, "connected");
    } catch (error) {
        await markInstagramConnectionFailed(state, error.message);
        return redirectToConnections(request, "failed", error.message || "Could not connect Instagram.");
    }
}
