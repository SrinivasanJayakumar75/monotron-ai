import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { BULK_EMAIL_TEMPLATES, BULK_EMAIL_TEMPLATE_LIST } from "../lib/bulkEmailTemplates";
import { requireCrmPermission } from "./_crmAuth";

export const listTemplates = query({
    args: {},
    handler: async (ctx) => {
        await requireCrmPermission(ctx, "read");
        return BULK_EMAIL_TEMPLATE_LIST.map((t) => {
            const meta = BULK_EMAIL_TEMPLATES[t.id];
            return {
                id: t.id,
                label: t.label,
                description: meta.description,
                category: meta.category,
                badge: "badge" in meta ? meta.badge : undefined,
                theme: meta.theme,
            };
        });
    },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Fills merge fields for bulk email. Leads often have only `name` set; split gives sensible `first_name` / `last_name`.
 * If explicit first or last is set, those win and we do not parse `displayNameField`.
 */
function namePartsForBulkMerge(displayNameField: string, firstExplicit: string, lastExplicit: string): {
    firstName?: string;
    lastName?: string;
    name?: string;
} {
    const display = displayNameField.trim();
    const fe = firstExplicit.trim();
    const le = lastExplicit.trim();
    const fullName = display || [fe, le].filter(Boolean).join(" ").trim() || undefined;
    if (fe || le) {
        return {
            firstName: fe || undefined,
            lastName: le || undefined,
            name: fullName,
        };
    }
    if (!display) {
        return { name: fullName, firstName: undefined, lastName: undefined };
    }
    const parts = display.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { name: fullName, firstName: undefined, lastName: undefined };
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: undefined, name: fullName };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
        name: fullName,
    };
}

/** Leads and contacts that have a valid email, deduped by address (contact overwrites lead for same email). */
export const listCrmRecipientsForBulkEmail = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const [leads, contacts, accounts] = await Promise.all([
            ctx.db.query("leads").withIndex("by_organization_id", (q) => q.eq("organizationId", orgId)).collect(),
            ctx.db.query("contacts").withIndex("by_organization_id", (q) => q.eq("organizationId", orgId)).collect(),
            ctx.db.query("accounts").withIndex("by_organization_id", (q) => q.eq("organizationId", orgId)).collect(),
        ]);
        const accountNameById = new Map(accounts.map((a) => [a._id, a.name]));

        type Row = {
            email: string;
            firstName?: string;
            lastName?: string;
            name?: string;
            company?: string;
            source: "lead" | "contact";
            recordId: string;
        };
        const byEmail = new Map<string, Row>();

        for (const L of leads) {
            const raw = (L.email ?? "").trim().toLowerCase();
            if (!raw || !EMAIL_RE.test(raw)) continue;
            const parts = namePartsForBulkMerge(L.name ?? "", L.firstName ?? "", L.lastName ?? "");
            byEmail.set(raw, {
                email: raw,
                firstName: parts.firstName,
                lastName: parts.lastName,
                name: parts.name,
                company: (L.company ?? "").trim() || undefined,
                source: "lead",
                recordId: String(L._id),
            });
        }

        for (const C of contacts) {
            const raw = (C.email ?? "").trim().toLowerCase();
            if (!raw || !EMAIL_RE.test(raw)) continue;
            const parts = namePartsForBulkMerge("", C.firstName ?? "", C.lastName ?? "");
            const companyName = C.accountId ? accountNameById.get(C.accountId) : undefined;
            byEmail.set(raw, {
                email: raw,
                firstName: parts.firstName,
                lastName: parts.lastName,
                name: parts.name,
                company: companyName,
                source: "contact",
                recordId: String(C._id),
            });
        }

        return [...byEmail.values()].sort((a, b) => {
            const an = (a.name ?? a.email).toLowerCase();
            const bn = (b.name ?? b.email).toLowerCase();
            if (an !== bn) return an.localeCompare(bn);
            return a.email.localeCompare(b.email);
        });
    },
});

/** Convex storage upload for bulk email hero images (client POSTs file to returned URL). */
export const generateBulkCampaignImageUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireCrmPermission(ctx, "write");
        return await ctx.storage.generateUploadUrl();
    },
});

/** Signed URL for previewing an uploaded campaign image in the composer. */
export const getCampaignImageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args): Promise<string | null> => {
        await requireCrmPermission(ctx, "read");
        return await ctx.storage.getUrl(args.storageId);
    },
});
