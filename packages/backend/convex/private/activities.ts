import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

const activityTypeValidator = v.union(
    v.literal("task"),
    v.literal("call"),
    v.literal("email"),
    v.literal("meeting"),
);

const activityStatusValidator = v.union(
    v.literal("open"),
    v.literal("completed"),
    v.literal("cancelled"),
);

export const listByLead = query({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            return [];
        }
        const rows = await ctx.db
            .query("activities")
            .withIndex("by_org_and_related_lead", (q) =>
                q.eq("organizationId", orgId).eq("relatedLeadId", args.leadId),
            )
            .order("desc")
            .collect();
        return rows;
    },
});

export const listByContact = query({
    args: { contactId: v.id("contacts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const contact = await ctx.db.get(args.contactId);
        if (!contact || contact.organizationId !== orgId) {
            return [];
        }
        const rows = await ctx.db
            .query("activities")
            .withIndex("by_org_and_related_contact", (q) =>
                q.eq("organizationId", orgId).eq("relatedContactId", args.contactId),
            )
            .order("desc")
            .collect();
        return rows;
    },
});

export const listByAccount = query({
    args: { accountId: v.id("accounts") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const account = await ctx.db.get(args.accountId);
        if (!account || account.organizationId !== orgId) {
            return [];
        }
        const rows = await ctx.db
            .query("activities")
            .withIndex("by_org_and_related_account", (q) =>
                q.eq("organizationId", orgId).eq("relatedAccountId", args.accountId),
            )
            .order("desc")
            .collect();
        return rows;
    },
});

export const list = query({
    args: {
        type: v.optional(activityTypeValidator),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        if (args.type) {
            return await ctx.db
                .query("activities")
                .withIndex("by_organization_id_and_type", (q) =>
                    q.eq("organizationId", orgId).eq("type", args.type!)
                )
                .order("desc")
                .collect();
        }

        return await ctx.db
            .query("activities")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const create = mutation({
    args: {
        type: activityTypeValidator,
        subject: v.string(),
        description: v.optional(v.string()),
        dueAt: v.optional(v.number()),
        status: v.optional(activityStatusValidator),
        relatedLeadId: v.optional(v.id("leads")),
        relatedDealId: v.optional(v.id("deals")),
        relatedContactId: v.optional(v.id("contacts")),
        relatedAccountId: v.optional(v.id("accounts")),
        assignee: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        // Basic ownership checks for referenced objects.
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

        const id = await ctx.db.insert("activities", {
            organizationId: orgId,
            type: args.type,
            subject: args.subject,
            description: args.description,
            dueAt: args.dueAt,
            status: args.status ?? "open",
            relatedLeadId: args.relatedLeadId,
            relatedDealId: args.relatedDealId,
            relatedContactId: args.relatedContactId,
            relatedAccountId: args.relatedAccountId,
            assignee: args.assignee,
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "activity",
            entityId: String(id),
            action: "create",
        });
        return id;
    },
});

export const updateStatus = mutation({
    args: {
        activityId: v.id("activities"),
        status: activityStatusValidator,
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const activity = await ctx.db.get(args.activityId);
        if (!activity || activity.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Activity not found" });
        }

        await ctx.db.patch(args.activityId, { status: args.status });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "activity",
            entityId: String(args.activityId),
            action: "update",
            changes: JSON.stringify({ status: args.status }),
        });
    },
});

export const update = mutation({
    args: {
        activityId: v.id("activities"),
        subject: v.string(),
        description: v.string(),
        dueAt: v.union(v.number(), v.null()),
        status: activityStatusValidator,
        relatedAccountId: v.union(v.id("accounts"), v.null()),
        relatedContactId: v.union(v.id("contacts"), v.null()),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const activity = await ctx.db.get(args.activityId);
        if (!activity || activity.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Activity not found" });
        }

        const subject = args.subject.trim();
        if (!subject) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Subject is required" });
        }

        if (args.relatedAccountId) {
            const account = await ctx.db.get(args.relatedAccountId);
            if (!account || account.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid account" });
            }
        }
        if (args.relatedContactId) {
            const contact = await ctx.db.get(args.relatedContactId);
            if (!contact || contact.organizationId !== orgId) {
                throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid contact" });
            }
        }

        const desc = args.description.trim();
        await ctx.db.patch(args.activityId, {
            subject,
            description: desc ? desc : undefined,
            dueAt: args.dueAt === null ? undefined : args.dueAt,
            status: args.status,
            relatedAccountId: args.relatedAccountId === null ? undefined : args.relatedAccountId,
            relatedContactId: args.relatedContactId === null ? undefined : args.relatedContactId,
        });

        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "activity",
            entityId: String(args.activityId),
            action: "update",
            changes: JSON.stringify({
                subject,
                hasDescription: Boolean(desc),
                dueAt: args.dueAt,
                status: args.status,
                relatedAccountId: args.relatedAccountId,
                relatedContactId: args.relatedContactId,
            }),
        });
    },
});

export const remove = mutation({
    args: { activityId: v.id("activities") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const activity = await ctx.db.get(args.activityId);
        if (!activity || activity.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Activity not found" });
        }

        await ctx.db.delete(args.activityId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "activity",
            entityId: String(args.activityId),
            action: "delete",
        });
    },
});

