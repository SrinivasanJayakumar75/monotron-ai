import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const findActiveByHash = internalQuery({
    args: { keyHash: v.string() },
    handler: async (ctx, args) => {
        const rows = await ctx.db.query("crmApiKeys").collect();
        return rows.find((r) => r.keyHash === args.keyHash && r.active) ?? null;
    },
});

