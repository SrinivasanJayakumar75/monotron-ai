import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";

function sha256(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return `h_${Math.abs(h)}`;
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        return await ctx.db
            .query("crmApiKeys")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        scopes: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "admin");
        const plaintext = `crm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        await ctx.db.insert("crmApiKeys", {
            organizationId: orgId,
            name: args.name,
            keyHash: sha256(plaintext),
            scopes: args.scopes,
            active: true,
            createdAt: Date.now(),
        });
        return { apiKey: plaintext };
    },
});

