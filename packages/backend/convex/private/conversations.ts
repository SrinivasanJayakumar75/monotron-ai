import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc } from "@convex-dev/agent";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import { Doc } from "../_generated/dataModel";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

export const updateStatus = mutation({
    args: {
        conversationId: v.id("conversations"),
        status: v.union(v.literal("unresolved"), v.literal("escalated"), v.literal("resolved")),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
        }
        if (conversation.organizationId !== orgId) {
            throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid Organization ID" });
        }
        const patch: Partial<Doc<"conversations">> = { status: args.status };
        if (args.status === "escalated") {
            const policy = await ctx.db
                .query("crmSlaPolicies")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                .unique();
            if (policy) patch.slaDueAt = Date.now() + policy.resolveMinutes * 60_000;
            const queues = await ctx.db
                .query("crmQueues")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                .collect();
            const defaultQueue = queues.find((q) => q.isDefault) ?? queues[0];
            if (defaultQueue) {
                const members = await ctx.db
                    .query("crmQueueMembers")
                    .withIndex("by_queue_id", (q) => q.eq("queueId", defaultQueue._id))
                    .collect();
                if (members[0]?.userId) patch.assignedToUserId = members[0].userId;
            }
        }
        await ctx.db.patch(args.conversationId, patch);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "conversation",
            entityId: String(args.conversationId),
            action: "status_change",
            changes: JSON.stringify({ from: conversation.status, to: args.status }),
        });
    },
});

export const getOne = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
        }
        if (conversation.organizationId !== orgId) {
            throw new ConvexError({ code: "UNAUTHORIZED", message: "Invalid Organization Id" });
        }
        const contactSession = await ctx.db.get(conversation.contactSessionId);
        if (!contactSession) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Contact Session not found" });
        }
        const linkRows = await ctx.db
            .query("crmConversationLinks")
            .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
            .collect();
        const links = await Promise.all(
            linkRows.map(async (link) => {
                const lead = link.leadId ? await ctx.db.get(link.leadId) : null;
                const activity = link.activityId ? await ctx.db.get(link.activityId) : null;
                return {
                    ...link,
                    leadName: lead?.name ?? null,
                    activitySubject: activity?.subject ?? null,
                };
            }),
        );
        return { ...conversation, contactSession, links };
    },
});

export const getMany = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(v.union(v.literal("unresolved"), v.literal("escalated"), v.literal("resolved"))),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        let conversations: PaginationResult<Doc<"conversations">>;
        if (args.status) {
            conversations = await ctx.db
                .query("conversations")
                .withIndex("by_status_and_organization_id", (q) =>
                    q.eq("status", args.status as Doc<"conversations">["status"]).eq("organizationId", orgId),
                )
                .order("desc")
                .paginate(args.paginationOpts);
        } else {
            conversations = await ctx.db
                .query("conversations")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                .order("desc")
                .paginate(args.paginationOpts);
        }
        const conversationsWithAdditionData = await Promise.all(
            conversations.page.map(async (conversation) => {
                let lastMessage: MessageDoc | null = null;
                const contactSession = await ctx.db.get(conversation.contactSessionId);
                if (!contactSession) return null;
                const messages = await supportAgent.listMessages(ctx, {
                    threadId: conversation.threadId,
                    paginationOpts: { numItems: 1, cursor: null },
                });
                if (messages.page.length > 0) lastMessage = messages.page[0] ?? null;
                return { ...conversation, lastMessage, contactSession };
            }),
        );
        const validConversations = conversationsWithAdditionData.filter(
            (conv): conv is NonNullable<typeof conv> => conv !== null,
        );
        return { ...conversations, page: validConversations };
    },
});

export const getLinks = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const links = await ctx.db
            .query("crmConversationLinks")
            .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
            .collect();
        return links.filter((x) => x.organizationId === orgId);
    },
});

export const createOrLinkLead = mutation({
    args: {
        conversationId: v.id("conversations"),
        leadId: v.optional(v.id("leads")),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || conversation.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
        }
        let leadId = args.leadId;
        if (!leadId) {
            const cs = await ctx.db.get(conversation.contactSessionId);
            if (!cs) throw new ConvexError({ code: "NOT_FOUND", message: "Contact session not found" });
            leadId = await ctx.db.insert("leads", {
                organizationId: orgId,
                name: cs.name || cs.email || "Chat lead",
                email: cs.email,
                stage: "New",
                leadSource: "website_chat",
            });
        }
        const activityId = await ctx.db.insert("activities", {
            organizationId: orgId,
            type: "task",
            subject: "Follow up conversation",
            description: `Conversation ${conversation._id}`,
            status: "open",
            relatedLeadId: leadId,
        });
        const linkId = await ctx.db.insert("crmConversationLinks", {
            organizationId: orgId,
            conversationId: args.conversationId,
            leadId,
            activityId,
            createdByUserId: userId,
            createdAt: Date.now(),
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "conversation",
            entityId: String(args.conversationId),
            action: "link",
            changes: JSON.stringify({ leadId, activityId }),
        });
        return { linkId, leadId, activityId };
    },
});

