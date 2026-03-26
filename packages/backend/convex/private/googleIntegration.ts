import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCrmPermission, requireOrgIdentity } from "./_crmAuth";
import { getValidGoogleAccessToken } from "../lib/googleAccessToken";

export const getConnection = query({
    args: {},
    handler: async (ctx) => {
        const { orgId, userId } = await requireOrgIdentity(ctx);
        return await ctx.db
            .query("crmGoogleConnections")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", userId),
            )
            .unique();
    },
});

export const disconnectGoogle = mutation({
    args: {},
    handler: async (ctx) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const existing = await ctx.db
            .query("crmGoogleConnections")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", userId),
            )
            .unique();
        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const connectStub = mutation({
    args: { email: v.string(), secretName: v.string() },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const now = Date.now();
        const existing = await ctx.db
            .query("crmGoogleConnections")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", userId),
            )
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                secretName: args.secretName,
                updatedAt: now,
            });
            return existing._id;
        }
        return await ctx.db.insert("crmGoogleConnections", {
            organizationId: orgId,
            userId,
            email: args.email,
            secretName: args.secretName,
            createdAt: now,
            updatedAt: now,
        });
    },
});

export const createCalendarEventDraft = mutation({
    args: { title: v.string(), startsAt: v.number() },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireOrgIdentity(ctx);
        const conn = await ctx.db
            .query("crmGoogleConnections")
            .withIndex("by_organization_id_and_user_id", (q) =>
                q.eq("organizationId", orgId).eq("userId", userId),
            )
            .unique();
        if (!conn) return { ok: false, reason: "Google not connected" };
        try {
            await getValidGoogleAccessToken(conn.secretName);
            return {
                ok: true,
                provider: "google",
                event: { title: args.title, startsAt: args.startsAt },
                hasAccessToken: true,
                organizationId: orgId,
                userId,
            };
        } catch {
            return { ok: false, reason: "Google token invalid or expired" };
        }
    },
});

