import { query } from "../_generated/server";
import { requireCrmPermission } from "./_crmAuth";

function escapeCsv(v: string) {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
}

function toCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]!);
    return [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => escapeCsv(String(r[h] ?? ""))).join(",")),
    ].join("\n");
}

export const exportAll = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const [leads, deals, activities] = await Promise.all([
            ctx.db.query("leads").withIndex("by_organization_id", (q) => q.eq("organizationId", orgId)).collect(),
            ctx.db.query("deals").withIndex("by_organization_id", (q) => q.eq("organizationId", orgId)).collect(),
            ctx.db
                .query("activities")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
                .collect(),
        ]);
        return {
            generatedAt: Date.now(),
            leadsCsv: toCsv(
                leads.map((x) => ({
                    id: x._id,
                    name: x.name,
                    email: x.email,
                    phone: x.phone,
                    whatsapp: x.whatsapp,
                    stage: x.stage,
                })),
            ),
            dealsCsv: toCsv(
                deals.map((x) => ({
                    id: x._id,
                    name: x.name,
                    amount: x.amount,
                    stage: x.stage,
                    closeDate: x.closeDate,
                })),
            ),
            activitiesCsv: toCsv(
                activities.map((x) => ({ id: x._id, type: x.type, subject: x.subject, status: x.status })),
            ),
        };
    },
});

