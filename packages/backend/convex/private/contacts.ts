import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";
import { loadLeadAssociationRows } from "./leadAssociations";

function associationDetails(details: string | undefined) {
    try {
        return JSON.parse(details ?? "{}") as { accountId?: string; contactId?: string };
    } catch {
        return {};
    }
}

/** Contacts on this account (accountId) plus any contact referenced on a lead linked to this account. */
export const listRelatedToAccount = query({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const account = await ctx.db.get(args.accountId);
        if (!account || account.organizationId !== orgId) {
            return [];
        }

        const direct = await ctx.db
            .query("contacts")
            .withIndex("by_account_id", (q) => q.eq("accountId", args.accountId))
            .order("desc")
            .collect();

        const byId = new Map(direct.filter((c) => c.organizationId === orgId).map((c) => [c._id, c]));

        const rows = await loadLeadAssociationRows(ctx, orgId);
        const aid = String(args.accountId);
        for (const r of rows) {
            const d = associationDetails(r.details);
            if (d.accountId !== aid || !d.contactId) continue;
            const cid = d.contactId as Id<"contacts">;
            if (byId.has(cid)) continue;
            const c = await ctx.db.get(cid);
            if (c && c.organizationId === orgId) {
                byId.set(c._id, c);
            }
        }

        return [...byId.values()].sort((a, b) => b._creationTime - a._creationTime);
    },
});

export const list = query({
    args: {
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        if (args.accountId) {
            const contacts = await ctx.db
                .query("contacts")
                .withIndex("by_account_id", (q) => q.eq("accountId", args.accountId))
                .order("desc")
                .collect();
            return contacts.filter((c) => c.organizationId === orgId);
        }

        return await ctx.db
            .query("contacts")
            .withIndex("by_organization_id", (qq) => qq.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const getOne = query({
    args: { contactId: v.id("contacts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const contact = await ctx.db.get(args.contactId);
        if (!contact || contact.organizationId !== orgId) {
            return null;
        }
        return contact;
    },
});

export const create = mutation({
    args: {
        accountId: v.optional(v.id("accounts")),
        firstName: v.string(),
        lastName: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        title: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        if (args.accountId) {
            const account = await ctx.db.get(args.accountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid account" });
            }
        }

        const id = await ctx.db.insert("contacts", {
            organizationId: orgId,
            accountId: args.accountId,
            firstName: args.firstName,
            lastName: args.lastName,
            email: args.email,
            phone: args.phone,
            title: args.title,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "contact",
            entityId: String(id),
            action: "create",
        });
        return id;
    },
});

export const update = mutation({
    args: {
        contactId: v.id("contacts"),
        accountId: v.optional(v.union(v.id("accounts"), v.null())),
        firstName: v.string(),
        lastName: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        title: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const contact = await ctx.db.get(args.contactId);
        if (!contact || contact.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
        }
        const firstName = args.firstName.trim();
        if (!firstName) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "First name is required" });
        }
        if (args.accountId && args.accountId !== null) {
            const account = await ctx.db.get(args.accountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid account" });
            }
        }
        const base = {
            firstName,
            lastName: args.lastName?.trim() || undefined,
            email: args.email?.trim() || undefined,
            phone: args.phone?.trim() || undefined,
            title: args.title?.trim() || undefined,
        };
        if (args.accountId === undefined) {
            await ctx.db.patch(args.contactId, base);
        } else if (args.accountId === null) {
            await ctx.db.patch(args.contactId, { ...base, accountId: undefined });
        } else {
            await ctx.db.patch(args.contactId, { ...base, accountId: args.accountId });
        }
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "contact",
            entityId: String(args.contactId),
            action: "update",
        });
    },
});

export const setAccount = mutation({
    args: {
        contactId: v.id("contacts"),
        accountId: v.union(v.id("accounts"), v.null()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const contact = await ctx.db.get(args.contactId);
        if (!contact || contact.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
        }
        if (args.accountId !== null) {
            const account = await ctx.db.get(args.accountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid account" });
            }
        }
        await ctx.db.patch(args.contactId, {
            accountId: args.accountId === null ? undefined : args.accountId,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "contact",
            entityId: String(args.contactId),
            action: "update",
            changes: JSON.stringify({ accountId: args.accountId }),
        });
    },
});

export const linkContactsToAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        contactIds: v.array(v.id("contacts")),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const account = await ctx.db.get(args.accountId);
        if (!account || account.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });
        }
        for (const contactId of args.contactIds) {
            const c = await ctx.db.get(contactId);
            if (!c || c.organizationId !== orgId) {
                throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
            }
            await ctx.db.patch(contactId, { accountId: args.accountId });
        }
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "account",
            entityId: String(args.accountId),
            action: "update",
            changes: JSON.stringify({ linkedContacts: args.contactIds.length }),
        });
    },
});

export const remove = mutation({
    args: { contactId: v.id("contacts") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const contact = await ctx.db.get(args.contactId);
        if (!contact || contact.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
        }

        await ctx.db.delete(args.contactId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "contact",
            entityId: String(args.contactId),
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
        const firstNameIdx = idx("first_name") >= 0 ? idx("first_name") : idx("firstname");
        const lastNameIdx = idx("last_name") >= 0 ? idx("last_name") : idx("lastname");
        const emailIdx = idx("email");
        const phoneIdx = idx("phone");
        const titleIdx = idx("title");

        let imported = 0;
        for (const line of lines.slice(1)) {
            const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
            const firstName = firstNameIdx >= 0 ? cols[firstNameIdx] : "";
            const lastName = lastNameIdx >= 0 ? cols[lastNameIdx] : "";
            const email = emailIdx >= 0 ? cols[emailIdx] : "";
            const phone = phoneIdx >= 0 ? cols[phoneIdx] : "";
            const title = titleIdx >= 0 ? cols[titleIdx] : "";
            if (!firstName?.trim()) continue;

            const id = await ctx.db.insert("contacts", {
                organizationId: orgId,
                firstName: firstName.trim(),
                lastName: lastName?.trim() || undefined,
                email: email?.trim() || undefined,
                phone: phone?.trim() || undefined,
                title: title?.trim() || undefined,
            });
            imported += 1;
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "contact",
                entityId: String(id),
                action: "create",
            });
        }

        return { imported };
    },
});

