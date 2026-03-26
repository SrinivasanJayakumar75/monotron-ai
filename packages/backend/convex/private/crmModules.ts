import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

const moduleValidator = v.union(
    v.literal("products"),
    v.literal("quotes"),
    v.literal("orders"),
    v.literal("invoices"),
    v.literal("payments"),
    v.literal("contracts"),
    v.literal("documents"),
    v.literal("approvals"),
);

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

export const list = query({
    args: { module: moduleValidator },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        return await ctx.db
            .query("crmModuleItems")
            .withIndex("by_organization_id_and_module", (q) =>
                q.eq("organizationId", orgId).eq("module", args.module)
            )
            .order("desc")
            .collect();
    },
});

export const create = mutation({
    args: {
        module: moduleValidator,
        title: v.string(),
        status: v.optional(v.string()),
        amount: v.optional(v.number()),
        dueAt: v.optional(v.number()),
        details: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const id = await ctx.db.insert("crmModuleItems", {
            organizationId: orgId,
            module: args.module,
            title: args.title,
            status: args.status,
            amount: args.amount,
            dueAt: args.dueAt,
            details: args.details,
            createdAt: Date.now(),
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: `crmModule:${args.module}`,
            entityId: String(id),
            action: "create",
        });
        return id;
    },
});

export const updateStatus = mutation({
    args: {
        itemId: v.id("crmModuleItems"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const item = await ctx.db.get(args.itemId);
        if (!item || item.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });
        }
        await ctx.db.patch(args.itemId, { status: args.status });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: `crmModule:${item.module}`,
            entityId: String(args.itemId),
            action: "update",
            changes: JSON.stringify({ status: args.status }),
        });
    },
});

export const remove = mutation({
    args: { itemId: v.id("crmModuleItems") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const item = await ctx.db.get(args.itemId);
        if (!item || item.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });
        }
        await ctx.db.delete(args.itemId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: `crmModule:${item.module}`,
            entityId: String(args.itemId),
            action: "delete",
        });
    },
});

