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

export const listByModule = query({
    args: { moduleId: v.id("customCrmModules") },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const module = await ctx.db.get(args.moduleId);
        if (!module || module.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Module not found" });
        }
        return await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q) => q.eq("moduleId", args.moduleId))
            .order("desc")
            .collect();
    },
});

export const create = mutation({
    args: {
        moduleId: v.id("customCrmModules"),
        title: v.string(),
        status: v.optional(v.string()),
        amount: v.optional(v.number()),
        dueAt: v.optional(v.number()),
        details: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const module = await ctx.db.get(args.moduleId);
        if (!module || module.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Module not found" });
        }
        return await ctx.db.insert("customCrmRecords", {
            organizationId: orgId,
            moduleId: args.moduleId,
            title: args.title.trim(),
            status: args.status,
            amount: args.amount,
            dueAt: args.dueAt,
            details: args.details,
            createdAt: Date.now(),
        });
    },
});

export const updateStatus = mutation({
    args: { recordId: v.id("customCrmRecords"), status: v.string() },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const record = await ctx.db.get(args.recordId);
        if (!record || record.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Record not found" });
        }
        await ctx.db.patch(args.recordId, { status: args.status });
    },
});

export const remove = mutation({
    args: { recordId: v.id("customCrmRecords") },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const record = await ctx.db.get(args.recordId);
        if (!record || record.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Record not found" });
        }
        await ctx.db.delete(args.recordId);
    },
});

