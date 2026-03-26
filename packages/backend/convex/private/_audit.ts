import type { MutationCtx } from "../_generated/server";

type AuditAction = "create" | "update" | "delete" | "stage_change" | "link" | "status_change";

export async function writeAuditEvent(
    ctx: MutationCtx,
    input: {
        organizationId: string;
        userId: string;
        entityType: string;
        entityId: string;
        action: AuditAction;
        changes?: string;
    },
) {
    const auditId = await ctx.db.insert("auditEvents", {
        organizationId: input.organizationId,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        changes: input.changes,
        createdAt: Date.now(),
    });
    const subscriptions = await ctx.db
        .query("crmWebhookSubscriptions")
        .withIndex("by_organization_id", (q) => q.eq("organizationId", input.organizationId))
        .collect();
    for (const subscription of subscriptions) {
        if (!subscription.active) continue;
        const eventType = `crm.${input.entityType}.${input.action}`;
        if (subscription.eventTypes.length > 0 && !subscription.eventTypes.includes(eventType)) continue;
        await ctx.db.insert("crmWebhookEvents", {
            organizationId: input.organizationId,
            subscriptionId: subscription._id,
            eventType,
            payload: JSON.stringify({
                auditId,
                entityType: input.entityType,
                entityId: input.entityId,
                action: input.action,
                changes: input.changes,
            }),
            status: "pending",
            createdAt: Date.now(),
        });
    }
}

