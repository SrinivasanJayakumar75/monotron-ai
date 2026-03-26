import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

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

