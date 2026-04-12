import type { BulkEmailThemeId } from "./bulkEmailThemes";

export const BULK_EMAIL_TEMPLATES = {
    notify: {
        label: "Bold confirmation",
        description:
            "Green header with check — thank-you / signup confirmations. Pair with the primary button + optional hero image.",
        category: "Trendy",
        badge: "new" as const,
        theme: "jade" satisfies BulkEmailThemeId,
        subject: "You're in — thanks, {{first_name}}!",
        body:
            "# Thank you for your registration\n\n" +
            "Hi {{first_name}},\n\n" +
            "Thanks for registering. Your account is ready — you can jump in anytime.\n\n" +
            "If anything looks off or you need a hand getting started, just reply to this email.\n\n" +
            "Welcome aboard,\nThe team",
    },
    friendly_follow_up: {
        label: "Friendly follow-up",
        description:
            "Clean indigo accent, no hero strip — short check-ins, thank-yous, and gentle nudges you can send as-is or tweak in one minute.",
        category: "Professional",
        badge: "new" as const,
        theme: "indigo" satisfies BulkEmailThemeId,
        subject: "Following up, {{first_name}}",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks again for your time. I'm writing to follow up and see if you have any questions, or if there's anything we can help with.\n\n" +
            "If now isn't a good moment, no worries — just reply whenever it works for you.\n\n" +
            "Best,\nThe team",
    },
    service_activated: {
        label: "Service activated",
        description:
            "Transactional card — logo top-left (upload or neutral placeholder), centered headline, green **service** highlights, black pill button, muted footer after ---",
        category: "Professional",
        badge: "new" as const,
        theme: "activation" satisfies BulkEmailThemeId,
        subject: "Your service has been activated",
        body:
            "# Your Service Has Been Activated\n\n" +
            "We are pleased to inform you that your engagement for **Your service name** has been successfully started.\n\n" +
            "Should you need any further assistance, feel free to reach out, and we'll help shortly.\n\n" +
            "---\n" +
            "Thank you for choosing {{company}}. Should you need any further assistance or have questions, please do not hesitate to contact us.",
    },
    spotlight: {
        label: "Editorial story",
        description: "Noir outline button + strong headline feel — newsletters and product stories.",
        category: "Trendy",
        badge: "new" as const,
        theme: "noir" satisfies BulkEmailThemeId,
        subject: "This week for {{company}} — {{first_name}}",
        body:
            ">> Story\n\n" +
            "# Tales of the week\n\n" +
            "## For {{first_name}} at {{company}}\n\n" +
            "Here’s one story we think you’ll care about — a short read, no fluff.\n\n" +
            "We’ve pulled together the highlights so you can scan in under a minute. Want more detail? Reply and we’ll send it.\n\n" +
            "— Editorial",
    },
    upgrade_promo: {
        label: "Upgrade promo",
        description:
            "Sunrise layout — yellow gradient hero, big discount badge, green CTAs in hero + footer. Set headline, discount label, and primary button.",
        category: "Campaigns",
        badge: "new" as const,
        theme: "sunrise" satisfies BulkEmailThemeId,
        subject: "{{first_name}}, your offer is live{{company_comma}}",
        body:
            "Take the first step toward getting more done.\n\n" +
            "Improvements you'll love — faster workflows and less friction every day.\n\n" +
            "Stay in sync on every device — pick up where you left off on phone or desktop.\n\n" +
            "Find things fast — search that understands what you meant.\n\n" +
            "Reminder: add your real offer end date here. Don't miss out.",
    },
    live_event: {
        label: "Live event invite",
        description:
            "Summit theme — set the dark ribbon title to your brand, add a hero image and primary RSVP button; optional closing strip and dark social row.",
        category: "Events",
        badge: "new" as const,
        theme: "summit" satisfies BulkEmailThemeId,
        subject: "{{first_name}}, save your seat — live evening with us",
        body:
            ">> Spring session\n\n" +
            "# You're invited to our customer evening\n\n" +
            "## {{first_name}}, we'd love you there\n\n" +
            "We're hosting an in-person evening — roadmap, customer stories, and time to meet the team. Dress is casual; curiosity is required.\n\n" +
            "Rough flow\n" +
            "• Check-in & light bites — 5:30 PM\n" +
            "• Program — 6:00–8:00 PM\n" +
            "• Open floor — until 8:30 PM\n\n" +
            "Use the button to RSVP — space is limited. Add a banner image above for venue or speaker visuals.\n\n" +
            "— Events team",
    },
} as const;

export type BulkEmailTemplateId = keyof typeof BULK_EMAIL_TEMPLATES;

export const BULK_EMAIL_GALLERY_ORDER: BulkEmailTemplateId[] = [
    "notify",
    "upgrade_promo",
    "live_event",
    "friendly_follow_up",
    "service_activated",
    "spotlight",
];

export function isBulkEmailTemplateId(id: string): id is BulkEmailTemplateId {
    return id in BULK_EMAIL_TEMPLATES;
}

export const BULK_EMAIL_TEMPLATE_LIST: { id: BulkEmailTemplateId; label: string }[] = BULK_EMAIL_GALLERY_ORDER.map(
    (id) => ({ id, label: BULK_EMAIL_TEMPLATES[id].label }),
);

export type BulkEmailMergeVars = {
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    company?: string;
};

/** Replace {{tokens}} in subject/body. Supports first_name, last_name, name, email, company, company_line, company_comma */
export function mergeBulkEmailTemplate(
    template: { subject: string; body: string },
    vars: BulkEmailMergeVars,
): { subject: string; body: string } {
    const company = (vars.company ?? "").trim();
    let first = (vars.firstName ?? "").trim();
    let last = (vars.lastName ?? "").trim();
    const nameField = (vars.name ?? "").trim();
    if (!first && !last && nameField) {
        const parts = nameField.split(/\s+/).filter(Boolean);
        if (parts.length === 1) first = parts[0]!;
        else if (parts.length > 1) {
            first = parts[0]!;
            last = parts.slice(1).join(" ");
        }
    }
    const fullName = nameField || [first, last].filter(Boolean).join(" ").trim() || vars.email;
    const companyLine = company ? ` from ${company}` : "";
    const companyComma = company ? `, ${company}` : "";

    const map: Record<string, string> = {
        first_name: first,
        last_name: last,
        name: fullName,
        email: vars.email,
        company,
        company_line: companyLine,
        company_comma: companyComma,
    };

    let subject = template.subject;
    let body = template.body;
    for (const [k, v] of Object.entries(map)) {
        const re = new RegExp(`{{\\s*${k}\\s*}}`, "gi");
        subject = subject.replace(re, v);
        body = body.replace(re, v);
    }
    return { subject, body };
}
