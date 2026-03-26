import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";

export const getPolicy = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const existing = await ctx.db
            .query("crmSlaPolicies")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .unique();
        return (
            existing ?? {
                organizationId: orgId,
                firstResponseMinutes: 30,
                resolveMinutes: 240,
                businessHoursOnly: false,
            }
        );
    },
});

export const upsertPolicy = mutation({
    args: {
        firstResponseMinutes: v.number(),
        resolveMinutes: v.number(),
        businessHoursOnly: v.boolean(),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        const now = Date.now();
        const existing = await ctx.db
            .query("crmSlaPolicies")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, { ...args, updatedAt: now });
            return existing._id;
        }
        return await ctx.db.insert("crmSlaPolicies", {
            organizationId: orgId,
            ...args,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const listQueues = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        return await ctx.db
            .query("crmQueues")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
    },
});

export const createQueue = mutation({
    args: { name: v.string(), isDefault: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        return await ctx.db.insert("crmQueues", {
            organizationId: orgId,
            name: args.name,
            isDefault: args.isDefault ?? false,
            createdAt: Date.now(),
        });
    },
});

