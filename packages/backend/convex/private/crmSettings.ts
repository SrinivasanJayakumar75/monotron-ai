import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";

async function requireOrgId(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError({ code: "UNAUTHORIZED", message: "Identity not found" });
    }
    const orgId = identity.orgId as string;
    if (!orgId) {
        throw new ConvexError({ code: "UNAUTHORIZED", message: "Organization not found" });
    }
    return orgId;
}

export const getOne = query({
    args: {},
    handler: async (ctx) => {
        const orgId = await requireOrgId(ctx);
        const existing = await ctx.db
            .query("crmSettings")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .unique();

        return (
            existing ?? {
                organizationId: orgId,
                defaultCurrency: "USD",
                taxRate: 0,
                fiscalYearStartMonth: 1,
                autoNumbering: true,
                pipelineStages: [
                    { key: "Prospecting", label: "Prospecting", order: 1, probability: 10 },
                    { key: "Qualification", label: "Qualification", order: 2, probability: 30 },
                    { key: "Proposal", label: "Proposal", order: 3, probability: 60 },
                    { key: "Negotiation", label: "Negotiation", order: 4, probability: 80 },
                    { key: "Closed Won", label: "Closed Won", order: 5, probability: 100 },
                    { key: "Closed Lost", label: "Closed Lost", order: 6, probability: 0 },
                ],
            }
        );
    },
});

export const upsert = mutation({
    args: {
        defaultCurrency: v.string(),
        taxRate: v.number(),
        fiscalYearStartMonth: v.number(),
        autoNumbering: v.boolean(),
        pipelineStages: v.optional(
            v.array(
                v.object({
                    key: v.string(),
                    label: v.string(),
                    order: v.number(),
                    probability: v.optional(v.number()),
                }),
            ),
        ),
    },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const existing = await ctx.db
            .query("crmSettings")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                defaultCurrency: args.defaultCurrency,
                taxRate: args.taxRate,
                fiscalYearStartMonth: args.fiscalYearStartMonth,
                autoNumbering: args.autoNumbering,
                pipelineStages: args.pipelineStages,
            });
            return existing._id;
        }

        return await ctx.db.insert("crmSettings", {
            organizationId: orgId,
            defaultCurrency: args.defaultCurrency,
            taxRate: args.taxRate,
            fiscalYearStartMonth: args.fiscalYearStartMonth,
            autoNumbering: args.autoNumbering,
            pipelineStages: args.pipelineStages,
        });
    },
});

