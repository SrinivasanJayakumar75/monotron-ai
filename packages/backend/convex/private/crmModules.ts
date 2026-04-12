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

const productTypeValidator = v.union(
    v.literal("inventory"),
    v.literal("non_inventory"),
    v.literal("service"),
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
        const items = await ctx.db
            .query("crmModuleItems")
            .withIndex("by_organization_id_and_module", (q) =>
                q.eq("organizationId", orgId).eq("module", args.module)
            )
            .order("desc")
            .collect();

        if (args.module !== "products") {
            return items;
        }

        return Promise.all(
            items.map(async (item) => ({
                ...item,
                productImageUrl: item.productImageId
                    ? await ctx.storage.getUrl(item.productImageId)
                    : null,
            })),
        );
    },
});

export const generateProductImageUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireCrmPermission(ctx, "write");
        return await ctx.storage.generateUploadUrl();
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
        sku: v.optional(v.string()),
        productDescription: v.optional(v.string()),
        productUrl: v.optional(v.string()),
        unitPrice: v.optional(v.number()),
        unitCost: v.optional(v.number()),
        productType: v.optional(productTypeValidator),
        stockQuantity: v.optional(v.number()),
        productImageId: v.optional(v.id("_storage")),
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
            sku: args.sku,
            productDescription: args.productDescription,
            productUrl: args.productUrl,
            unitPrice: args.unitPrice,
            unitCost: args.unitCost,
            productType: args.productType,
            stockQuantity: args.stockQuantity,
            productImageId: args.module === "products" ? args.productImageId : undefined,
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
        if (item.productImageId) {
            await ctx.storage.delete(item.productImageId);
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

const productImportRowValidator = v.object({
    title: v.string(),
    status: v.optional(v.string()),
    sku: v.optional(v.string()),
    productDescription: v.optional(v.string()),
    productUrl: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    unitCost: v.optional(v.number()),
    productType: v.optional(productTypeValidator),
    stockQuantity: v.optional(v.number()),
});

export const bulkCreateProducts = mutation({
    args: { rows: v.array(productImportRowValidator) },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const now = Date.now();
        let created = 0;
        for (const row of args.rows) {
            const title = row.title.trim();
            if (!title) continue;
            await ctx.db.insert("crmModuleItems", {
                organizationId: orgId,
                module: "products",
                title,
                status: row.status,
                sku: row.sku,
                productDescription: row.productDescription,
                productUrl: row.productUrl,
                unitPrice: row.unitPrice,
                unitCost: row.unitCost,
                productType: row.productType,
                stockQuantity: row.stockQuantity,
                createdAt: now,
            });
            created += 1;
        }
        if (created > 0) {
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "crmModule:products",
                entityId: `bulk:${now}`,
                action: "create",
                changes: JSON.stringify({ imported: created }),
            });
        }
        return { created };
    },
});

export const updateProductStock = mutation({
    args: {
        itemId: v.id("crmModuleItems"),
        /** Use `null` to clear stock on the product. */
        stockQuantity: v.union(v.number(), v.null()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const item = await ctx.db.get(args.itemId);
        if (!item || item.organizationId !== orgId || item.module !== "products") {
            throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
        }
        await ctx.db.patch(args.itemId, {
            stockQuantity: args.stockQuantity === null ? undefined : args.stockQuantity,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "crmModule:products",
            entityId: String(args.itemId),
            action: "update",
            changes: JSON.stringify({ stockQuantity: args.stockQuantity }),
        });
    },
});

export const adjustProductStock = mutation({
    args: {
        itemId: v.id("crmModuleItems"),
        /** Added to current stock (floored at 0). */
        delta: v.number(),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const item = await ctx.db.get(args.itemId);
        if (!item || item.organizationId !== orgId || item.module !== "products") {
            throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
        }
        const current = item.stockQuantity ?? 0;
        const next = Math.max(0, current + args.delta);
        await ctx.db.patch(args.itemId, { stockQuantity: next });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "crmModule:products",
            entityId: String(args.itemId),
            action: "update",
            changes: JSON.stringify({ stockQuantity: next, delta: args.delta }),
        });
    },
});

export const updateProduct = mutation({
    args: {
        itemId: v.id("crmModuleItems"),
        title: v.string(),
        status: v.optional(v.string()),
        sku: v.optional(v.string()),
        productDescription: v.optional(v.string()),
        productUrl: v.optional(v.string()),
        unitPrice: v.optional(v.number()),
        unitCost: v.optional(v.number()),
        productType: v.optional(productTypeValidator),
        stockQuantity: v.optional(v.number()),
        /**
         * Omit to leave image unchanged. Pass `null` to remove. Pass an id to set/replace
         * (old stored file is deleted when replaced).
         */
        productImageId: v.optional(v.union(v.id("_storage"), v.null())),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const item = await ctx.db.get(args.itemId);
        if (!item || item.organizationId !== orgId || item.module !== "products") {
            throw new ConvexError({ code: "NOT_FOUND", message: "Product not found" });
        }

        await ctx.db.patch(args.itemId, {
            title: args.title.trim(),
            status: args.status,
            sku: args.sku,
            productDescription: args.productDescription,
            productUrl: args.productUrl,
            unitPrice: args.unitPrice,
            unitCost: args.unitCost,
            productType: args.productType,
            stockQuantity: args.stockQuantity,
        });

        if (args.productImageId !== undefined) {
            if (args.productImageId === null) {
                if (item.productImageId) {
                    await ctx.storage.delete(item.productImageId);
                }
                await ctx.db.patch(args.itemId, { productImageId: undefined });
            } else {
                if (item.productImageId && item.productImageId !== args.productImageId) {
                    await ctx.storage.delete(item.productImageId);
                }
                await ctx.db.patch(args.itemId, { productImageId: args.productImageId });
            }
        }

        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "crmModule:products",
            entityId: String(args.itemId),
            action: "update",
            changes: JSON.stringify({ fields: "product" }),
        });
    },
});

