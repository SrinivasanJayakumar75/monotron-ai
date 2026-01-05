import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  getCustomerId: async (req: NextRequest) => {
    const { orgId } = await auth();
    
    // You'll need to store Polar customer IDs in your database
    // and retrieve them here based on the organization
    if (!orgId) return "";
    
    // Query your database to get the Polar customer ID
    // This is a placeholder - implement based on your needs
    return ""; // Return the Polar customer ID
  },
  returnUrl: process.env.NEXT_PUBLIC_APP_URL + "/billing",
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});