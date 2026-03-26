"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { upsertSecret } from "../lib/secrets";
import { internal } from "../_generated/api";

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const USERINFO_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
const OPENID_SCOPE = "openid";

/** OAuth codes must be exchanged from the same server that registered the redirect URI. */
export const completeOAuth = action({
    args: {
        code: v.string(),
        redirectUri: v.string(),
    },
    handler: async (ctx, args): Promise<{ ok: true; email: string }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const orgId = identity.orgId as string | undefined;
        const userId = (identity.subject ?? identity.tokenIdentifier ?? "") as string;
        if (!orgId || !userId) throw new Error("Missing org/user");

        await ctx.runQuery(internal.private.crmAuthInternal.assertCrmWrite, {
            organizationId: orgId,
            userId,
        });

        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error("Google OAuth is not configured (set GOOGLE_OAUTH_CLIENT_ID / SECRET in Convex).");
        }

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: args.code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: args.redirectUri,
                grant_type: "authorization_code",
            }),
        });
        const tokenJson = (await tokenRes.json()) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            error?: string;
            error_description?: string;
        };
        if (!tokenRes.ok || !tokenJson.access_token) {
            throw new Error(
                tokenJson.error_description ?? tokenJson.error ?? "Google token exchange failed",
            );
        }

        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        const profile = (await userInfoRes.json()) as { email?: string };
        const email = profile.email?.trim();
        if (!email) {
            throw new Error("Could not read email from Google account");
        }

        const expiresAt = tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined;
        const secretName = `crm-google/${orgId}/${userId}`;
        await upsertSecret(secretName, {
            accessToken: tokenJson.access_token,
            refreshToken: tokenJson.refresh_token ?? "",
            expiresAt,
            scopes: [OPENID_SCOPE, USERINFO_SCOPE, GMAIL_SEND_SCOPE],
        });

        await ctx.runMutation(internal.private.googleOAuthInternal.saveConnection, {
            organizationId: orgId,
            userId,
            email,
            secretName,
        });

        return { ok: true, email };
    },
});
