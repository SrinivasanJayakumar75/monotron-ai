import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        return await ctx.db
            .query("crmWebhookSubscriptions")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
    },
});

export const upsert = mutation({
    args: {
        id: v.optional(v.id("crmWebhookSubscriptions")),
        url: v.string(),
        secret: v.string(),
        eventTypes: v.array(v.string()),
        active: v.boolean(),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        const now = Date.now();
        if (args.id) {
            await ctx.db.patch(args.id, {
                url: args.url,
                secret: args.secret,
                eventTypes: args.eventTypes,
                active: args.active,
                updatedAt: now,
            });
            return args.id;
        }
        return await ctx.db.insert("crmWebhookSubscriptions", {
            organizationId: orgId,
            url: args.url,
            secret: args.secret,
            eventTypes: args.eventTypes,
            active: args.active,
            createdAt: now,
            updatedAt: now,
        });
    },
});

