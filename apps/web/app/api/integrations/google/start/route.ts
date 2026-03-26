import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppBaseUrl, googleOAuthCallbackUrl } from "@/lib/app-base-url";

const SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export async function GET() {
    const base = getAppBaseUrl();
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.redirect(new URL("/sign-in", base));
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
        return NextResponse.redirect(
            new URL("/integrations?google_error=missing_public_client_id", base),
        );
    }

    const redirectUri = googleOAuthCallbackUrl();
    const state = crypto.randomUUID();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    const res = NextResponse.redirect(url.toString());
    res.cookies.set("google_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
    });
    return res;
}
