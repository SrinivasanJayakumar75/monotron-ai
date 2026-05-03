import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const basePaymentLink =
        process.env.RAZORPAY_PAYMENT_LINK?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK?.trim();

    if (!basePaymentLink) {
        return NextResponse.json(
            {
                error: "RAZORPAY_PAYMENT_LINK is not set. Add it to apps/web/.env.local or your deployed env.",
            },
            { status: 503 },
        );
    }

    const sourceUrl = new URL(req.url);
    const targetUrl = new URL(basePaymentLink);

    // Preserve contextual information for prefill/analytics on the payment link.
    for (const [key, value] of sourceUrl.searchParams.entries()) {
        targetUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(targetUrl);
}
