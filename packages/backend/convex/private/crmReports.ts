import { query } from "../_generated/server";
import { ConvexError, v } from "convex/values";

function bucketLeadStage(stage: string): string {
    switch (stage) {
        case "Closed Lost":
        case "Lost":
            return "Lost";
        case "Proposal":
        case "Negotiation":
        case "Closed Won":
            return "Qualified";
        default:
            return stage;
    }
}

function monthRangeBounds(monthsBack: number, referenceMs: number) {
    const ref = new Date(referenceMs);
    const ranges: { label: string; start: number; end: number }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1, 0, 0, 0, 0);
        const start = d.getTime();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        ranges.push({
            label: d.toLocaleString("en", { month: "short", year: "2-digit" }),
            start,
            end,
        });
    }
    return ranges;
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

export const getSummary = query({
    args: {},
    handler: async (ctx) => {
        const orgId = await requireOrgId(ctx);

        const [leads, deals, contacts, accounts, activities, notes, campaigns, moduleItems, settings] =
            await Promise.all([
                ctx.db
                    .query("leads")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("deals")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("contacts")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("accounts")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("activities")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("notes")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("campaigns")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("crmModuleItems")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("crmSettings")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .unique(),
            ]);

        const totalDealValue = deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
        const wonDeals = deals.filter((d) => d.stage === "Closed Won").length;
        const lostDeals = deals.filter((d) => d.stage === "Closed Lost").length;

        const byModule: Record<string, number> = {};
        for (const item of moduleItems) {
            byModule[item.module] = (byModule[item.module] ?? 0) + 1;
        }

        return {
            totals: {
                leads: leads.length,
                deals: deals.length,
                contacts: contacts.length,
                accounts: accounts.length,
                activities: activities.length,
                notes: notes.length,
                campaigns: campaigns.length,
                totalDealValue,
                wonDeals,
                lostDeals,
            },
            byModule,
        };
    },
});

export const getDashboardAnalytics = query({
    args: {
        monthsBack: v.optional(v.number()),
        /** Client may increment to bust subscription cache on manual refresh */
        refreshNonce: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        void args.refreshNonce;
        const orgId = await requireOrgId(ctx);
        const monthsBack = Math.min(24, Math.max(3, args.monthsBack ?? 6));

        const [leads, deals, contacts, accounts, activities, notes, campaigns, moduleItems, settings] =
            await Promise.all([
                ctx.db
                    .query("leads")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("deals")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("contacts")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("accounts")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("activities")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("notes")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("campaigns")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("crmModuleItems")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .collect(),
                ctx.db
                    .query("crmSettings")
                    .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                    .unique(),
            ]);

        const totalDealValue = deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
        const wonDeals = deals.filter((d) => d.stage === "Closed Won").length;
        const lostDeals = deals.filter((d) => d.stage === "Closed Lost").length;
        const openDeals = deals.filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost").length;
        const openActivities = activities.filter((a) => a.status === "open").length;
        const probabilityMap = new Map(
            (settings?.pipelineStages ?? []).map((s) => [s.key, s.probability ?? 0] as const),
        );
        const forecastPipelineValue = deals
            .filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost")
            .reduce((sum, d) => {
                const p = (d.probability ?? probabilityMap.get(d.stage) ?? 0) / 100;
                return sum + d.amount * p;
            }, 0);

        const leadsByStatus: Record<string, number> = {};
        for (const l of leads) {
            const k = bucketLeadStage(l.stage);
            leadsByStatus[k] = (leadsByStatus[k] ?? 0) + 1;
        }

        const leadsBySource: Record<string, number> = {};
        for (const l of leads) {
            const s = l.leadSource?.trim() ? l.leadSource : "Unknown";
            leadsBySource[s] = (leadsBySource[s] ?? 0) + 1;
        }

        const dealsByStage: Record<string, { count: number; amount: number }> = {};
        for (const d of deals) {
            if (!dealsByStage[d.stage]) {
                dealsByStage[d.stage] = { count: 0, amount: 0 };
            }
            dealsByStage[d.stage]!.count += 1;
            dealsByStage[d.stage]!.amount += d.amount;
        }

        const now = Date.now();
        const monthRanges = monthRangeBounds(monthsBack, now);
        const leadsOverTime = monthRanges.map(({ label, start, end }) => ({
            period: label,
            leads: leads.filter((l) => l._creationTime >= start && l._creationTime <= end).length,
        }));
        const dealsOverTime = monthRanges.map(({ label, start, end }) => ({
            period: label,
            deals: deals.filter((d) => d._creationTime >= start && d._creationTime <= end).length,
        }));

        const byModule: Record<string, number> = {};
        for (const item of moduleItems) {
            byModule[item.module] = (byModule[item.module] ?? 0) + 1;
        }
        const moduleTop = Object.entries(byModule)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        const forecastByCloseMonth = monthRanges.map(({ label, start, end }) => {
            const value = deals
                .filter(
                    (d) =>
                        d.stage !== "Closed Won" &&
                        d.stage !== "Closed Lost" &&
                        d.closeDate !== undefined &&
                        d.closeDate >= start &&
                        d.closeDate <= end,
                )
                .reduce((sum, d) => {
                    const p = (d.probability ?? probabilityMap.get(d.stage) ?? 0) / 100;
                    return sum + d.amount * p;
                }, 0);
            return { period: label, value };
        });

        return {
            generatedAt: now,
            monthsBack,
            totals: {
                leads: leads.length,
                deals: deals.length,
                contacts: contacts.length,
                accounts: accounts.length,
                activities: activities.length,
                activitiesOpen: openActivities,
                notes: notes.length,
                campaigns: campaigns.length,
                totalDealValue,
                wonDeals,
                lostDeals,
                openDeals,
                forecastPipelineValue,
            },
            leadsByStatus: Object.entries(leadsByStatus)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),
            leadsBySource: Object.entries(leadsBySource)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),
            dealsByStage: Object.entries(dealsByStage).map(([name, v]) => ({
                name,
                count: v.count,
                amount: v.amount,
            })),
            leadsOverTime,
            dealsOverTime,
            forecastByCloseMonth,
            moduleTop,
        };
    },
});

