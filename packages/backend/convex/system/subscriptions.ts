import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";




export const upsert = mutation({
  args: {
    organizationId: v.string(),
    status: v.string(),
    polarSubscriptionId: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    planName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, args);
    } else {
      await ctx.db.insert("subscriptions", args);
    }
  },
});


export const getByOrganizationId = internalQuery({
    args: {
        organizationId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("subscriptions")
            .withIndex("by_organization_id", (q) =>
                q.eq("organizationId", args.organizationId)
            )
            .unique();
    },
});