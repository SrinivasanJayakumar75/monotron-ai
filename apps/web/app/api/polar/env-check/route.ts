import { NextResponse } from "next/server";

function hasValue(name: string): boolean {
    return Boolean(process.env[name]?.trim());
}

export async function GET() {
    return NextResponse.json({
        hasPolarAccessToken: hasValue("POLAR_ACCESS_TOKEN"),
        hasPolarTokenAlias: hasValue("POLAR_TOKEN"),
        hasPolarApiTokenAlias: hasValue("POLAR_API_TOKEN"),
        hasPolarProductId: hasValue("POLAR_PRO_PRODUCT_ID"),
        hasNextPublicPolarProductId: hasValue("NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID"),
        polarServer: process.env.POLAR_SERVER ?? null,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelUrl: process.env.VERCEL_URL ?? null,
    });
}
