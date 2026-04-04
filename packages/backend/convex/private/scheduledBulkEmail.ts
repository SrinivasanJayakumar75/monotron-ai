import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";

const recipientValidator = v.object({
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
});

const MAX_BULK = 2000;
const SUBJECT_MAX = 500;
const BODY_MAX = 100_000;
const PREVIEW_TEXT_MAX = 200;
const MIN_LEAD_MS = 60_000;
const MAX_LEAD_MS = 90 * 24 * 60 * 60 * 1000;

export const scheduleSend = mutation({
    args: {
        subject: v.string(),
        body: v.string(),
        previewText: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        internalTitle: v.optional(v.string()),
        scheduledAt: v.number(),
        recipients: v.array(recipientValidator),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const conn = await ctx.runQuery(api.private.googleIntegration.getConnection, {});
        if (!conn) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Connect Google before scheduling a send." });
        }

        const now = Date.now();
        if (args.scheduledAt < now + MIN_LEAD_MS) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Schedule at least 1 minute from now." });
        }
        if (args.scheduledAt > now + MAX_LEAD_MS) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Cannot schedule more than 90 days ahead." });
        }

        const subjectTpl = args.subject.trim();
        const bodyTpl = args.body.trim();
        if (!subjectTpl) throw new ConvexError({ code: "BAD_REQUEST", message: "Subject is required" });
        if (subjectTpl.length > SUBJECT_MAX) {
            throw new ConvexError({ code: "BAD_REQUEST", message: `Subject must be at most ${SUBJECT_MAX} characters` });
        }
        if (!bodyTpl) throw new ConvexError({ code: "BAD_REQUEST", message: "Message body is required" });
        if (bodyTpl.length > BODY_MAX) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Message is too long" });
        }
        const previewTpl = (args.previewText ?? "").trim();
        if (previewTpl.length > PREVIEW_TEXT_MAX) {
            throw new ConvexError({ code: "BAD_REQUEST", message: `Preview text must be at most ${PREVIEW_TEXT_MAX} characters` });
        }
        if (args.recipients.length === 0) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Add at least one recipient" });
        }
        if (args.recipients.length > MAX_BULK) {
            throw new ConvexError({ code: "BAD_REQUEST", message: `Maximum ${MAX_BULK} recipients per batch` });
        }

        const imageUrl = args.imageUrl?.trim();
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Image URL must start with http:// or https://" });
        }

        const id = await ctx.db.insert("scheduledBulkEmails", {
            organizationId: orgId,
            userId,
            internalTitle: args.internalTitle?.trim() || undefined,
            subject: subjectTpl,
            body: bodyTpl,
            previewText: previewTpl || undefined,
            imageUrl: imageUrl || undefined,
            recipients: args.recipients.map((r) => ({
                email: r.email.trim().toLowerCase(),
                firstName: r.firstName,
                lastName: r.lastName,
                name: r.name,
                company: r.company,
            })),
            scheduledAt: args.scheduledAt,
            status: "pending",
            createdAt: now,
        });

        const jobId = await ctx.scheduler.runAt(
            args.scheduledAt,
            internal.private.googleEmail.executeScheduledBulkEmail,
            {
                scheduledBulkEmailId: id,
            },
        );

        await ctx.db.patch(id, { schedulerJobId: String(jobId) });
    },
});

export const cancelSend = mutation({
    args: { scheduledBulkEmailId: v.id("scheduledBulkEmails") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const row = await ctx.db.get(args.scheduledBulkEmailId);
        if (!row || row.organizationId !== orgId || row.userId !== userId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Scheduled send not found" });
        }
        if (row.status !== "pending") {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Only pending sends can be cancelled" });
        }
        if (row.schedulerJobId) {
            await ctx.scheduler.cancel(row.schedulerJobId as Id<"_scheduled_functions">);
        }
        await ctx.db.patch(args.scheduledBulkEmailId, {
            status: "cancelled",
            completedAt: Date.now(),
        });
    },
});

export const listMyUpcoming = query({
    args: {},
    handler: async (ctx) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "read");
        const rows = await ctx.db
            .query("scheduledBulkEmails")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", userId),
            )
            .collect();
        return rows
            .filter((r) => r.status === "pending")
            .sort((a, b) => a.scheduledAt - b.scheduledAt)
            .slice(0, 50)
            .map((r) => ({
                _id: r._id,
                scheduledAt: r.scheduledAt,
                internalTitle: r.internalTitle,
                subject: r.subject,
                recipientCount: r.recipients.length,
                status: r.status,
            }));
    },
});

export const getForExecution = internalQuery({
    args: { scheduledBulkEmailId: v.id("scheduledBulkEmails") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.scheduledBulkEmailId);
    },
});

export const markProcessing = internalMutation({
    args: { scheduledBulkEmailId: v.id("scheduledBulkEmails") },
    handler: async (ctx, args) => {
        const row = await ctx.db.get(args.scheduledBulkEmailId);
        if (!row || row.status !== "pending") return { ok: false as const };
        await ctx.db.patch(args.scheduledBulkEmailId, { status: "processing" });
        return { ok: true as const };
    },
});

export const markCompleted = internalMutation({
    args: {
        scheduledBulkEmailId: v.id("scheduledBulkEmails"),
        sent: v.number(),
        failed: v.array(v.object({ email: v.string(), error: v.string() })),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.scheduledBulkEmailId, {
            status: "completed",
            completedAt: Date.now(),
            sentCount: args.sent,
            failedCount: args.failed.length,
        });
    },
});

export const markFailed = internalMutation({
    args: { scheduledBulkEmailId: v.id("scheduledBulkEmails"), error: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.scheduledBulkEmailId, {
            status: "failed",
            completedAt: Date.now(),
            lastError: args.error.slice(0, 2000),
        });
    },
});
