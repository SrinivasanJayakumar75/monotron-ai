"use node";

import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { getValidGoogleAccessToken } from "../lib/googleAccessToken";
import { parseBulkEmailBodyStructure } from "../lib/bulkEmailBodyMarkdown";
import { mergeBulkEmailTemplate } from "../lib/bulkEmailTemplates";
import { BULK_EMAIL_THEMES, normalizeBulkEmailThemeId, type BulkEmailThemeId } from "../lib/bulkEmailThemes";
import { internal } from "../_generated/api";

const MAX_BULK = 2000;
const BETWEEN_SEND_MS = 120;
const SUBJECT_MAX = 500;
const BODY_MAX = 100_000;
const PREVIEW_TEXT_MAX = 200;
const BUTTON_LABEL_MAX = 200;
const BUTTON_URL_MAX = 2000;
/** Dark top ribbon for brand_bar themes — merge tags supported in composer. */
const BRAND_BAR_TITLE_MAX = 120;
/** Promo hero (sunrise theme) — merge tags supported. */
const PROMO_HEADLINE_MAX = 220;
const PROMO_DISCOUNT_MAX = 24;
const SOCIAL_URL_MAX = 2000;
const MAX_SOCIAL_LINKS = 5;

const SOCIAL_PLATFORM_META: Record<
    "facebook" | "twitter" | "linkedin" | "instagram" | "youtube",
    { label: string; color: string }
> = {
    facebook: { label: "Facebook", color: "#1877F2" },
    twitter: { label: "X", color: "#0f1419" },
    linkedin: { label: "LinkedIn", color: "#0A66C2" },
    instagram: { label: "Instagram", color: "#E4405F" },
    youtube: { label: "YouTube", color: "#FF0000" },
};

const socialLinkArgValidator = v.object({
    platform: v.union(
        v.literal("facebook"),
        v.literal("twitter"),
        v.literal("linkedin"),
        v.literal("instagram"),
        v.literal("youtube"),
    ),
    url: v.string(),
});

const emailThemeValidator = v.union(
    v.literal("indigo"),
    v.literal("coral"),
    v.literal("royal"),
    v.literal("lavender"),
    v.literal("noir"),
    v.literal("jade"),
    v.literal("summit"),
    v.literal("sunrise"),
    v.literal("activation"),
);

type SocialPlatform = keyof typeof SOCIAL_PLATFORM_META;

function normalizeSocialLinksForEmail(
    raw: { platform: SocialPlatform; url: string }[] | undefined,
): { label: string; href: string; color: string }[] {
    if (!raw?.length) return [];
    const seen = new Set<SocialPlatform>();
    const out: { label: string; href: string; color: string }[] = [];
    for (const item of raw) {
        const href = item.url.trim();
        if (!href || href.length > SOCIAL_URL_MAX) continue;
        if (!/^https:\/\//i.test(href)) continue;
        const platform = item.platform;
        if (!SOCIAL_PLATFORM_META[platform] || seen.has(platform)) continue;
        seen.add(platform);
        const meta = SOCIAL_PLATFORM_META[platform];
        out.push({ label: meta.label, href, color: meta.color });
        if (out.length >= MAX_SOCIAL_LINKS) break;
    }
    return out;
}

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

/** Neutral placeholder when no logo is uploaded (activation theme). */
const DEFAULT_LOGO_PLACEHOLDER =
    "https://placehold.co/200x52/f3f4f6/64748b/png?text=Your+logo";

function formatBodyTextWithOptionalBold(
    raw: string,
    theme: (typeof BULK_EMAIL_THEMES)[BulkEmailThemeId],
): string {
    const t = raw.trim();
    if (!t) return "";
    const rich = Boolean(theme.richBodyBoldAccent && theme.boldAccentColor);
    if (!rich) {
        return escapeHtml(t).replace(/\r?\n/g, "<br/>");
    }
    const color = theme.boldAccentColor!;
    const segments = t.split(/\*\*/);
    const out: string[] = [];
    for (let j = 0; j < segments.length; j++) {
        const segment = segments[j] ?? "";
        if (j % 2 === 1) {
            out.push(`<strong style="color:${color};font-weight:700;">${escapeHtml(segment)}</strong>`);
        } else {
            out.push(escapeHtml(segment).replace(/\r?\n/g, "<br/>"));
        }
    }
    return out.join("");
}

function renderStructuredBodyHtml(
    parsed: ReturnType<typeof parseBulkEmailBodyStructure>,
    theme: (typeof BULK_EMAIL_THEMES)[BulkEmailThemeId],
): string {
    const parts: string[] = [];
    if (parsed.kicker) {
        parts.push(
            `<div style="margin:0 0 14px;"><span style="display:inline-block;padding:5px 14px;border-radius:9999px;background:${theme.accent}1a;color:${theme.accent};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(parsed.kicker)}</span></div>`,
        );
    }
    if (parsed.headline) {
        const align = theme.headlineAlign === "center" ? "center" : "left";
        parts.push(
            `<p style="margin:0 0 12px;text-align:${align};font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.03em;color:${theme.bodyColor};">${escapeHtml(parsed.headline)}</p>`,
        );
    }
    if (parsed.subhead) {
        parts.push(
            `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:600;line-height:1.35;color:${theme.mutedColor};">${escapeHtml(parsed.subhead)}</p>`,
        );
    }
    const bodyText = parsed.body.trim();
    if (bodyText) {
        parts.push(
            `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${theme.bodyColor};">${formatBodyTextWithOptionalBold(bodyText, theme)}</div>`,
        );
    }
    const foot = parsed.footerNote?.trim();
    if (foot) {
        parts.push(
            `<p style="margin:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#888888;">${formatBodyTextWithOptionalBold(foot, theme)}</p>`,
        );
    }
    return parts.join("");
}

type HeroRenderCtx = {
    brandBarTitle?: string;
    promoHeadline?: string;
    promoDiscount?: string;
    promoButton?: { label: string; href: string };
};

function renderTopHeroRow(theme: (typeof BULK_EMAIL_THEMES)[BulkEmailThemeId], ctx: HeroRenderCtx = {}): string {
    const a = theme.accent;
    if (theme.topHero === "promo_sunrise") {
        const headline = ctx.promoHeadline?.trim() || "Your best offer is waiting";
        const discount = ctx.promoDiscount?.trim() || "40%";
        const grad =
            "linear-gradient(127deg,#ffeb3b 0%,#fff176 28%,#ffb74d 72%,#f57c00 100%)";
        const btn = ctx.promoButton;
        const btnHtml = btn
            ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:4px;"><tr><td align="left" bgcolor="${a}" style="border-radius:9999px;">
<a href="${escapeHtml(btn.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px;">${escapeHtml(btn.label)}</a>
</td></tr></table>`
            : "";
        return `<tr><td style="padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffc107" style="background-image:${grad};background-color:#ffc107;">
<tr>
<td valign="top" width="58%" style="padding:26px 8px 28px 22px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;color:#0f172a;">${escapeHtml(headline)}</p>
${btnHtml}
</td>
<td valign="middle" align="center" width="42%" style="padding:18px 14px 22px 8px;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:52px;font-weight:900;line-height:1;letter-spacing:-0.05em;color:#0f172a;">${escapeHtml(discount)}</div>
<div style="margin-top:8px;font-size:11px;font-weight:700;color:#14532d;letter-spacing:0.12em;">SAVE</div>
</td>
</tr>
</table>
</td></tr>`;
    }
    if (theme.topHero === "brand_bar") {
        const title = ctx.brandBarTitle?.trim() || "LIVE EVENT";
        return `<tr><td align="center" bgcolor="#0f172a" style="padding:20px 16px 22px;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.36em;color:#f8fafc;">${escapeHtml(
            title,
        )}</div>
</td></tr>`;
    }
    if (theme.topHero === "notify_check") {
        return `<tr><td align="center" bgcolor="${a}" style="padding:40px 24px 44px;">
<span style="font-family:Arial,Helvetica,sans-serif;font-size:64px;line-height:1;color:#ffffff;font-weight:300;">&#10003;</span>
</td></tr>`;
    }
    if (theme.topHero === "verify_panel") {
        return `<tr><td align="center" bgcolor="${a}" style="padding:28px 20px 32px;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.22em;color:rgba(255,255,255,0.92);">VERIFY YOUR EMAIL</div>
<div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:44px;line-height:1;color:#ffffff;">&#9993;</div>
</td></tr>`;
    }
    if (theme.topHero === "thin_bar") {
        return `<tr><td style="height:8px;line-height:8px;font-size:0;background:${a};">&nbsp;</td></tr>`;
    }
    return "";
}

function renderClosingBanner(
    theme: (typeof BULK_EMAIL_THEMES)[BulkEmailThemeId],
    button: { label: string; href: string },
): string {
    const a = theme.accent;
    const label = escapeHtml(button.label);
    const href = escapeHtml(button.href);
    const eyebrow =
        "closingBannerEyebrow" in theme && theme.closingBannerEyebrow?.trim()
            ? theme.closingBannerEyebrow.trim()
            : "JOIN US";
    const sub =
        "closingBannerBody" in theme && theme.closingBannerBody?.trim()
            ? theme.closingBannerBody.trim()
            : "Limited seats — use the same link if you still need to register.";
    return `<tr><td align="center" bgcolor="${a}" style="padding:28px 24px 32px;">
<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.92);">${escapeHtml(eyebrow)}</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#ffffff;">${escapeHtml(sub)}</p>
<table cellpadding="0" cellspacing="0" role="presentation" align="center"><tr><td bgcolor="#ffffff" style="border-radius:9999px;">
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${a};text-decoration:none;border-radius:9999px;">${label}</a>
</td></tr></table>
</td></tr>`;
}

function renderSocialFooter(
    links: { label: string; href: string; color: string }[],
    stripBg: string,
    onDark?: boolean,
): string {
    if (!links.length) return "";
    const headingColor = onDark ? "#94a3b8" : "#52525b";
    const linkColor = (hex: string) => (onDark ? "#e2e8f0" : hex);
    const cells = links
        .map(
            (l) =>
                `<td style="padding:4px 10px;"><a href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:${linkColor(l.color)};text-decoration:underline;">${escapeHtml(l.label)}</a></td>`,
        )
        .join("");
    return `<tr><td style="padding:16px 28px 14px;background:${stripBg};border-top:1px solid ${onDark ? "#1e293b" : "#e4e4e7"};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${headingColor};text-transform:uppercase;letter-spacing:0.06em;">Follow us on</td></tr>
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
${cells}
</tr></table>
</td></tr>
</table>
</td></tr>`;
}

function renderCtaRow(
    theme: (typeof BULK_EMAIL_THEMES)[BulkEmailThemeId],
    button: { label: string; href: string },
): string {
    const label = escapeHtml(button.label);
    const href = escapeHtml(button.href);
    const radius = "9999px";
    if (theme.ctaStyle === "outline") {
        return `<tr><td align="center" style="padding:8px 28px 28px;">
<table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="border:2px solid ${theme.ctaOutlineBorder};border-radius:${radius};background:#ffffff;">
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:${theme.ctaOutlineFg};text-decoration:none;border-radius:${radius};">${label}</a>
</td></tr></table>
</td></tr>`;
    }
    return `<tr><td align="center" style="padding:8px 28px 28px;">
<table cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" bgcolor="${theme.accent}" style="border-radius:${radius};">
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:${theme.ctaFilledFg};text-decoration:none;border-radius:${radius};">${label}</a>
</td></tr></table>
</td></tr>`;
}

function renderHtmlBody(
    body: string,
    opts: {
        preheader?: string;
        imageUrl?: string;
        button?: { label: string; href: string };
        socialLinks?: { label: string; href: string; color: string }[];
        theme: (typeof BULK_EMAIL_THEMES)[BulkEmailThemeId];
        /** Merged ribbon line for brand_bar themes */
        brandBarTitle?: string;
        /** Merged promo hero (sunrise theme) */
        promoHeadline?: string;
        promoDiscount?: string;
    },
) {
    const th = opts.theme;
    const pre = opts.preheader?.trim()
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;width:0;height:0;opacity:0;">${escapeHtml(
              opts.preheader.trim(),
          )}</div>`
        : "";
    const parsed = parseBulkEmailBodyStructure(body);
    const textHtml = renderStructuredBodyHtml(parsed, th);
    const promoBtn = th.topHero === "promo_sunrise" && opts.button ? opts.button : undefined;
    const topHero = renderTopHeroRow(th, {
        brandBarTitle: opts.brandBarTitle,
        promoHeadline: opts.promoHeadline,
        promoDiscount: opts.promoDiscount,
        promoButton: promoBtn,
    });
    const imageRole = th.imageRole ?? "full_width_hero";
    const hero =
        imageRole === "top_left_logo"
            ? `<tr><td style="padding:24px 28px 4px;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left">
<img src="${escapeHtml(
                  opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl.trim())
                      ? opts.imageUrl.trim()
                      : DEFAULT_LOGO_PLACEHOLDER,
              )}" alt="" width="200" style="display:block;max-width:240px;max-height:52px;width:auto;height:auto;border:0;" />
</td></tr></table>
</td></tr>`
            : opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl.trim())
              ? `<tr><td style="padding:0;line-height:0;background:#f8fafc;">
<img src="${escapeHtml(opts.imageUrl.trim())}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
</td></tr>`
              : "";
    const showMidCta = Boolean(opts.button && !th.skipMidCta);
    const cta = showMidCta && opts.button ? renderCtaRow(th, opts.button) : "";
    const closing =
        th.closingBanner && opts.button ? renderClosingBanner(th, opts.button) : "";
    const social = renderSocialFooter(
        opts.socialLinks ?? [],
        th.socialStripBg,
        Boolean(th.socialFooterOnDark),
    );
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:${th.outerBg};">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${th.outerBg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:${th.cardShadow};">
${topHero}
${hero}
<tr><td style="padding:28px 28px 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${th.bodyColor};">
${textHtml}
</td></tr>
${cta}
${closing}
${social}
<tr><td style="padding:0 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${th.mutedColor};border-top:1px solid #f4f4f5;">
<p style="margin:16px 0 0;">You received this message as part of a campaign from our team.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const recipientValidator = v.object({
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
});

export type BulkEmailRecipientArg = {
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    company?: string;
};

async function runBulkSendForUser(
    ctx: ActionCtx,
    organizationId: string,
    userId: string,
    args: {
        subject: string;
        body: string;
        previewText?: string;
        imageStorageId?: Id<"_storage">;
        buttonLabel?: string;
        buttonUrl?: string;
        socialLinks?: { platform: SocialPlatform; url: string }[];
        emailTheme?: BulkEmailThemeId;
        brandBarTitle?: string;
        promoHeadline?: string;
        promoDiscount?: string;
        recipients: BulkEmailRecipientArg[];
    },
): Promise<{ sent: number; failed: { email: string; error: string }[] }> {
    await ctx.runQuery(internal.private.crmAuthInternal.assertCrmWrite, {
        organizationId,
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
    const previewTpl = (args.previewText ?? "").trim();
    if (previewTpl.length > PREVIEW_TEXT_MAX) {
        throw new Error(`Preview text must be at most ${PREVIEW_TEXT_MAX} characters`);
    }
    if (args.recipients.length === 0) {
        throw new Error("Add at least one recipient");
    }
    if (args.recipients.length > MAX_BULK) {
        throw new Error(`Maximum ${MAX_BULK} recipients per batch`);
    }

    const conn = await ctx.runQuery(internal.system.googleIntegration.getConnectionByOrgAndUser, {
        organizationId,
        userId,
    });
    if (!conn) throw new Error("Google not connected");

    const accessToken = await getValidGoogleAccessToken(conn.secretName);

    const template = { subject: subjectTpl, body: bodyTpl };

    let resolvedImageUrl: string | undefined;
    if (args.imageStorageId) {
        const u = await ctx.storage.getUrl(args.imageStorageId);
        if (!u) {
            throw new Error("Campaign image is no longer available. Upload it again.");
        }
        resolvedImageUrl = u;
    }

    const btnLabelTpl = (args.buttonLabel ?? "").trim();
    const btnUrlTpl = (args.buttonUrl ?? "").trim();
    if (btnLabelTpl && !btnUrlTpl) {
        throw new Error("Button link URL is required when a button label is set");
    }
    if (btnUrlTpl && !btnLabelTpl) {
        throw new Error("Button label is required when a link URL is set");
    }
    if (btnLabelTpl.length > BUTTON_LABEL_MAX) {
        throw new Error(`Button label must be at most ${BUTTON_LABEL_MAX} characters`);
    }
    if (btnUrlTpl.length > BUTTON_URL_MAX) {
        throw new Error(`Button URL must be at most ${BUTTON_URL_MAX} characters`);
    }

    const ribbonTpl = (args.brandBarTitle ?? "").trim();
    if (ribbonTpl.length > BRAND_BAR_TITLE_MAX) {
        throw new Error(`Ribbon title must be at most ${BRAND_BAR_TITLE_MAX} characters`);
    }

    const promoHeadTpl = (args.promoHeadline ?? "").trim();
    const promoDiscTpl = (args.promoDiscount ?? "").trim();
    if (promoHeadTpl.length > PROMO_HEADLINE_MAX) {
        throw new Error(`Promo headline must be at most ${PROMO_HEADLINE_MAX} characters`);
    }
    if (promoDiscTpl.length > PROMO_DISCOUNT_MAX) {
        throw new Error(`Promo discount label must be at most ${PROMO_DISCOUNT_MAX} characters`);
    }

    if (args.socialLinks && args.socialLinks.length > MAX_SOCIAL_LINKS) {
        throw new Error(`At most ${MAX_SOCIAL_LINKS} social links`);
    }
    const socialFooterLinks = normalizeSocialLinksForEmail(args.socialLinks);
    const themeTokens = BULK_EMAIL_THEMES[normalizeBulkEmailThemeId(args.emailTheme)];

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
        const mergedPre = previewTpl
            ? mergeBulkEmailTemplate({ subject: previewTpl, body: "" }, {
                  email: to,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  name: r.name,
                  company: r.company,
              }).subject.trim()
            : "";

        let button: { label: string; href: string } | undefined;
        if (btnLabelTpl && btnUrlTpl) {
            const mergedBtn = mergeBulkEmailTemplate({ subject: btnLabelTpl, body: btnUrlTpl }, {
                email: to,
                firstName: r.firstName,
                lastName: r.lastName,
                name: r.name,
                company: r.company,
            });
            const label = mergedBtn.subject.trim();
            const href = mergedBtn.body.trim();
            if (label && /^https?:\/\//i.test(href)) {
                button = { label, href };
            }
        }

        const mergedRibbon = ribbonTpl
            ? mergeBulkEmailTemplate({ subject: ribbonTpl, body: "" }, {
                  email: to,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  name: r.name,
                  company: r.company,
              }).subject.trim()
            : "";

        const mergedPromoHead = promoHeadTpl
            ? mergeBulkEmailTemplate({ subject: promoHeadTpl, body: "" }, {
                  email: to,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  name: r.name,
                  company: r.company,
              }).subject.trim()
            : "";
        const mergedPromoDisc = promoDiscTpl
            ? mergeBulkEmailTemplate({ subject: promoDiscTpl, body: "" }, {
                  email: to,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  name: r.name,
                  company: r.company,
              }).subject.trim()
            : "";

        const htmlBody = renderHtmlBody(body, {
            preheader: mergedPre,
            imageUrl: resolvedImageUrl,
            button,
            socialLinks: socialFooterLinks,
            theme: themeTokens,
            brandBarTitle: mergedRibbon || undefined,
            promoHeadline: mergedPromoHead || undefined,
            promoDiscount: mergedPromoDisc || undefined,
        });

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
            organizationId,
            entries: successes,
        });
    }

    return { sent: successes.length, failed };
}

export const executeScheduledBulkEmail = internalAction({
    args: {
        scheduledBulkEmailId: v.id("scheduledBulkEmails"),
    },
    handler: async (ctx, args) => {
        const row = await ctx.runQuery(internal.private.scheduledBulkEmail.getForExecution, {
            scheduledBulkEmailId: args.scheduledBulkEmailId,
        });
        if (!row || row.status !== "pending") return;

        const marked = await ctx.runMutation(internal.private.scheduledBulkEmail.markProcessing, {
            scheduledBulkEmailId: args.scheduledBulkEmailId,
        });
        if (!marked.ok) return;

        try {
            const result = await runBulkSendForUser(ctx, row.organizationId, row.userId, {
                subject: row.subject,
                body: row.body,
                previewText: row.previewText,
                imageStorageId: row.imageStorageId,
                buttonLabel: row.buttonLabel,
                buttonUrl: row.buttonUrl,
                socialLinks: row.socialLinks,
                emailTheme: row.emailTheme,
                brandBarTitle: row.brandBarTitle,
                promoHeadline: row.promoHeadline,
                promoDiscount: row.promoDiscount,
                recipients: row.recipients,
            });
            await ctx.runMutation(internal.private.scheduledBulkEmail.markCompleted, {
                scheduledBulkEmailId: args.scheduledBulkEmailId,
                sent: result.sent,
                failed: result.failed,
            });
        } catch (e) {
            await ctx.runMutation(internal.private.scheduledBulkEmail.markFailed, {
                scheduledBulkEmailId: args.scheduledBulkEmailId,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    },
});

export const sendBulkEmails = action({
    args: {
        subject: v.string(),
        body: v.string(),
        previewText: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        buttonLabel: v.optional(v.string()),
        buttonUrl: v.optional(v.string()),
        socialLinks: v.optional(v.array(socialLinkArgValidator)),
        emailTheme: v.optional(emailThemeValidator),
        brandBarTitle: v.optional(v.string()),
        promoHeadline: v.optional(v.string()),
        promoDiscount: v.optional(v.string()),
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

        return await runBulkSendForUser(ctx, orgId, userId, {
            subject: args.subject,
            body: args.body,
            previewText: args.previewText,
            imageStorageId: args.imageStorageId,
            buttonLabel: args.buttonLabel,
            buttonUrl: args.buttonUrl,
            socialLinks: args.socialLinks,
            emailTheme: args.emailTheme,
            brandBarTitle: args.brandBarTitle,
            promoHeadline: args.promoHeadline,
            promoDiscount: args.promoDiscount,
            recipients: args.recipients,
        });
    },
});
