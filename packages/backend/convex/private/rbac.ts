import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCrmPermission, requireOrgIdentity } from "./_crmAuth";

export const listRoles = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        return await ctx.db
            .query("crmUserRoles")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
    },
});

export const upsertRole = mutation({
    args: {
        userId: v.string(),
        role: v.union(v.literal("admin"), v.literal("agent"), v.literal("viewer")),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        const now = Date.now();
        const existing = await ctx.db
            .query("crmUserRoles")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", args.userId),
            )
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, { role: args.role, updatedAt: now });
            return existing._id;
        }
        return await ctx.db.insert("crmUserRoles", {
            organizationId: orgId,
            userId: args.userId,
            role: args.role,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const myRole = query({
    args: {},
    handler: async (ctx) => {
        const { orgId, userId } = await requireOrgIdentity(ctx);
        const row = await ctx.db
            .query("crmUserRoles")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", userId),
            )
            .unique();
        return row?.role ?? "admin";
    },
});

