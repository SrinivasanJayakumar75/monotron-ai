import {httpRouter} from "convex/server";
import { createClerkClient } from "@clerk/backend";
import type {WebhookEvent} from "@clerk/backend";
import {Webhook} from "svix";
import { createHmac, timingSafeEqual } from "node:crypto";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const RAZORPAY_ACTIVE_EVENTS = new Set([
    "payment.captured",
    "payment_link.paid",
    "subscription.activated",
    "subscription.charged",
    "subscription.resumed",
]);

const RAZORPAY_INACTIVE_EVENTS = new Set([
    "payment.failed",
    "subscription.cancelled",
    "subscription.completed",
    "subscription.halted",
    "subscription.paused",
]);

function isSupportedRazorpayEvent(eventType: string): boolean {
    return RAZORPAY_ACTIVE_EVENTS.has(eventType) || RAZORPAY_INACTIVE_EVENTS.has(eventType);
}

type RazorpayEntity = {
    notes?: Record<string, unknown>;
    status?: string;
};

type RazorpayWebhookPayload = {
    event: string;
    payload?: {
        payment?: { entity?: RazorpayEntity };
        payment_link?: { entity?: RazorpayEntity };
        subscription?: { entity?: RazorpayEntity };
    };
};

function resolveClerkOrganizationId(entity: RazorpayEntity | undefined): string | null {
    const meta = entity?.notes ?? {};
    const fromMeta = meta.clerk_organization_id ?? meta.clerkOrganizationId;
    if (typeof fromMeta === "string" && fromMeta.length > 0) {
        return fromMeta;
    }
    const ext = meta.customer_external_id;
    if (typeof ext === "string" && ext.length > 0) {
        return ext;
    }
    return null;
}

function convexStatusFromRazorpay(eventType: string, entityStatus?: string): string {
    if (RAZORPAY_ACTIVE_EVENTS.has(eventType)) {
        return "active";
    }
    if (RAZORPAY_INACTIVE_EVENTS.has(eventType)) {
        return "inactive";
    }
    if (
        entityStatus === "paid" ||
        entityStatus === "captured" ||
        entityStatus === "active" ||
        entityStatus === "authenticated"
    ) {
        return "active";
    }
    return "inactive";
}

function seatCapForStatus(status: string): number {
    return status === "active" ? 5 : 1;
}

function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) {
        return false;
    }

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (signatureBuf.length !== expectedBuf.length) {
        return false;
    }
    return timingSafeEqual(signatureBuf, expectedBuf);
}

function resolveRazorpayEntity(event: RazorpayWebhookPayload): RazorpayEntity | undefined {
    return (
        event.payload?.payment_link?.entity ??
        event.payload?.subscription?.entity ??
        event.payload?.payment?.entity
    );
}

function weakHash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return `h_${Math.abs(h)}`;
}

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY || "",
})

const ANALYTICS_CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function clientIp(request: Request): string | null {
    const cf = request.headers.get("cf-connecting-ip");
    if (cf) {
        return cf.trim();
    }
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
        return xff.split(",")[0]?.trim() ?? null;
    }
    return null;
}

async function countryFromIp(ip: string | null): Promise<string | undefined> {
    if (!ip || ip === "127.0.0.1" || ip === "::1") {
        return undefined;
    }
    try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
        if (!res.ok) {
            return undefined;
        }
        const data = (await res.json()) as { country_code?: string; error?: boolean };
        if (data.error || !data.country_code || typeof data.country_code !== "string") {
            return undefined;
        }
        return data.country_code.toUpperCase();
    } catch {
        return undefined;
    }
}

function hostMatchesSite(originOrReferrerHost: string, siteDomain: string): boolean {
    const host = originOrReferrerHost.replace(/^www\./, "").toLowerCase();
    const site = siteDomain.replace(/^www\./, "").toLowerCase();
    return host === site || host.endsWith("." + site);
}

/** Lets you test from http://localhost without registering "localhost" as the site domain. */
function isLocalDevHostname(host: string): boolean {
    const h = host.replace(/^\[|\]$/g, "").toLowerCase();
    return (
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "::1" ||
        host.toLowerCase() === "[::1]"
    );
}

const http = httpRouter();

http.route({
    path: "/analytics/collect",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, { status: 204, headers: ANALYTICS_CORS_HEADERS });
    }),
});

http.route({
    path: "/analytics/collect",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        let body: {
            ingestKey?: string;
            clientSessionId?: string;
            path?: string;
            action?: string;
            durationMs?: number;
        };
        try {
            body = (await request.json()) as typeof body;
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON" }), {
                status: 400,
                headers: { ...ANALYTICS_CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const ingestKey = typeof body.ingestKey === "string" ? body.ingestKey : "";
        const clientSessionId =
            typeof body.clientSessionId === "string" ? body.clientSessionId : "";
        const path = typeof body.path === "string" ? body.path : undefined;
        const action =
            body.action === "start" || body.action === "ping" || body.action === "end"
                ? body.action
                : null;
        const durationMs =
            typeof body.durationMs === "number" && Number.isFinite(body.durationMs)
                ? body.durationMs
                : 0;

        if (!ingestKey || !clientSessionId || !action) {
            return new Response(JSON.stringify({ error: "Missing fields" }), {
                status: 400,
                headers: { ...ANALYTICS_CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const site = await ctx.runQuery(internal.system.analyticsIngest.getSiteByIngestKey, {
            ingestKey,
        });

        if (!site) {
            return new Response(JSON.stringify({ error: "Unknown site key" }), {
                status: 404,
                headers: { ...ANALYTICS_CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const origin = request.headers.get("origin");
        const referer = request.headers.get("referer");
        let originHost: string | null = null;
        if (origin) {
            try {
                originHost = new URL(origin).hostname;
            } catch {
                originHost = null;
            }
        }
        if (!originHost && referer) {
            try {
                originHost = new URL(referer).hostname;
            } catch {
                originHost = null;
            }
        }
        if (
            originHost &&
            !isLocalDevHostname(originHost) &&
            !hostMatchesSite(originHost, site.domain)
        ) {
            return new Response(JSON.stringify({ error: "Origin does not match registered domain" }), {
                status: 403,
                headers: { ...ANALYTICS_CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const country =
            action === "start"
                ? await countryFromIp(clientIp(request))
                : undefined;

        await ctx.runMutation(internal.system.analyticsIngest.ingest, {
            ingestKey,
            clientSessionId,
            path,
            action,
            durationMs,
            country,
        });

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...ANALYTICS_CORS_HEADERS, "Content-Type": "application/json" },
        });
    }),
});

http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (_ctx, request)=> {
        const event = await validateRequest(request);

        if(!event){
            return new Response("Error occured", {status: 400});
        }

        console.log("Clerk webhook received", event.type);
        return new Response(null, {status: 200});

    })

})

http.route({
    path: "/razorpay-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request)=> {
        const payloadString = await request.text();
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        if (!verifyRazorpaySignature(payloadString, signature, secret)) {
            return new Response("invalid signature", { status: 403 });
        }

        let event: RazorpayWebhookPayload;
        try {
            event = JSON.parse(payloadString) as RazorpayWebhookPayload;
        } catch {
            return new Response("invalid payload", { status: 400 });
        }
        if (!isSupportedRazorpayEvent(event.event)) {
            return new Response(null, { status: 202 });
        }

        const entity = resolveRazorpayEntity(event);
        const organizationId = resolveClerkOrganizationId(entity);
        if(!organizationId){
            console.warn("Razorpay webhook: missing Clerk organization id", event.event);
            return new Response(null, { status: 202 });
        }

        const status = convexStatusFromRazorpay(event.event, entity?.status);
        await clerkClient.organizations.updateOrganization(organizationId, {
            maxAllowedMemberships: seatCapForStatus(status),
        });

        await ctx.runMutation(internal.system.subscriptions.upsert, {
            organizationId,
            status,
        });

        return new Response(null, { status: 202 });

    })

})

http.route({
    path: "/crm/webhooks/dispatch",
    method: "POST",
    handler: httpAction(async (ctx) => {
        const events = await ctx.runQuery(internal.system.webhooks.listPending, {});
        for (const event of events) {
            const sub = await ctx.runQuery(internal.system.webhooks.getSubscription, {
                subscriptionId: event.subscriptionId,
            });
            if (!sub || !sub.active) continue;
            try {
                await fetch(sub.url, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "x-crm-webhook-secret": sub.secret,
                    },
                    body: event.payload,
                });
                await ctx.runMutation(internal.system.webhooks.markStatus, {
                    eventId: event._id,
                    status: "sent",
                });
            } catch {
                await ctx.runMutation(internal.system.webhooks.markStatus, {
                    eventId: event._id,
                    status: "failed",
                });
            }
        }
        return new Response(JSON.stringify({ ok: true, processed: events.length }), { status: 200 });
    }),
});

http.route({
    path: "/crm/api/export",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const rawKey = request.headers.get("x-api-key") ?? "";
        if (!rawKey) return new Response("Missing API key", { status: 401 });
        const keyHash = weakHash(rawKey);
        const key = await ctx.runQuery(internal.system.apiKeys.findActiveByHash, { keyHash });
        if (!key) return new Response("Invalid API key", { status: 401 });
        const { leads, deals, activities } = await ctx.runQuery(
            internal.system.crmExport.exportByOrganization,
            { organizationId: key.organizationId },
        );
        return new Response(
            JSON.stringify({
                organizationId: key.organizationId,
                leads,
                deals,
                activities,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
        );
    }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null>{
    const payloadString = await req.text();
    const svixHeaders = {
        "svix-id": req.headers.get("svix-id") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
    }

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

    try{
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;

    } catch (error) {
        console.error(`Error verifying webhook event`, error);
        return null;

    }
}

export default http;