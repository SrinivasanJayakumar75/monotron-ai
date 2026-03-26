/** Canonical public URL for OAuth redirects (no trailing slash). */
export function getAppBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
    }
    return "http://localhost:3000";
}

export function googleOAuthCallbackUrl(): string {
    return `${getAppBaseUrl()}/api/integrations/google/callback`;
}
