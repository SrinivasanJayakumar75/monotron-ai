import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const escalate = internalMutation({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const conversation = await ctx.db
        .query("conversations")
        .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
        .unique();

        if (!conversation){
            throw new ConvexError({
                code: "NOT FOUND",
                message: "Conversation not found"
            })
        }

        await ctx.db.patch(conversation._id, {status: "escalated"});
    }
})

export const resolve = internalMutation({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const conversation = await ctx.db
        .query("conversations")
        .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
        .unique();

        if (!conversation){
            throw new ConvexError({
                code: "NOT FOUND",
                message: "Conversation not found"
            })
        }

        await ctx.db.patch(conversation._id, {status: "resolved"});
    }
})

export const linkToLead = internalMutation({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
            .unique();
        if (!conversation) {
            throw new ConvexError({ code: "NOT FOUND", message: "Conversation not found" });
        }
        const existing = await ctx.db
            .query("crmConversationLinks")
            .withIndex("by_conversation_id", (q) => q.eq("conversationId", conversation._id))
            .collect();
        if (existing.length > 0) return existing[0]?._id;
        const cs = await ctx.db.get(conversation.contactSessionId);
        if (!cs) {
            throw new ConvexError({ code: "NOT FOUND", message: "Contact session not found" });
        }
        const leadId = await ctx.db.insert("leads", {
            organizationId: conversation.organizationId,
            name: cs.name || cs.email || "Chat lead",
            email: cs.email,
            stage: "New",
            leadSource: "website_chat",
        });
        const activityId = await ctx.db.insert("activities", {
            organizationId: conversation.organizationId,
            type: "task",
            subject: "Follow up conversation",
            description: `Conversation ${conversation._id}`,
            status: "open",
            relatedLeadId: leadId,
        });
        return await ctx.db.insert("crmConversationLinks", {
            organizationId: conversation.organizationId,
            conversationId: conversation._id,
            leadId,
            activityId,
            createdByUserId: "system",
            createdAt: Date.now(),
        });
    },
});


export const getByThreadId = internalQuery({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx,args) => {
        const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
        .unique();

    return conversations;    
    }
})