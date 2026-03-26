import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const exportByOrganization = internalQuery({
    args: { organizationId: v.string() },
    handler: async (ctx, args) => {
        const [leads, deals, activities] = await Promise.all([
            ctx.db
                .query("leads")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
                .collect(),
            ctx.db
                .query("deals")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
                .collect(),
            ctx.db
                .query("activities")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", args.organizationId))
                .collect(),
        ]);
        return { leads, deals, activities };
    },
});

