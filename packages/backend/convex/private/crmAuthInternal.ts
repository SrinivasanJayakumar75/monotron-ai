import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { getRole, roleAllows } from "./_crmAuth";

/** For Node actions: validates org member can write CRM (caller must pass identity-derived ids). */
export const assertCrmWrite = internalQuery({
    args: { organizationId: v.string(), userId: v.string() },
    handler: async (ctx, args) => {
        const role = await getRole(ctx, args.organizationId, args.userId);
        if (!roleAllows(role, "write")) {
            throw new Error("Insufficient CRM permissions to send email");
        }
        return true;
    },
});
