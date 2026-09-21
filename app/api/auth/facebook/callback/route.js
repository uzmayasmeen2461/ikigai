import { NextResponse } from "next/server";
import { completeFacebookLogin, markFacebookConnectionFailed } from "../../../../lib/socialConnections";

function redirectToConnections(request, status, message = "") {
    const url = new URL("/dashboard/connections", request.url);
    url.searchParams.set("facebook", status);
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
        url.searchParams.get("error_code") ? `Meta error code: ${url.searchParams.get("error_code")}` : "",
    ].filter(Boolean).join(" ");

    if (oauthError) {
        await markFacebookConnectionFailed(state, oauthError);
        return redirectToConnections(request, "failed", oauthError);
    }
    if (!code || !state) {
        const message = "Facebook did not return an authorization code. Confirm the Meta app has Facebook Login enabled, your account has an app role during development, and Page permissions are available for this app.";
        await markFacebookConnectionFailed(state, message);
        return redirectToConnections(request, "failed", message);
    }

    try {
        await completeFacebookLogin({ code, state, origin: url.origin });
        return redirectToConnections(request, "connected");
    } catch (error) {
        await markFacebookConnectionFailed(state, error.message);
        return redirectToConnections(request, "failed", error.message || "Could not connect Facebook.");
    }
}
