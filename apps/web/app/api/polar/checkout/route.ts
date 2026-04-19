import { Checkout } from "@polar-sh/nextjs";
import { type NextRequest, NextResponse } from "next/server";

const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const server =
    process.env.POLAR_SERVER === "production" ? ("production" as const) : ("sandbox" as const);

const polarCheckout = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    successUrl: `${appUrl.replace(/\/$/, "")}/billing?checkout=success`,
    returnUrl: appUrl.replace(/\/$/, ""),
    server,
});

export async function GET(req: NextRequest) {
    if (!process.env.POLAR_ACCESS_TOKEN?.trim()) {
        return NextResponse.json(
            { error: "POLAR_ACCESS_TOKEN is not set. Add it to apps/web/.env.local (local) or your host env." },
            { status: 503 },
        );
    }
    return polarCheckout(req);
}
