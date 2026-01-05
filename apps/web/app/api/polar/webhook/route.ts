import { Webhooks } from "@polar-sh/nextjs";
import { api } from "@workspace/backend/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);



export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    console.log("Received Polar webhook:", payload);
    

    // Handle subscription events
    if (payload.type === "subscription.created" || payload.type === "subscription.updated") {
      const subscription = payload.data;
      const organizationId = subscription.metadata?.organizationId
  ? String(subscription.metadata.organizationId)
  : "";

      
      await convex.mutation(api.system.subscriptions.upsert, {
  organizationId,
  status: subscription.status,
  polarSubscriptionId: subscription.id,
  polarCustomerId: subscription.customerId,
});

    }

    if (payload.type === "subscription.canceled") {
      const subscription = payload.data;

            const organizationId = subscription.metadata?.organizationId
  ? String(subscription.metadata.organizationId)
  : "";
      
      await convex.mutation(api.system.subscriptions.upsert, {
        organizationId,
        status: "canceled",
        polarSubscriptionId: subscription.id,
        polarCustomerId: subscription.customerId,
      });
    }
  },
});