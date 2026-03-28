import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";

function normalizeCurrencyCode(raw: string): string {
    return raw.trim().toUpperCase();
}

function assertValidCurrency(code: string) {
    if (!/^[A-Z]{3}$/.test(code)) {
        throw new ConvexError({
            code: "BAD_REQUEST",
            message: "Currency must be a 3-letter ISO 4217 code (e.g. USD, EUR, INR).",
        });
    }
}

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

const DEFAULT_PIPELINE_STAGES = [
    { key: "Prospecting", label: "Prospecting", order: 1, probability: 10 },
    { key: "Qualification", label: "Qualification", order: 2, probability: 30 },
    { key: "Proposal", label: "Proposal", order: 3, probability: 60 },
    { key: "Negotiation", label: "Negotiation", order: 4, probability: 80 },
    { key: "Closed Won", label: "Closed Won", order: 5, probability: 100 },
    { key: "Closed Lost", label: "Closed Lost", order: 6, probability: 0 },
] as const;

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
                pipelineStages: [...DEFAULT_PIPELINE_STAGES],
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
        const defaultCurrency = normalizeCurrencyCode(args.defaultCurrency);
        assertValidCurrency(defaultCurrency);

        const existing = await ctx.db
            .query("crmSettings")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                defaultCurrency,
                taxRate: args.taxRate,
                fiscalYearStartMonth: args.fiscalYearStartMonth,
                autoNumbering: args.autoNumbering,
                ...(args.pipelineStages !== undefined ? { pipelineStages: args.pipelineStages } : {}),
            });
            return existing._id;
        }

        return await ctx.db.insert("crmSettings", {
            organizationId: orgId,
            defaultCurrency,
            taxRate: args.taxRate,
            fiscalYearStartMonth: args.fiscalYearStartMonth,
            autoNumbering: args.autoNumbering,
            pipelineStages: args.pipelineStages ?? [...DEFAULT_PIPELINE_STAGES],
        });
    },
});

