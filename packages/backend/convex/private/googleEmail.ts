"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { getValidGoogleAccessToken } from "../lib/googleAccessToken";
import { mergeBulkEmailTemplate } from "../lib/bulkEmailTemplates";
import { internal } from "../_generated/api";

const MAX_BULK = 1000;
const BETWEEN_SEND_MS = 120;
const SUBJECT_MAX = 500;
const BODY_MAX = 100_000;

function toBase64Url(input: string): string {
    return Buffer.from(input, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderHtmlBody(body: string, imageUrl?: string) {
    const textHtml = escapeHtml(body).replace(/\r?\n/g, "<br/>");
    const safeImage =
        imageUrl && /^https?:\/\//i.test(imageUrl.trim())
            ? `<div style="margin-top:16px"><img src="${escapeHtml(imageUrl.trim())}" alt="Campaign image" style="max-width:100%;height:auto;border-radius:8px;" /></div>`
            : "";
    return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">${textHtml}${safeImage}</div>`;
}

const recipientValidator = v.object({
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
});

export const sendBulkEmails = action({
    args: {
        subject: v.string(),
        body: v.string(),
        imageUrl: v.optional(v.string()),
        recipients: v.array(recipientValidator),
    },
    handler: async (
        ctx,
        args,
    ): Promise<{ sent: number; failed: { email: string; error: string }[] }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const orgId = identity.orgId as string | undefined;
        const userId = (identity.subject ?? identity.tokenIdentifier ?? "") as string;
        if (!orgId || !userId) throw new Error("Missing org/user");

        await ctx.runQuery(internal.private.crmAuthInternal.assertCrmWrite, {
            organizationId: orgId,
            userId,
        });

        const subjectTpl = args.subject.trim();
        const bodyTpl = args.body.trim();
        if (!subjectTpl) {
            throw new Error("Subject is required");
        }
        if (subjectTpl.length > SUBJECT_MAX) {
            throw new Error(`Subject must be at most ${SUBJECT_MAX} characters`);
        }
        if (!bodyTpl) {
            throw new Error("Message body is required");
        }
        if (bodyTpl.length > BODY_MAX) {
            throw new Error("Message is too long");
        }
        if (args.recipients.length === 0) {
            throw new Error("Add at least one recipient");
        }
        if (args.recipients.length > MAX_BULK) {
            throw new Error(`Maximum ${MAX_BULK} recipients per batch`);
        }

        const conn = await ctx.runQuery(internal.system.googleIntegration.getConnectionByOrgAndUser, {
            organizationId: orgId,
            userId,
        });
        if (!conn) throw new Error("Google not connected");

        const accessToken = await getValidGoogleAccessToken(conn.secretName);

        const template = { subject: subjectTpl, body: bodyTpl };
        const imageUrl = args.imageUrl?.trim() ? args.imageUrl.trim() : undefined;
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
            throw new Error("Image URL must start with http:// or https://");
        }
        const failed: { email: string; error: string }[] = [];
        const successes: { to: string; subject: string; body: string }[] = [];

        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (const r of args.recipients) {
            const to = r.email.trim().toLowerCase();
            if (!emailRe.test(to)) {
                failed.push({ email: r.email, error: "Invalid email" });
                continue;
            }

            const { subject, body } = mergeBulkEmailTemplate(template, {
                email: to,
                firstName: r.firstName,
                lastName: r.lastName,
                name: r.name,
                company: r.company,
            });
            const htmlBody = renderHtmlBody(body, imageUrl);

            const rawMessage = [
                `From: ${conn.email ?? "me"}`,
                `To: ${to}`,
                `Subject: ${subject}`,
                "MIME-Version: 1.0",
                "Content-Type: text/html; charset=UTF-8",
                "",
                htmlBody,
            ].join("\r\n");

            try {
                const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ raw: toBase64Url(rawMessage) }),
                });
                const payload = (await response.json()) as { id?: string; error?: { message?: string } };
                if (!response.ok) {
                    failed.push({
                        email: to,
                        error: payload?.error?.message ?? "Gmail send failed",
                    });
                } else {
                    successes.push({ to, subject, body });
                }
            } catch (e) {
                failed.push({
                    email: to,
                    error: e instanceof Error ? e.message : "Network error",
                });
            }

            await sleep(BETWEEN_SEND_MS);
        }

        if (successes.length > 0) {
            await ctx.runMutation(internal.system.googleIntegration.logBulkSentEmailActivities, {
                organizationId: orgId,
                entries: successes,
            });
        }

        return { sent: successes.length, failed };
    },
});
