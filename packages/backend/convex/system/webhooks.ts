import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const listPending = internalQuery({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db.query("crmWebhookEvents").collect();
        return rows.filter((r) => r.status === "pending").slice(0, 50);
    },
});

export const markStatus = internalMutation({
    args: {
        eventId: v.id("crmWebhookEvents"),
        status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.eventId, { status: args.status });
    },
});

export const getSubscription = internalQuery({
    args: { subscriptionId: v.id("crmWebhookSubscriptions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.subscriptionId);
    },
});

