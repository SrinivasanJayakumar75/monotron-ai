import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

function normalizeDomain(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
        throw new ConvexError({
            code: "INVALID_INPUT",
            message: "Domain is required",
        });
    }
    let withScheme = trimmed;
    if (!/^https?:\/\//i.test(withScheme)) {
        withScheme = `https://${withScheme}`;
    }
    let hostname: string;
    try {
        hostname = new URL(withScheme).hostname.toLowerCase();
    } catch {
        throw new ConvexError({
            code: "INVALID_INPUT",
            message: "Invalid website URL or domain",
        });
    }
    if (!hostname || hostname.length > 253) {
        throw new ConvexError({
            code: "INVALID_INPUT",
            message: "Invalid website URL or domain",
        });
    }
    return hostname.replace(/^www\./, "");
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }
        const orgId = identity.orgId as string;
        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        return await ctx.db
            .query("analyticsSites")
            .withIndex("by_organization_id", (q) =>
                q.eq("organizationId", orgId)
            )
            .collect();
    },
});

export const add = mutation({
    args: {
        domainInput: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }
        const orgId = identity.orgId as string;
        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const domain = normalizeDomain(args.domainInput);

        const existing = await ctx.db
            .query("analyticsSites")
            .withIndex("by_organization_id", (q) =>
                q.eq("organizationId", orgId)
            )
            .collect();

        if (existing.some((s) => s.domain === domain)) {
            throw new ConvexError({
                code: "DUPLICATE",
                message: "This domain is already added",
            });
        }

        const ingestKey = crypto.randomUUID();

        const id = await ctx.db.insert("analyticsSites", {
            organizationId: orgId,
            domain,
            ingestKey,
            createdAt: Date.now(),
        });

        return id;
    },
});

export const remove = mutation({
    args: {
        siteId: v.id("analyticsSites"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }
        const orgId = identity.orgId as string;
        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const site = await ctx.db.get(args.siteId);
        if (!site || site.organizationId !== orgId) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Site not found",
            });
        }

        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .collect();

        for (const row of sessions) {
            await ctx.db.delete(row._id);
        }

        await ctx.db.delete(args.siteId);
    },
});

export const stats = query({
    args: {
        siteId: v.id("analyticsSites"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }
        const orgId = identity.orgId as string;
        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const site = await ctx.db.get(args.siteId);
        if (!site || site.organizationId !== orgId) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Site not found",
            });
        }

        const sessions = await ctx.db
            .query("analyticsSessions")
            .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
            .collect();

        const visitors = sessions.length;
        const totalDuration = sessions.reduce((acc, s) => acc + s.durationMs, 0);
        const avgDurationMs = visitors === 0 ? 0 : Math.round(totalDuration / visitors);

        const countryCounts = new Map<string, number>();
        for (const s of sessions) {
            const c = s.country ?? "Unknown";
            countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
        }

        const byCountry = Array.from(countryCounts.entries())
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count);

        return {
            site,
            visitors,
            avgDurationMs,
            byCountry,
        };
    },
});
