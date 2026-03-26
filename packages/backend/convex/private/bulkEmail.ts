import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { BULK_EMAIL_TEMPLATE_LIST } from "../lib/bulkEmailTemplates";
import { requireCrmPermission } from "./_crmAuth";

const MODULE_SLUG = "bulk-email-templates";

async function findTemplateModule(ctx: any, organizationId: string) {
    const modules = await ctx.db
        .query("customCrmModules")
        .withIndex("by_organization_id", (q: any) => q.eq("organizationId", organizationId))
        .collect();
    return modules.find((m: any) => m.slug === MODULE_SLUG) ?? null;
}

async function ensureTemplateModule(ctx: any, organizationId: string) {
    const existing = await findTemplateModule(ctx, organizationId);
    if (existing) return existing;
    const id = await ctx.db.insert("customCrmModules", {
        organizationId,
        name: "Bulk Email Templates",
        slug: MODULE_SLUG,
        description: "Custom templates for bulk email campaigns",
        color: "#6366f1",
        createdAt: Date.now(),
    });
    return await ctx.db.get(id);
}

export const listTemplates = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const builtIn = BULK_EMAIL_TEMPLATE_LIST.map((t) => ({
            id: t.id,
            label: t.label,
            isCustom: false,
        }));

        const module = await findTemplateModule(ctx, orgId);
        if (!module) return builtIn;

        const rows = await ctx.db
            .query("customCrmRecords")
            .withIndex("by_module_id", (q) => q.eq("moduleId", module._id))
            .collect();

        const custom = rows
            .map((r) => {
                try {
                    const parsed = JSON.parse(r.details ?? "{}") as {
                        subject?: string;
                        body?: string;
                    };
                    if (!parsed.subject || !parsed.body) return null;
                    return {
                        id: `custom:${String(r._id)}`,
                        label: r.title,
                        subject: parsed.subject,
                        body: parsed.body,
                        isCustom: true,
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        return [...builtIn, ...custom];
    },
});

export const createTemplate = mutation({
    args: {
        label: v.string(),
        subject: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "write");
        const label = args.label.trim();
        const subject = args.subject.trim();
        const body = args.body.trim();
        if (!label) throw new ConvexError({ code: "BAD_REQUEST", message: "Template name is required" });
        if (!subject) throw new ConvexError({ code: "BAD_REQUEST", message: "Template subject is required" });
        if (!body) throw new ConvexError({ code: "BAD_REQUEST", message: "Template body is required" });

        const module = await ensureTemplateModule(ctx, orgId);
        return await ctx.db.insert("customCrmRecords", {
            organizationId: orgId,
            moduleId: module._id,
            title: label,
            status: "active",
            details: JSON.stringify({ subject, body }),
            createdAt: Date.now(),
        });
    },
});
