import { getSecretValue, parseSecretString, upsertSecret } from "./secrets";

type StoredGoogleTokens = {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
};

const SKEW_MS = 120_000;

/** Returns a non-expired access token, refreshing with refresh_token when needed. */
export async function getValidGoogleAccessToken(secretName: string): Promise<string> {
    const raw = await getSecretValue(secretName);
    const secret = parseSecretString<StoredGoogleTokens>(raw);
    if (!secret?.accessToken) {
        throw new Error("Google access token missing");
    }
    if (secret.expiresAt && secret.expiresAt > Date.now() + SKEW_MS) {
        return secret.accessToken;
    }
    const refresh = secret.refreshToken?.trim();
    if (!refresh) {
        throw new Error("Google session expired; reconnect in Integrations.");
    }
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("Google OAuth is not configured (missing server credentials).");
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refresh,
            grant_type: "refresh_token",
        }),
    });
    const json = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
    };
    if (!res.ok || !json.access_token) {
        throw new Error(json.error_description ?? json.error ?? "Failed to refresh Google token");
    }
    const expiresAt = json.expires_in ? Date.now() + json.expires_in * 1000 : undefined;
    await upsertSecret(secretName, {
        ...secret,
        accessToken: json.access_token,
        refreshToken: refresh,
        expiresAt,
    });
    return json.access_token;
}
