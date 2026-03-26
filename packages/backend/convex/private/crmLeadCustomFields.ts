import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";

const fieldTypeValidator = v.union(
    v.literal("text"),
    v.literal("textarea"),
    v.literal("number"),
    v.literal("date"),
    v.literal("select"),
    v.literal("checkbox"),
);

async function requireOrgId(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
        throw new ConvexError({ code: "UNAUTHORIZED", message: "Identity not found" });
    }
    const orgId = (identity as { orgId?: string }).orgId as string;
    if (!orgId) {
        throw new ConvexError({ code: "UNAUTHORIZED", message: "Organization not found" });
    }
    return orgId;
}

function slugKey(label: string): string {
    const base = label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40);
    return base || "field";
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const orgId = await requireOrgId(ctx);
        const fields = await ctx.db
            .query("crmLeadCustomFields")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
        return fields.sort((a, b) => a.sortOrder - b.sortOrder);
    },
});

export const create = mutation({
    args: {
        label: v.string(),
        fieldType: fieldTypeValidator,
        selectOptions: v.optional(v.array(v.string())),
        required: v.boolean(),
    },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const label = args.label.trim();
        if (!label) {
            throw new ConvexError({ code: "BAD_REQUEST", message: "Label is required" });
        }
        if (args.fieldType === "select") {
            const opts = args.selectOptions?.filter((o) => o.trim());
            if (!opts?.length) {
                throw new ConvexError({
                    code: "BAD_REQUEST",
                    message: "Select fields need at least one option",
                });
            }
        }

        const existing = await ctx.db
            .query("crmLeadCustomFields")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
        const maxOrder = existing.reduce((m, f) => Math.max(m, f.sortOrder), -1);

        let baseKey = slugKey(label);
        let key = baseKey;
        let n = 1;
        while (existing.some((f) => f.key === key)) {
            key = `${baseKey}_${n++}`;
        }

        return await ctx.db.insert("crmLeadCustomFields", {
            organizationId: orgId,
            key,
            label,
            fieldType: args.fieldType,
            selectOptions: args.selectOptions?.map((s) => s.trim()).filter(Boolean),
            required: args.required,
            sortOrder: maxOrder + 1,
            createdAt: Date.now(),
        });
    },
});

export const update = mutation({
    args: {
        fieldId: v.id("crmLeadCustomFields"),
        label: v.optional(v.string()),
        fieldType: v.optional(fieldTypeValidator),
        selectOptions: v.optional(v.array(v.string())),
        required: v.optional(v.boolean()),
        sortOrder: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const field = await ctx.db.get(args.fieldId);
        if (!field || field.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Field not found" });
        }

        const patch: Record<string, unknown> = {};
        if (args.label !== undefined) {
            const label = args.label.trim();
            if (!label) {
                throw new ConvexError({ code: "BAD_REQUEST", message: "Label is required" });
            }
            patch.label = label;
        }
        if (args.fieldType !== undefined) {
            patch.fieldType = args.fieldType;
            if (args.fieldType !== "select") {
                patch.selectOptions = undefined;
            }
        }
        if (args.selectOptions !== undefined) {
            patch.selectOptions = args.selectOptions.map((s) => s.trim()).filter(Boolean);
        }
        if (args.required !== undefined) {
            patch.required = args.required;
        }
        if (args.sortOrder !== undefined) {
            patch.sortOrder = args.sortOrder;
        }

        const nextType = (args.fieldType ?? field.fieldType) as typeof field.fieldType;
        const nextOpts = (args.selectOptions ?? field.selectOptions) as string[] | undefined;
        if (nextType === "select" && (!nextOpts || nextOpts.length === 0)) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Select fields need at least one option",
            });
        }

        await ctx.db.patch(args.fieldId, patch);
    },
});

export const remove = mutation({
    args: { fieldId: v.id("crmLeadCustomFields") },
    handler: async (ctx, args) => {
        const orgId = await requireOrgId(ctx);
        const field = await ctx.db.get(args.fieldId);
        if (!field || field.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Field not found" });
        }

        const fieldKey = field.key;
        const leads = await ctx.db
            .query("leads")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();

        for (const lead of leads) {
            const cv = lead.customValues;
            if (!cv || !(fieldKey in cv)) continue;
            const next = { ...cv };
            delete next[fieldKey];
            const keys = Object.keys(next);
            await ctx.db.patch(lead._id, {
                customValues: keys.length ? next : undefined,
            });
        }

        await ctx.db.delete(args.fieldId);
    },
});
