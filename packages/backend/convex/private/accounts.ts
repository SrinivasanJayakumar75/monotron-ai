import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        return await ctx.db
            .query("accounts")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const getOne = query({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const account = await ctx.db.get(args.accountId);
        if (!account || account.organizationId !== orgId) {
            return null;
        }
        return account;
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        website: v.optional(v.string()),
        industry: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        /** Linked in the same mutation so account detail always sees contacts after create. */
        linkedContactIds: v.optional(v.array(v.id("contacts"))),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const id = await ctx.db.insert("accounts", {
            organizationId: orgId,
            name: args.name,
            website: args.website,
            industry: args.industry,
            phone: args.phone,
            email: args.email,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "account",
            entityId: String(id),
            action: "create",
        });

        const contactIds = args.linkedContactIds ?? [];
        for (const contactId of contactIds) {
            const c = await ctx.db.get(contactId);
            if (!c || c.organizationId !== orgId) {
                throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
            }
            await ctx.db.patch(contactId, { accountId: id });
        }
        if (contactIds.length > 0) {
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "account",
                entityId: String(id),
                action: "update",
                changes: JSON.stringify({ linkedContacts: contactIds.length }),
            });
        }

        return id;
    },
});

export const update = mutation({
    args: {
        accountId: v.id("accounts"),
        name: v.string(),
        website: v.optional(v.string()),
        industry: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const account = await ctx.db.get(args.accountId);
        if (!account || account.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });
        }
        const name = args.name.trim();
        if (!name) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Account name is required" });
        }
        await ctx.db.patch(args.accountId, {
            name,
            website: args.website?.trim() || undefined,
            industry: args.industry?.trim() || undefined,
            phone: args.phone?.trim() || undefined,
            email: args.email?.trim() || undefined,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "account",
            entityId: String(args.accountId),
            action: "update",
        });
    },
});

export const remove = mutation({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const account = await ctx.db.get(args.accountId);
        if (!account || account.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });
        }

        await ctx.db.delete(args.accountId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "account",
            entityId: String(args.accountId),
            action: "delete",
        });
    },
});

export const importCsv = mutation({
    args: { csv: v.string() },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const lines = args.csv.split(/\r?\n/).filter((l) => l.trim() !== "");
        if (lines.length < 2) return { imported: 0 };

        const headers = lines[0]!
            .split(",")
            .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
        const idx = (name: string) => headers.indexOf(name);

        const nameIdx = idx("name");
        const websiteIdx = idx("website");
        const industryIdx = idx("industry");
        const phoneIdx = idx("phone");
        const emailIdx = idx("email");

        let imported = 0;
        for (const line of lines.slice(1)) {
            const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
            const name = nameIdx >= 0 ? cols[nameIdx] : "";
            if (!name?.trim()) continue;

            const id = await ctx.db.insert("accounts", {
                organizationId: orgId,
                name: name.trim(),
                website: websiteIdx >= 0 ? cols[websiteIdx]?.trim() || undefined : undefined,
                industry: industryIdx >= 0 ? cols[industryIdx]?.trim() || undefined : undefined,
                phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || undefined : undefined,
                email: emailIdx >= 0 ? cols[emailIdx]?.trim() || undefined : undefined,
            });
            imported += 1;
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "account",
                entityId: String(id),
                action: "create",
            });
        }
        return { imported };
    },
});

