import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

const dealStageValidator = v.union(
    v.literal("Prospecting"),
    v.literal("Qualification"),
    v.literal("Proposal"),
    v.literal("Negotiation"),
    v.literal("Closed Won"),
    v.literal("Closed Lost"),
);

export const list = query({
    args: {
        stage: v.optional(dealStageValidator),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        if (args.stage !== undefined) {
            return await ctx.db
                .query("deals")
                .withIndex("by_organization_id_and_stage", (q) =>
                    q.eq("organizationId", orgId).eq("stage", args.stage!)
                )
                .order("desc")
                .collect();
        }

        return await ctx.db
            .query("deals")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const create = mutation({
    args: {
        accountId: v.optional(v.id("accounts")),
        contactId: v.optional(v.id("contacts")),
        leadId: v.optional(v.id("leads")),
        name: v.string(),
        amount: v.number(),
        stage: v.optional(dealStageValidator),
        closeDate: v.optional(v.number()),
        probability: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        // Basic org ownership checks for referenced objects.
        if (args.accountId) {
            const acc = await ctx.db.get(args.accountId);
            if (!acc || acc.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid account" });
            }
        }
        if (args.contactId) {
            const c = await ctx.db.get(args.contactId);
            if (!c || c.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid contact" });
            }
        }
        if (args.leadId) {
            const lead = await ctx.db.get(args.leadId);
            if (!lead || lead.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid lead" });
            }
        }

        const dealId = await ctx.db.insert("deals", {
            organizationId: orgId,
            accountId: args.accountId,
            contactId: args.contactId,
            leadId: args.leadId,
            name: args.name,
            amount: args.amount,
            stage: args.stage ?? "Prospecting",
            closeDate: args.closeDate,
            probability: args.probability,
        });
        await ctx.db.insert("dealStageHistory", {
            organizationId: orgId,
            dealId,
            fromStage: undefined,
            toStage: args.stage ?? "Prospecting",
            changedByUserId: userId,
            changedAt: Date.now(),
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "deal",
            entityId: String(dealId),
            action: "create",
        });
        return dealId;
    },
});

export const updateStage = mutation({
    args: {
        dealId: v.id("deals"),
        stage: dealStageValidator,
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const deal = await ctx.db.get(args.dealId);
        if (!deal || deal.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Deal not found" });
        }

        await ctx.db.patch(args.dealId, { stage: args.stage });
        if (deal.stage !== args.stage) {
            await ctx.db.insert("dealStageHistory", {
                organizationId: orgId,
                dealId: args.dealId,
                fromStage: deal.stage,
                toStage: args.stage,
                changedByUserId: userId,
                changedAt: Date.now(),
            });
        }
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "deal",
            entityId: String(args.dealId),
            action: "stage_change",
            changes: JSON.stringify({ from: deal.stage, to: args.stage }),
        });
    },
});

export const remove = mutation({
    args: { dealId: v.id("deals") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const deal = await ctx.db.get(args.dealId);
        if (!deal || deal.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Deal not found" });
        }

        await ctx.db.delete(args.dealId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "deal",
            entityId: String(args.dealId),
            action: "delete",
        });
    },
});

