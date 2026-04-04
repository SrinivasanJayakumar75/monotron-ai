import { mutation, query, type MutationCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { requireCrmPermission } from "./_crmAuth";
import { writeAuditEvent } from "./_audit";

const leadStageValidator = v.union(
    v.literal("New"),
    v.literal("Contacted"),
    v.literal("Qualified"),
    v.literal("Lost"),
    v.literal("Proposal"),
    v.literal("Negotiation"),
    v.literal("Closed Won"),
    v.literal("Closed Lost"),
);

const customValuesValidator = v.optional(v.record(v.string(), v.string()));

function optStr(s: string | undefined): string | undefined {
    const t = s?.trim();
    return t ? t : undefined;
}

function buildDisplayName(args: {
    salutation?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
}): string {
    const last = args.lastName?.trim();
    const first = args.firstName?.trim();
    const sal = args.salutation?.trim();
    if (last || first || sal) {
        return [sal, first, last].filter(Boolean).join(" ").trim();
    }
    const n = args.name?.trim();
    if (n) return n;
    return "";
}

function normalizeCustomValues(
    input: Record<string, string> | undefined,
): Record<string, string> | undefined {
    if (!input) return undefined;
    const out: Record<string, string> = {};
    for (const [key, raw] of Object.entries(input)) {
        const trimmed = raw.trim();
        if (trimmed !== "") out[key] = trimmed;
    }
    return Object.keys(out).length ? out : undefined;
}

function mergeCustomValues(
    existing: Record<string, string> | undefined,
    incoming: Record<string, string> | undefined,
): Record<string, string> | undefined {
    if (incoming === undefined) return existing;
    const merged = { ...(existing ?? {}) };
    for (const [key, raw] of Object.entries(incoming)) {
        const trimmed = raw.trim();
        if (trimmed === "") delete merged[key];
        else merged[key] = trimmed;
    }
    return Object.keys(merged).length ? merged : undefined;
}

function validateCustomValuesAgainstDefs(
    defs: Doc<"crmLeadCustomFields">[],
    values: Record<string, string> | undefined,
) {
    const map = values ?? {};
    for (const d of defs) {
        const raw = map[d.key];
        if (d.required) {
            if (raw === undefined || raw.trim() === "") {
                throw new ConvexError({
                    code: "BAD_REQUEST",
                    message: `Custom field "${d.label}" is required`,
                });
            }
        }
        if (raw === undefined || raw.trim() === "") continue;
        const val = raw.trim();
        switch (d.fieldType) {
            case "number":
                if (Number.isNaN(Number(val))) {
                    throw new ConvexError({
                        code: "BAD_REQUEST",
                        message: `Custom field "${d.label}" must be a number`,
                    });
                }
                break;
            case "select": {
                const opts = d.selectOptions ?? [];
                if (!opts.includes(val)) {
                    throw new ConvexError({
                        code: "BAD_REQUEST",
                        message: `Invalid option for "${d.label}"`,
                    });
                }
                break;
            }
            case "checkbox":
                if (val !== "true" && val !== "false") {
                    throw new ConvexError({
                        code: "BAD_REQUEST",
                        message: `Custom field "${d.label}" must be checked or unchecked`,
                    });
                }
                break;
            default:
                break;
        }
    }
}

async function listLeadCustomFieldDefs(ctx: MutationCtx, orgId: string) {
    return await ctx.db
        .query("crmLeadCustomFields")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
        .collect();
}

const createArgs = {
    name: v.optional(v.string()),
    salutation: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    company: v.optional(v.string()),
    stage: v.optional(leadStageValidator),
    leadSource: v.optional(v.string()),
    title: v.optional(v.string()),
    industry: v.optional(v.string()),
    organizationOffer: v.optional(v.string()),
    sellToDescription: v.optional(v.string()),
    website: v.optional(v.string()),
    g2CapterraNotes: v.optional(v.string()),
    domainAge: v.optional(v.string()),
    employeeCount: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    headline: v.optional(v.string()),
    emailValidation: v.optional(v.string()),
    zohoAssessmentCompleted: v.optional(v.boolean()),
    linkedInConnections: v.optional(v.string()),
    linkedInFollowers: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    referralUrl: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    conversion: v.optional(v.string()),
    referredOut: v.optional(v.boolean()),
    customValues: customValuesValidator,
    address: v.optional(v.string()),
    assignedToUserId: v.optional(v.string()),
    assignedToName: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    leadScore: v.optional(v.number()),
    expectedDealValue: v.optional(v.number()),
    productInterest: v.optional(v.string()),
};

export const list = query({
    args: {
        stage: v.optional(leadStageValidator),
    },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        if (args.stage !== undefined) {
            return await ctx.db
                .query("leads")
                .withIndex("by_organization_id_and_stage", (q) =>
                    q.eq("organizationId", orgId).eq("stage", args.stage!),
                )
                .order("desc")
                .collect();
        }
        return await ctx.db
            .query("leads")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .order("desc")
            .collect();
    },
});

export const getOne = query({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            return null;
        }
        return lead;
    },
});

export const create = mutation({
    args: createArgs,
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");

        const displayName = buildDisplayName({
            salutation: args.salutation,
            firstName: args.firstName,
            lastName: args.lastName,
            name: args.name,
        });
        if (!displayName) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Lead name is required",
            });
        }

        const defs = await listLeadCustomFieldDefs(ctx, orgId);
        const normalizedCustom = normalizeCustomValues(args.customValues);
        validateCustomValuesAgainstDefs(defs, normalizedCustom);

        const leadId = await ctx.db.insert("leads", {
            organizationId: orgId,
            name: displayName,
            email: optStr(args.email),
            phone: optStr(args.phone),
            whatsapp: optStr(args.whatsapp),
            company: optStr(args.company),
            stage: args.stage ?? "New",
            leadSource: optStr(args.leadSource),
            address: optStr(args.address),
            assignedToUserId: optStr(args.assignedToUserId),
            assignedToName: optStr(args.assignedToName),
            lastContactedAt: args.lastContactedAt,
            leadScore: args.leadScore,
            expectedDealValue: args.expectedDealValue,
            productInterest: optStr(args.productInterest),
            industry: optStr(args.industry),
            organizationOffer: optStr(args.organizationOffer),
            sellToDescription: optStr(args.sellToDescription),
            website: optStr(args.website),
            g2CapterraNotes: optStr(args.g2CapterraNotes),
            domainAge: optStr(args.domainAge),
            employeeCount: optStr(args.employeeCount),
            salutation: optStr(args.salutation),
            firstName: optStr(args.firstName),
            lastName: optStr(args.lastName),
            title: optStr(args.title),
            linkedIn: optStr(args.linkedIn),
            headline: optStr(args.headline),
            emailValidation: optStr(args.emailValidation),
            zohoAssessmentCompleted: args.zohoAssessmentCompleted,
            linkedInConnections: optStr(args.linkedInConnections),
            linkedInFollowers: optStr(args.linkedInFollowers),
            utmCampaign: optStr(args.utmCampaign),
            utmMedium: optStr(args.utmMedium),
            referralUrl: optStr(args.referralUrl),
            utmTerm: optStr(args.utmTerm),
            utmContent: optStr(args.utmContent),
            ipAddress: optStr(args.ipAddress),
            conversion: optStr(args.conversion),
            referredOut: args.referredOut,
            customValues: normalizedCustom,
        });
        await ctx.db.insert("leadStageHistory", {
            organizationId: orgId,
            leadId,
            fromStage: undefined,
            toStage: args.stage ?? "New",
            changedByUserId: userId,
            changedAt: Date.now(),
        });
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "lead",
            entityId: String(leadId),
            action: "create",
        });
        return leadId;
    },
});

export const update = mutation({
    args: {
        leadId: v.id("leads"),
        ...createArgs,
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
        }

        const { leadId, ...rest } = args;
        const merged = {
            salutation: rest.salutation !== undefined ? rest.salutation : lead.salutation,
            firstName: rest.firstName !== undefined ? rest.firstName : lead.firstName,
            lastName: rest.lastName !== undefined ? rest.lastName : lead.lastName,
            name: rest.name !== undefined ? rest.name : lead.name,
        };
        const displayName = buildDisplayName(merged);
        if (!displayName) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Lead must have a name (last name or full name)",
            });
        }

        const patch: Record<string, unknown> = { name: displayName };
        if (rest.customValues !== undefined) {
            const nextCustom = mergeCustomValues(lead.customValues, rest.customValues);
            const defs = await listLeadCustomFieldDefs(ctx, orgId);
            validateCustomValuesAgainstDefs(defs, nextCustom);
            patch.customValues = nextCustom;
        }

        const assignOpt = (key: string, val: string | undefined) => {
            (patch as Record<string, string | undefined>)[key] = optStr(val);
        };

        if (rest.email !== undefined) assignOpt("email", rest.email);
        if (rest.phone !== undefined) assignOpt("phone", rest.phone);
        if (rest.whatsapp !== undefined) assignOpt("whatsapp", rest.whatsapp);
        if (rest.company !== undefined) assignOpt("company", rest.company);
        if (rest.stage !== undefined) patch.stage = rest.stage;
        if (rest.leadSource !== undefined) assignOpt("leadSource", rest.leadSource);
        if (rest.title !== undefined) assignOpt("title", rest.title);
        if (rest.industry !== undefined) assignOpt("industry", rest.industry);
        if (rest.organizationOffer !== undefined)
            assignOpt("organizationOffer", rest.organizationOffer);
        if (rest.sellToDescription !== undefined)
            assignOpt("sellToDescription", rest.sellToDescription);
        if (rest.website !== undefined) assignOpt("website", rest.website);
        if (rest.g2CapterraNotes !== undefined) assignOpt("g2CapterraNotes", rest.g2CapterraNotes);
        if (rest.domainAge !== undefined) assignOpt("domainAge", rest.domainAge);
        if (rest.employeeCount !== undefined) assignOpt("employeeCount", rest.employeeCount);
        if (rest.salutation !== undefined) assignOpt("salutation", rest.salutation);
        if (rest.firstName !== undefined) assignOpt("firstName", rest.firstName);
        if (rest.lastName !== undefined) assignOpt("lastName", rest.lastName);
        if (rest.linkedIn !== undefined) assignOpt("linkedIn", rest.linkedIn);
        if (rest.headline !== undefined) assignOpt("headline", rest.headline);
        if (rest.emailValidation !== undefined) assignOpt("emailValidation", rest.emailValidation);
        if (rest.zohoAssessmentCompleted !== undefined)
            patch.zohoAssessmentCompleted = rest.zohoAssessmentCompleted;
        if (rest.linkedInConnections !== undefined)
            assignOpt("linkedInConnections", rest.linkedInConnections);
        if (rest.linkedInFollowers !== undefined)
            assignOpt("linkedInFollowers", rest.linkedInFollowers);
        if (rest.utmCampaign !== undefined) assignOpt("utmCampaign", rest.utmCampaign);
        if (rest.utmMedium !== undefined) assignOpt("utmMedium", rest.utmMedium);
        if (rest.referralUrl !== undefined) assignOpt("referralUrl", rest.referralUrl);
        if (rest.utmTerm !== undefined) assignOpt("utmTerm", rest.utmTerm);
        if (rest.utmContent !== undefined) assignOpt("utmContent", rest.utmContent);
        if (rest.ipAddress !== undefined) assignOpt("ipAddress", rest.ipAddress);
        if (rest.conversion !== undefined) assignOpt("conversion", rest.conversion);
        if (rest.referredOut !== undefined) patch.referredOut = rest.referredOut;
        if (rest.address !== undefined) assignOpt("address", rest.address);
        if (rest.assignedToUserId !== undefined)
            (patch as Record<string, unknown>).assignedToUserId = optStr(rest.assignedToUserId);
        if (rest.assignedToName !== undefined) assignOpt("assignedToName", rest.assignedToName);
        if (rest.lastContactedAt !== undefined) patch.lastContactedAt = rest.lastContactedAt;
        if (rest.leadScore !== undefined) patch.leadScore = rest.leadScore;
        if (rest.expectedDealValue !== undefined) patch.expectedDealValue = rest.expectedDealValue;
        if (rest.productInterest !== undefined) assignOpt("productInterest", rest.productInterest);

        await ctx.db.patch(leadId, patch);
        if (rest.stage !== undefined && rest.stage !== lead.stage) {
            await ctx.db.insert("leadStageHistory", {
                organizationId: orgId,
                leadId,
                fromStage: lead.stage,
                toStage: rest.stage,
                changedByUserId: userId,
                changedAt: Date.now(),
            });
        }
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "lead",
            entityId: String(leadId),
            action: rest.stage !== undefined && rest.stage !== lead.stage ? "stage_change" : "update",
            changes: JSON.stringify(patch),
        });
    },
});

export const updateStage = mutation({
    args: {
        leadId: v.id("leads"),
        stage: leadStageValidator,
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
        }
        await ctx.db.patch(args.leadId, { stage: args.stage });
        if (lead.stage !== args.stage) {
            await ctx.db.insert("leadStageHistory", {
                organizationId: orgId,
                leadId: args.leadId,
                fromStage: lead.stage,
                toStage: args.stage,
                changedByUserId: userId,
                changedAt: Date.now(),
            });
        }
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "lead",
            entityId: String(args.leadId),
            action: "stage_change",
            changes: JSON.stringify({ from: lead.stage, to: args.stage }),
        });
    },
});

export const remove = mutation({
    args: { leadId: v.id("leads") },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const lead = await ctx.db.get(args.leadId);
        if (!lead || lead.organizationId !== orgId) {
            throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found" });
        }
        await ctx.db.delete(args.leadId);
        await writeAuditEvent(ctx, {
            organizationId: orgId,
            userId,
            entityType: "lead",
            entityId: String(args.leadId),
            action: "delete",
        });
    },
});

export const bulkRemove = mutation({
    args: { leadIds: v.array(v.id("leads")) },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        for (const leadId of args.leadIds) {
            const lead = await ctx.db.get(leadId);
            if (!lead || lead.organizationId !== orgId) continue;
            await ctx.db.delete(leadId);
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "lead",
                entityId: String(leadId),
                action: "delete",
            });
        }
    },
});

export const bulkAssign = mutation({
    args: {
        leadIds: v.array(v.id("leads")),
        /** Empty string clears assignment */
        assignedToUserId: v.string(),
        assignedToName: v.string(),
    },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const uid = optStr(args.assignedToUserId);
        const uname = optStr(args.assignedToName);
        for (const leadId of args.leadIds) {
            const lead = await ctx.db.get(leadId);
            if (!lead || lead.organizationId !== orgId) continue;
            await ctx.db.patch(leadId, {
                assignedToUserId: uid,
                assignedToName: uname,
            });
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "lead",
                entityId: String(leadId),
                action: "update",
                changes: JSON.stringify({ assignedToUserId: uid, assignedToName: uname }),
            });
        }
    },
});

export const exportLeadsCsv = query({
    args: {},
    handler: async (ctx) => {
        const { orgId } = await requireCrmPermission(ctx, "read");
        const leads = await ctx.db
            .query("leads")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
            .collect();
        const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const headers = ["name", "email", "phone", "whatsapp", "company", "stage", "leadSource"];
        const body = leads.map((l) =>
            [
                l.name,
                l.email ?? "",
                l.phone ?? "",
                l.whatsapp ?? "",
                l.company ?? "",
                l.stage,
                l.leadSource ?? "",
            ]
                .map((x) => escape(String(x)))
                .join(","),
        );
        return [headers.join(","), ...body].join("\n");
    },
});

export const importCsv = mutation({
    args: { csv: v.string() },
    handler: async (ctx, args) => {
        const { orgId, userId } = await requireCrmPermission(ctx, "write");
        const lines = args.csv.split(/\r?\n/).filter((l) => l.trim() !== "");
        if (lines.length < 2) return { imported: 0 };
        let imported = 0;
        for (const line of lines.slice(1)) {
            const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
            const name = cols[0];
            if (!name) continue;
            const email = cols[1];
            const phone = cols[2];
            let whatsapp: string | undefined;
            let company: string;
            let stage: string;
            let leadSource: string | undefined;
            if (cols.length >= 7) {
                whatsapp = cols[3];
                company = cols[4] ?? "";
                stage = cols[5] ?? "";
                leadSource = cols[6];
            } else {
                company = cols[3] ?? "";
                stage = cols[4] ?? "";
                leadSource = cols[5];
            }
            const leadId = await ctx.db.insert("leads", {
                organizationId: orgId,
                name,
                email: optStr(email),
                phone: optStr(phone),
                whatsapp: optStr(whatsapp),
                company: optStr(company),
                stage: (stage as Doc<"leads">["stage"]) || "New",
                leadSource: optStr(leadSource),
            });
            imported += 1;
            await writeAuditEvent(ctx, {
                organizationId: orgId,
                userId,
                entityType: "lead",
                entityId: String(leadId),
                action: "create",
            });
        }
        return { imported };
    },
});
