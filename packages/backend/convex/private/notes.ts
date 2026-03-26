import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

export const list = query({
    args: {
        relatedLeadId: v.optional(v.id("leads")),
        relatedDealId: v.optional(v.id("deals")),
        relatedContactId: v.optional(v.id("contacts")),
        relatedAccountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        // MVP: filter in-memory to keep schema/model simple.
        const notes = await ctx.db
            .query("notes")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();

        return notes.filter((n) => {
            if (args.relatedLeadId && n.relatedLeadId !== args.relatedLeadId) return false;
            if (args.relatedDealId && n.relatedDealId !== args.relatedDealId) return false;
            if (args.relatedContactId && n.relatedContactId !== args.relatedContactId) return false;
            if (args.relatedAccountId && n.relatedAccountId !== args.relatedAccountId) return false;
            // If no related id filters are provided, include everything.
            return true;
        });
    },
});

export const create = mutation({
    args: {
        subject: v.optional(v.string()),
        body: v.string(),
        relatedLeadId: v.optional(v.id("leads")),
        relatedDealId: v.optional(v.id("deals")),
        relatedContactId: v.optional(v.id("contacts")),
        relatedAccountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        if (args.relatedLeadId) {
            const lead = await ctx.db.get(args.relatedLeadId);
            if (!lead || lead.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid lead" });
            }
        }
        if (args.relatedDealId) {
            const deal = await ctx.db.get(args.relatedDealId);
            if (!deal || deal.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid deal" });
            }
        }
        if (args.relatedContactId) {
            const contact = await ctx.db.get(args.relatedContactId);
            if (!contact || contact.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid contact" });
            }
        }
        if (args.relatedAccountId) {
            const account = await ctx.db.get(args.relatedAccountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid account" });
            }
        }

        const id = await ctx.db.insert("notes", {
            organizationId: orgId,
            subject: args.subject,
            body: args.body,
            relatedLeadId: args.relatedLeadId,
            relatedDealId: args.relatedDealId,
            relatedContactId: args.relatedContactId,
            relatedAccountId: args.relatedAccountId,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "note",
            entityId: String(id),
            action: "create",
        });
        return id;
    },
});

export const remove = mutation({
    args: { noteId: v.id("notes") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const note = await ctx.db.get(args.noteId);
        if (!note || note.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Note not found" });
        }

        await ctx.db.delete(args.noteId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "note",
            entityId: String(args.noteId),
            action: "delete",
        });
    },
});

