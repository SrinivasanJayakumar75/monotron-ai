import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireCrmPermission } from "./_crmAuth";

const MODULE_SLUG = "lead-associations";

async function findModule(ctx: any, orgId: string) {
    const modules = await ctx.db
        .query("customCrmModules")
        .withIndex("by_organization_id", (q: any) => q.eq("organizationId", orgId))
        .collect();
    return modules.find((m: any) => m.slug === MODULE_SLUG) ?? null;
}

async function ensureModule(ctx: any, orgId: string) {
    const existing = await findModule(ctx, orgId);
    if (existing) return existing;
    const moduleId = await ctx.db.insert("customCrmModules", {
        organizationId: orgId,
        name: "Lead Associations",
        slug: MODULE_SLUG,
        description: "Maps leads to associated account and primary contact",
        color: "#6366f1",
        createdAt: Date.now(),
    });
    return await ctx.db.get(moduleId);
}

function parseDetails(details: string | undefined) {
    try {
        return JSON.parse(details ?? "{}") as {
            leadId?: string;
            accountId?: string;
            contactId?: string;
        };
    } catch {
        return {};
    }
}

export const getByLead = query({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const module = await findModule(ctx, orgId);
        if (!module) return null;
        const rows = await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q) => q.eq("moduleId", module._id))
            .collect();
        const row = rows.find((r) => parseDetails(r.details).leadId === String(args.leadId));
        if (!row) return null;
        const details = parseDetails(row.details);
        return {
            accountId: details.accountId,
            contactId: details.contactId,
        };
    },
});

export const listByAccount = query({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const module = await findModule(ctx, orgId);
        if (!module) return [];
        const rows = await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q) => q.eq("moduleId", module._id))
            .collect();
        const matched = rows.filter((r) => parseDetails(r.details).accountId === String(args.accountId));
        return matched.map((r) => parseDetails(r.details).leadId).filter(Boolean) as string[];
    },
});

export const upsert = mutation({
    args: {
        leadId: v.id("leads"),
        accountId: v.optional(v.id("accounts")),
        contactId: v.optional(v.id("contacts")),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "write");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
        }
        if (args.accountId) {
            const account = await ctx.db.get(args.accountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid account" });
            }
        }
        if (args.contactId) {
            const contact = await ctx.db.get(args.contactId);
            if (!contact || contact.organizationId !== orgId) {
                throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid contact" });
            }
        }

        const module = await ensureModule(ctx, orgId);
        const rows = await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q) => q.eq("moduleId", module._id))
            .collect();
        const existing = rows.find((r) => parseDetails(r.details).leadId === String(args.leadId));
        const details = JSON.stringify({
            leadId: String(args.leadId),
            accountId: args.accountId ? String(args.accountId) : undefined,
            contactId: args.contactId ? String(args.contactId) : undefined,
        });

        if (existing) {
            await ctx.db.patch(existing._id, { details, status: "active" });
            return existing._id;
        }
        return await ctx.db.insert("customCrmRecords", {
            organizationId: orgId,
            moduleId: module._id,
            title: `lead:${String(args.leadId)}`,
            status: "active",
            details,
            createdAt: Date.now(),
        });
    },
});

