export const BULK_EMAIL_TEMPLATES = {
    followup: {
        label: "Friendly follow-up",
        subject: "Hi {{first_name}} — quick follow-up from our team",
        body:
            "Hi {{first_name}},\n\n" +
            "Thanks for your interest{{company_line}}. We wanted to follow up and see if you had any questions.\n\n" +
            "Feel free to reply to this email anytime.\n\n" +
            "Best regards",
    },
    announcement: {
        label: "Short announcement",
        subject: "An update for you{{company_comma}} {{name}}",
        body:
            "Hello {{name}},\n\n" +
            "We have a brief update we think you’ll appreciate. If you’d like more detail, just reply to this message.\n\n" +
            "Thank you,\n" +
            "The team",
    },
    plain: {
        label: "Plain outreach",
        subject: "Hello from our team",
        body:
            "Hi {{first_name}},\n\n" +
            "Hope you’re doing well. We’re reaching out to stay in touch.\n\n" +
            "Best,\n" +
            "The team",
    },
} as const;

export type BulkEmailTemplateId = keyof typeof BULK_EMAIL_TEMPLATES;

export function isBulkEmailTemplateId(id: string): id is BulkEmailTemplateId {
    return id in BULK_EMAIL_TEMPLATES;
}

export const BULK_EMAIL_TEMPLATE_LIST: { id: BulkEmailTemplateId; label: string }[] = Object.entries(
    BULK_EMAIL_TEMPLATES,
).map(([id, t]) => ({ id: id as BulkEmailTemplateId, label: t.label }));

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
    const first = (vars.firstName ?? "").trim();
    const last = (vars.lastName ?? "").trim();
    const fullName = (vars.name ?? "").trim() || [first, last].filter(Boolean).join(" ").trim() || vars.email;
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
