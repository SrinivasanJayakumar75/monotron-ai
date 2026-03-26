import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@workspace/backend/_generated/api";
import { getAppBaseUrl, googleOAuthCallbackUrl } from "@/lib/app-base-url";

export async function GET(req: NextRequest) {
    const base = getAppBaseUrl();
    const redirectUri = googleOAuthCallbackUrl();

    const finish = (path: string) => {
        const res = NextResponse.redirect(new URL(path, base));
        res.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
        return res;
    };

    const oauthError = req.nextUrl.searchParams.get("error");
    if (oauthError) {
        return finish(`/integrations?google_error=${encodeURIComponent(oauthError)}`);
    }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const cookieState = req.cookies.get("google_oauth_state")?.value;
    if (!code || !state || !cookieState || cookieState !== state) {
        return finish(`/integrations?google_error=${encodeURIComponent("Invalid or expired OAuth session")}`);
    }

    const { userId, getToken } = await auth();
    if (!userId) {
        return finish("/sign-in");
    }

    const jwt = await getToken({ template: "convex" });
    if (!jwt) {
        return finish(
            `/integrations?google_error=${encodeURIComponent("Missing Convex JWT (check Clerk template named convex)")}`,
        );
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
        return finish(`/integrations?google_error=${encodeURIComponent("NEXT_PUBLIC_CONVEX_URL is not set")}`);
    }

    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(jwt);
    try {
        await client.action(api.private.googleOAuth.completeOAuth, { code, redirectUri });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Google connection failed";
        return finish(`/integrations?google_error=${encodeURIComponent(message)}`);
    }

    return finish("/integrations?google_connected=1");
}
