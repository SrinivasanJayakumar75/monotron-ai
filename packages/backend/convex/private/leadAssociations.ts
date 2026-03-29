import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireCrmPermission } from "./_crmAuth";

const MODULE_SLUG = "lead-associations";

async function findModule(ctx: any, orgId: string) {
    return await ctx.db
        .query("customCrmModules")
        .withIndex("by_organization_id_and_slug", (q: any) =>
            q.eq("organizationId", orgId).eq("slug", MODULE_SLUG),
        )
        .unique();
}

/** Rows that store lead ↔ account/contact associations (module or org-wide fallback). */
export async function loadLeadAssociationRows(ctx: any, orgId: string) {
    const module = await findModule(ctx, orgId);
    if (module) {
        return await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q: any) => q.eq("moduleId", module._id))
            .collect();
    }
    const orgRecords = await ctx.db
        .query("customCrmRecords")
        .withIndex("by_organization_id", (q: any) => q.eq("organizationId", orgId))
        .collect();
    return orgRecords.filter((r: any) => {
        const d = parseDetails(r.details);
        return Boolean(d.leadId);
    });
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
        const rows = await loadLeadAssociationRows(ctx, orgId);
        const row = rows.find((r: any) => parseDetails(r.details).leadId === String(args.leadId));
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
        const rows = await loadLeadAssociationRows(ctx, orgId);
        const aid = String(args.accountId);
        const matched = rows.filter((r: any) => parseDetails(r.details).accountId === aid);
        return matched.map((r: any) => parseDetails(r.details).leadId).filter(Boolean) as string[];
    },
});

export const listByContact = query({
    args: { contactId: v.id("contacts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const rows = await loadLeadAssociationRows(ctx, orgId);
        const cid = String(args.contactId);
        const matched = rows.filter((r: any) => parseDetails(r.details).contactId === cid);
        return matched.map((r: any) => parseDetails(r.details).leadId).filter(Boolean) as string[];
    },
});

export const upsert = mutation({
    args: {
        leadId: v.id("leads"),
        accountId: v.optional(v.union(v.id("accounts"), v.null())),
        contactId: v.optional(v.union(v.id("contacts"), v.null())),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "write");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
        }
        if (args.accountId && args.accountId !== null) {
            const account = await ctx.db.get(args.accountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid account" });
            }
        }
        if (args.contactId && args.contactId !== null) {
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
        const prev = existing ? parseDetails(existing.details) : {};

        let nextAccountId: string | undefined;
        if (args.accountId === undefined) {
            nextAccountId = prev.accountId;
        } else if (args.accountId === null) {
            nextAccountId = undefined;
        } else {
            nextAccountId = String(args.accountId);
        }

        let nextContactId: string | undefined;
        if (args.contactId === undefined) {
            nextContactId = prev.contactId;
        } else if (args.contactId === null) {
            nextContactId = undefined;
        } else {
            nextContactId = String(args.contactId);
        }

        const details = JSON.stringify({
            leadId: String(args.leadId),
            accountId: nextAccountId,
            contactId: nextContactId,
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

