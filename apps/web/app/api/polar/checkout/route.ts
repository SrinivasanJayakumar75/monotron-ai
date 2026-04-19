import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";

const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const server =
    process.env.POLAR_SERVER === "production" ? ("production" as const) : ("sandbox" as const);

function getPolarAccessToken(): string {
    return (
        process.env.POLAR_ACCESS_TOKEN?.trim() ||
        process.env.POLAR_TOKEN?.trim() ||
        process.env.POLAR_API_TOKEN?.trim() ||
        ""
    );
}

export async function GET(req: NextRequest) {
    const accessToken = getPolarAccessToken();
    if (!accessToken) {
        return NextResponse.json(
            {
                error:
                    "Polar access token missing. Set POLAR_ACCESS_TOKEN in Vercel production env (or POLAR_TOKEN / POLAR_API_TOKEN).",
            },
            { status: 503 },
        );
    }
    const productId =
        process.env.POLAR_PRO_PRODUCT_ID?.trim() ||
        process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID?.trim();
    if (!productId) {
        return NextResponse.json(
            { error: "POLAR_PRO_PRODUCT_ID is not set in server env." },
            { status: 503 },
        );
    }

    const url = new URL(req.url);
    if (url.searchParams.getAll("products").length === 0) {
        url.searchParams.set("products", productId);
    }

    const polarCheckout = Checkout({
        accessToken,
        successUrl: `${appUrl.replace(/\/$/, "")}/billing?checkout=success`,
        returnUrl: appUrl.replace(/\/$/, ""),
        server,
    });
    const rewrittenReq = new NextRequest(url.toString(), req);
    return polarCheckout(rewrittenReq);
}
