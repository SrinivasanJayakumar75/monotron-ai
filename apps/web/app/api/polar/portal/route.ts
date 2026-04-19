import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from "@clerk/nextjs/server";

const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const server =
    process.env.POLAR_SERVER === "production" ? ("production" as const) : ("sandbox" as const);

export const GET = CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    server,
    returnUrl: `${appUrl.replace(/\/$/, "")}/billing`,
    getExternalCustomerId: async () => {
        const { orgId } = await auth();
        if (!orgId) {
            throw new Error("No organization selected");
        }
        return orgId;
    },
});
