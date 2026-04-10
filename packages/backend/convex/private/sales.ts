import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

function utcMidnightYmd(y: number, m: number, d: number): number {
    return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
}

/** Parse "YYYY-MM-DD" to UTC midnight ms. */
export function parseSaleDateArg(iso: string): number {
    const parts = iso.trim().split("-").map((p) => Number(p));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid sale date" });
    }
    const [y, m, d] = parts as [number, number, number];
    if (m < 1 || m > 12 || d < 1 || d > 31) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid sale date" });
    }
    return utcMidnightYmd(y, m, d);
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const rows = await ctx.db
            .query("crmSalesEntries")
            .withIndex("by_org_and_sale_date", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
        return rows;
    },
});

const reportGrain = v.union(v.literal("day"), v.literal("month"), v.literal("year"));

export const getTimeSeriesReport = query({
    args: {
        grain: reportGrain,
        /** Day: number of days (7–90). Month: months (3–24). Year: years (2–10). */
        periodCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");

        const now = new Date();
        const uy = now.getUTCFullYear();
        const um = now.getUTCMonth();
        const ud = now.getUTCDate();

        type Bucket = { label: string; start: number; end: number };
        let buckets: Bucket[] = [];

        if (args.grain === "day") {
            const n = Math.min(90, Math.max(7, args.periodCount ?? 30));
            for (let i = n - 1; i >= 0; i--) {
                const d = new Date(Date.UTC(uy, um, ud - i, 0, 0, 0, 0));
                const ys = d.getUTCFullYear();
                const ms = d.getUTCMonth() + 1;
                const ds = d.getUTCDate();
                const start = utcMidnightYmd(ys, ms, ds);
                const end = start + 24 * 60 * 60 * 1000 - 1;
                buckets.push({
                    label: `${ys}-${String(ms).padStart(2, "0")}-${String(ds).padStart(2, "0")}`,
                    start,
                    end,
                });
            }
        } else if (args.grain === "month") {
            const n = Math.min(24, Math.max(3, args.periodCount ?? 12));
            for (let i = n - 1; i >= 0; i--) {
                const ref = new Date(Date.UTC(uy, um - i, 1, 0, 0, 0, 0));
                const ys = ref.getUTCFullYear();
                const ms = ref.getUTCMonth();
                const start = Date.UTC(ys, ms, 1, 0, 0, 0, 0);
                const end = Date.UTC(ys, ms + 1, 0, 23, 59, 59, 999);
                buckets.push({
                    label: ref.toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" }),
                    start,
                    end,
                });
            }
        } else {
            const n = Math.min(10, Math.max(2, args.periodCount ?? 5));
            for (let i = n - 1; i >= 0; i--) {
                const year = uy - i;
                const start = Date.UTC(year, 0, 1, 0, 0, 0, 0);
                const end = Date.UTC(year, 11, 31, 23, 59, 59, 999);
                buckets.push({
                    label: String(year),
                    start,
                    end,
                });
            }
        }

        if (buckets.length === 0) {
            return { grain: args.grain, series: [], totalInRange: 0, entryCount: 0 };
        }

        const rangeStart = buckets[0]!.start;
        const rangeEnd = buckets[buckets.length - 1]!.end;

        const entries = await ctx.db
            .query("crmSalesEntries")
            .withIndex("by_org_and_sale_date", (q) =>
                q.eq("organizationId", orgId).gte("saleDate", rangeStart).lte("saleDate", rangeEnd),
            )
            .collect();

        const series = buckets.map((b) => {
            let total = 0;
            let count = 0;
            for (const e of entries) {
                if (e.saleDate >= b.start && e.saleDate <= b.end) {
                    total += e.amount;
                    count += 1;
                }
            }
            return { label: b.label, total, count };
        });

        const totalInRange = entries.reduce((s, e) => s + e.amount, 0);
        return {
            grain: args.grain,
            series,
            totalInRange,
            entryCount: entries.length,
            rangeStart,
            rangeEnd,
        };
    },
});

export const create = mutation({
    args: {
        saleDate: v.string(),
        amount: v.number(),
        soldTo: v.optional(v.string()),
        customerIndustry: v.optional(v.string()),
        customerName: v.optional(v.string()),
        companyName: v.optional(v.string()),
        customerContact: v.optional(v.string()),
        customerEmail: v.optional(v.string()),
        customerWhatsapp: v.optional(v.string()),
        notes: v.optional(v.string()),
        dealId: v.optional(v.id("deals")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        if (!Number.isFinite(args.amount)) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid amount" });
        }

        const saleDate = parseSaleDateArg(args.saleDate);

        if (args.dealId) {
            const deal = await ctx.db.get(args.dealId);
            if (!deal || deal.organizationId !== orgId) {
                throw new ConvexError({ code: "NOT_FOUND", message: "Deal not found" });
            }
        }
        if (args.accountId) {
            const acc = await ctx.db.get(args.accountId);
            if (!acc || acc.organizationId !== orgId) {
                throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });
            }
        }

        const trim = (s: string | undefined) => s?.trim() || undefined;
        const id = await ctx.db.insert("crmSalesEntries", {
            organizationId: orgId,
            saleDate,
            amount: args.amount,
            soldTo: trim(args.soldTo),
            customerIndustry: trim(args.customerIndustry),
            customerName: trim(args.customerName),
            companyName: trim(args.companyName),
            customerContact: trim(args.customerContact),
            customerEmail: trim(args.customerEmail),
            customerWhatsapp: trim(args.customerWhatsapp),
            notes: trim(args.notes),
            dealId: args.dealId,
            accountId: args.accountId,
            createdByUserId: userId,
            createdAt: Date.now(),
        });

        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "sales_entry",
            entityId: String(id),
            action: "create",
        });

        return id;
    },
});

export const update = mutation({
    args: {
        entryId: v.id("crmSalesEntries"),
        saleDate: v.string(),
        amount: v.number(),
        soldTo: v.optional(v.string()),
        customerIndustry: v.optional(v.string()),
        customerName: v.optional(v.string()),
        companyName: v.optional(v.string()),
        customerContact: v.optional(v.string()),
        customerEmail: v.optional(v.string()),
        customerWhatsapp: v.optional(v.string()),
        notes: v.optional(v.string()),
        dealId: v.optional(v.id("deals")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const row = await ctx.db.get(args.entryId);
        if (!row || row.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Entry not found" });
        }

        if (!Number.isFinite(args.amount)) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid amount" });
        }

        const saleDate = parseSaleDateArg(args.saleDate);

        if (args.dealId) {
            const deal = await ctx.db.get(args.dealId);
            if (!deal || deal.organizationId !== orgId) {
                throw new ConvexError({ code: "NOT_FOUND", message: "Deal not found" });
            }
        }
        if (args.accountId) {
            const acc = await ctx.db.get(args.accountId);
            if (!acc || acc.organizationId !== orgId) {
                throw new ConvexError({ code: "NOT_FOUND", message: "Account not found" });
            }
        }

        const trim = (s: string | undefined) => s?.trim() || undefined;
        await ctx.db.patch(args.entryId, {
            saleDate,
            amount: args.amount,
            soldTo: trim(args.soldTo),
            customerIndustry: trim(args.customerIndustry),
            customerName: trim(args.customerName),
            companyName: trim(args.companyName),
            customerContact: trim(args.customerContact),
            customerEmail: trim(args.customerEmail),
            customerWhatsapp: trim(args.customerWhatsapp),
            notes: trim(args.notes),
            dealId: args.dealId,
            accountId: args.accountId,
        });

        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "sales_entry",
            entityId: String(args.entryId),
            action: "update",
        });
    },
});

export const remove = mutation({
    args: { entryId: v.id("crmSalesEntries") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const row = await ctx.db.get(args.entryId);
        if (!row || row.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Entry not found" });
        }
        await ctx.db.delete(args.entryId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "sales_entry",
            entityId: String(args.entryId),
            action: "delete",
        });
    },
});
