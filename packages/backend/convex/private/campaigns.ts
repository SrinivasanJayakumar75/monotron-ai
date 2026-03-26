import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

const campaignStatusValidator = v.union(
    v.literal("planned"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("paused"),
);

export const list = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        return await ctx.db
            .query("campaigns")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        status: v.optional(campaignStatusValidator),
        startAt: v.optional(v.number()),
        endAt: v.optional(v.number()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const id = await ctx.db.insert("campaigns", {
            organizationId: orgId,
            name: args.name,
            status: args.status ?? "planned",
            startAt: args.startAt,
            endAt: args.endAt,
            description: args.description,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "campaign",
            entityId: String(id),
            action: "create",
        });
        return id;
    },
});

export const remove = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign || campaign.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Campaign not found" });
        }

        await ctx.db.delete(args.campaignId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "campaign",
            entityId: String(args.campaignId),
            action: "delete",
        });
    },
});

