export const BULK_EMAIL_TEMPLATES = {
    welcome: {
        label: "Welcome",
        description: "Send an email to your new customers to welcome them to your product.",
        category: "Basic",
        badge: "new" as const,
        subject: "Welcome{{company_comma}} {{first_name}}!",
        body:
            "Hi {{first_name}},\n\n" +
            "Welcome aboard — we're glad you're here. Here's what to expect next.\n\n" +
            "Cheers,\nThe team",
    },
    simple: {
        label: "Simple",
        description: "Start with a simple template if you like minimal formatting in your emails.",
        category: "Basic",
        subject: "A quick note for {{name}}",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks for connecting. I wanted to reach out with a short update.\n\n" +
            "Best regards",
    },
    promotion: {
        label: "Promotion",
        description: "Sell your products and services and promote your latest deals.",
        category: "Basic",
        subject: "Something special for you{{company_comma}} {{first_name}}",
        body:
            "Hi {{first_name}},\n\n" +
            "We're excited to share a limited-time offer we think you'll love. Reply if you'd like the details.\n\n" +
            "— The team",
    },
    plain: {
        label: "Plain email",
        description: "Create an email with little formatting that feels personal to readers.",
        category: "Basic",
        subject: "Hello from our team",
        body:
            "Hi {{first_name}},\n\n" +
            "Just wanted to check in. Let me know if you have any questions.\n\n" +
            "Thanks",
    },
    newsletter: {
        label: "Newsletter",
        description: "Keep your contacts engaged by sharing content you both care about.",
        category: "Basic",
        badge: "new" as const,
        subject: "This week's highlights for {{company}}",
        body:
            "Hi {{first_name}},\n\n" +
            "Here's a quick roundup we put together for you. We hope you find it useful!\n\n" +
            "— The team",
    },
    followup: {
        label: "Friendly follow-up",
        description: "Check in after a conversation or demo without being pushy.",
        category: "Basic",
        subject: "Hi {{first_name}} — quick follow-up from our team",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks for your interest{{company_line}}. We wanted to follow up and see if you had any questions.\n\n" +
            "Feel free to reply to this email anytime.\n\n" +
            "Best regards",
    },
    announcement: {
        label: "Short announcement",
        description: "Share a brief company or product update in a professional tone.",
        category: "Basic",
        subject: "An update for you{{company_comma}} {{name}}",
        body:
            "Hello {{name}},\n\n" +
            "We have a brief update we think you'll appreciate. If you'd like more detail, just reply to this message.\n\n" +
            "Thank you,\nThe team",
    },
} as const;

export type BulkEmailTemplateId = keyof typeof BULK_EMAIL_TEMPLATES;

export const BULK_EMAIL_GALLERY_ORDER: BulkEmailTemplateId[] = [
    "welcome",
    "simple",
    "promotion",
    "plain",
    "newsletter",
    "followup",
    "announcement",
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
    // CRM leads / CSV often only have a full display name; split so {{first_name}} / {{last_name}} work.
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
