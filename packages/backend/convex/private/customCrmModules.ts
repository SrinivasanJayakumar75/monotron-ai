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

function toSlug(raw: string) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const orgId = await requireOrgId(ctx);
        return await ctx.db
            .query("customCrmModules")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const getBySlug = query({
    args: {
        slug: v.string(),
    },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        return await ctx.db
            .query("customCrmModules")
            .withIndex("by_organization_id_and_slug", (q) =>
                q.eq("organizationId", orgId).eq("slug", args.slug)
            )
            .unique();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const slug = toSlug(args.name);
        if (!slug) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid module name" });
        }

        const existing = await ctx.db
            .query("customCrmModules")
            .withIndex("by_organization_id_and_slug", (q) =>
                q.eq("organizationId", orgId).eq("slug", slug)
            )
            .unique();
        if (existing) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Module already exists" });
        }

        return await ctx.db.insert("customCrmModules", {
            organizationId: orgId,
            name: args.name.trim(),
            slug,
            description: args.description,
            color: args.color,
            createdAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: { moduleId: v.id("customCrmModules") },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const module = await ctx.db.get(args.moduleId);
        if (!module || module.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Module not found" });
        }
        const records = await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q) => q.eq("moduleId", args.moduleId))
            .collect();
        await Promise.all(records.map((r) => ctx.db.delete(r._id)));
        await ctx.db.delete(args.moduleId);
    },
});

