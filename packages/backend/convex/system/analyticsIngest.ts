import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getSiteByIngestKey = internalQuery({
    args: { ingestKey: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("analyticsSites")
            .withIndex("by_ingest_key", (q) =>
                q.eq("ingestKey", args.ingestKey)
            )
            .unique();
    },
});

export const ingest = internalMutation({
    args: {
        ingestKey: v.string(),
        clientSessionId: v.string(),
        path: v.optional(v.string()),
        action: v.union(
            v.literal("start"),
            v.literal("ping"),
            v.literal("end")
        ),
        durationMs: v.number(),
        country: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const site = await ctx.db
            .query("analyticsSites")
            .withIndex("by_ingest_key", (q) =>
                q.eq("ingestKey", args.ingestKey)
            )
            .unique();

        if (!site) {
            return { ok: false as const };
        }

        const existing = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_site_and_client_session", (q) =>
                q.eq("siteId", site._id).eq("clientSessionId", args.clientSessionId)
            )
            .unique();

        const now = Date.now();
        const nextDuration = Math.max(0, Math.floor(args.durationMs));
        const country =
            args.country && args.country.length <= 3
                ? args.country.toUpperCase()
                : undefined;

        if (args.action === "start") {
            if (!existing) {
                await ctx.db.insert("analyticsSessions", {
                    siteId: site._id,
                    clientSessionId: args.clientSessionId,
                    startedAt: now,
                    durationMs: nextDuration,
                    country,
                    lastPath: args.path,
                });
            } else {
                await ctx.db.patch(existing._id, {
                    durationMs: Math.max(existing.durationMs, nextDuration),
                    lastPath: args.path ?? existing.lastPath,
                    country: existing.country ?? country,
                });
            }
            return { ok: true as const };
        }

        if (existing) {
            await ctx.db.patch(existing._id, {
                durationMs: Math.max(existing.durationMs, nextDuration),
                lastPath: args.path ?? existing.lastPath,
                country: existing.country ?? country,
            });
        } else if (args.action === "ping" || args.action === "end") {
            await ctx.db.insert("analyticsSessions", {
                siteId: site._id,
                clientSessionId: args.clientSessionId,
                startedAt: now,
                durationMs: nextDuration,
                country,
                lastPath: args.path,
            });
        }

        return { ok: true as const };
    },
});
