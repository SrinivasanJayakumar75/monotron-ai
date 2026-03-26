import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const saveConnection = internalMutation({
    args: {
        organizationId: v.string(),
        userId: v.string(),
        email: v.string(),
        secretName: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("crmGoogleConnections")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", args.organizationId).eq("userId", args.userId),
            )
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                secretName: args.secretName,
                updatedAt: now,
            });
            return existing._id;
        }
        return await ctx.db.insert("crmGoogleConnections", {
            organizationId: args.organizationId,
            userId: args.userId,
            email: args.email,
            secretName: args.secretName,
            createdAt: now,
            updatedAt: now,
        });
    },
});
