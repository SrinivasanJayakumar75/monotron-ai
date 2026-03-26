import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getConnectionByOrgAndUser = internalQuery({
    args: { organizationId: v.string(), userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("crmGoogleConnections")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", args.organizationId).eq("userId", args.userId),
            )
            .unique();
    },
});

const bulkEmailEntry = v.object({
    to: v.string(),
    subject: v.string(),
    body: v.string(),
});

export const logBulkSentEmailActivities = internalMutation({
    args: {
        organizationId: v.string(),
        entries: v.array(bulkEmailEntry),
    },
    handler: async (ctx, args) => {
        for (const e of args.entries) {
            await ctx.db.insert("activities", {
                organizationId: args.organizationId,
                type: "email",
                subject: `Sent email: ${e.subject}`,
                description: `To: ${e.to}\n\n${e.body}`,
                status: "completed",
            });
        }
    },
});
