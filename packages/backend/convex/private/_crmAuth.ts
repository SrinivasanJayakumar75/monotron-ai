import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export type CrmRole = "admin" | "agent" | "viewer";
export type CrmPermission = "read" | "write" | "admin";

export async function requireOrgIdentity(ctx: Ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHORIZED", message: "Identity not found" });
    const orgId = identity.orgId as string | undefined;
    if (!orgId) throw new ConvexError({ code: "UNAUTHORIZED", message: "Organization not found" });
    const userId = (identity.subject ?? identity.tokenIdentifier ?? "") as string;
    if (!userId) throw new ConvexError({ code: "UNAUTHORIZED", message: "User not found" });
    return { orgId, userId };
}

export async function getRole(ctx: Ctx, organizationId: string, userId: string): Promise<CrmRole> {
    const row = await ctx.db
        .query("crmUserRoles")
        .withIndex("by_organization_id_and_user_id", (q) =>
            q.eq("organizationId", organizationId).eq("userId", userId),
        )
        .unique();
    return (row?.role as CrmRole | undefined) ?? "admin";
}

export function roleAllows(role: CrmRole, permission: CrmPermission) {
    if (permission === "read") return true;
    if (permission === "write") return role === "admin" || role === "agent";
    return role === "admin";
}

export async function requireCrmPermission(ctx: Ctx, permission: CrmPermission) {
    const { orgId, userId } = await requireOrgIdentity(ctx);
    const role = await getRole(ctx, orgId, userId);
    if (!roleAllows(role, permission)) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Insufficient CRM permissions" });
    }
    return { orgId, userId, role };
}

