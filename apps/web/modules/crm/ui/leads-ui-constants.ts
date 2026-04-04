import type { Doc } from "@workspace/backend/_generated/dataModel";

/** Primary statuses shown in create / filters / table */
export const LEAD_STATUS_OPTIONS = [
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Qualified", label: "Qualified" },
    { value: "Lost", label: "Lost" },
] as const;

export type PrimaryLeadStatus = (typeof LEAD_STATUS_OPTIONS)[number]["value"];

export const LEAD_SOURCE_OPTIONS = [
    { value: "website", label: "Website" },
    { value: "facebook", label: "Facebook" },
    { value: "referral", label: "Referral" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "event", label: "Event" },
    { value: "cold_outreach", label: "Cold outreach" },
    { value: "partner", label: "Partner" },
    { value: "other", label: "Other" },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCE_OPTIONS)[number]["value"];

export const EMPTY_SELECT_VALUE = "__none__";

export function sourceSelectToStored(v: string): string | undefined {
    return v === EMPTY_SELECT_VALUE || v === "" ? undefined : v;
}

export function storedSourceToSelect(s: string | undefined): string {
    if (!s) return EMPTY_SELECT_VALUE;
    const found = LEAD_SOURCE_OPTIONS.some((o) => o.value === s);
    return found ? s : "other";
}

export function formatLeadSourceLabel(value: string | undefined): string {
    if (!value) return "—";
    const o = LEAD_SOURCE_OPTIONS.find((x) => x.value === value);
    return o?.label ?? value;
}

/** Normalize legacy CRM stages for display in the simplified UI */
export function displayLeadStatus(stage: Doc<"leads">["stage"]): string {
    switch (stage) {
        case "Closed Lost":
        case "Lost":
            return "Lost";
        case "Proposal":
        case "Negotiation":
        case "Closed Won":
            return "Qualified";
        default:
            return stage;
    }
}

/** Digits only for tel:/wa.me links */
export function digitsOnly(value: string | undefined): string {
    if (!value) return "";
    return value.replace(/\D/g, "");
}

/** Opens WhatsApp chat for the given number (digits only, include country code). */
export function whatsappChatUrl(value: string | undefined): string | null {
    const d = digitsOnly(value);
    if (!d) return null;
    return `https://wa.me/${d}`;
}

export function formatShortDate(ms: number | undefined): string {
    if (ms === undefined) return "—";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
    }).format(new Date(ms));
}

export function leadCreatedAt(lead: Doc<"leads">): number {
    return lead._creationTime;
}
