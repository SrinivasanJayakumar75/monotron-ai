import { v } from "convex/values";
import { query } from "../_generated/server";

export const proStatus = query({
    args: { organizationId: v.string() },
    handler: async (ctx, { organizationId }) => {
        const sub = await ctx.db
            .query("subscriptions")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
            .unique();
        return { isPro: sub?.status === "active" };
    },
});
