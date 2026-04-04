"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
    displayLeadStatus,
    formatLeadSourceLabel,
    formatShortDate,
    leadCreatedAt,
    whatsappChatUrl,
} from "../leads-ui-constants";
import {
    CrmActivitiesEmptyStateLinks,
    CrmProfileActivitiesSection,
} from "../components/crm-profile-activities-section";
import { useCrmCurrency } from "../../lib/use-crm-currency";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";
import {
    ArrowLeftIcon,
    Building2Icon,
    CalendarClockIcon,
    ExternalLinkIcon,
    MailIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    TrendingUpIcon,
    UserIcon,
    GlobeIcon,
    WalletIcon,
    MessageCircleIcon,
} from "lucide-react";

function leadProfileStatusPillClass(displayStatus: string) {
    switch (displayStatus) {
        case "New":
            return "border-sky-200 bg-sky-50 text-sky-900";
        case "Contacted":
            return "border-amber-200 bg-amber-50 text-amber-950";
        case "Qualified":
            return "border-emerald-200 bg-emerald-50 text-emerald-900";
        case "Lost":
            return "border-red-200 bg-red-50 text-red-900";
        default:
            return "border-slate-200 bg-slate-100 text-slate-800";
    }
}

function initialsFromName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function DetailField({
    label,
    children,
    className,
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("min-w-0", className)}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">{children}</dd>
        </div>
    );
}

function StatTile({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: ReactNode;
    icon: ComponentType<{ className?: string }>;
}) {
    return (
        <div className="flex gap-3 rounded-none border border-slate-200 bg-[#f5f8fa] px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-white text-slate-600">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
            </div>
        </div>
    );
}

export const LeadDetailView = () => {
    const params = useParams<{ leadId: string }>();
    const router = useRouter();
    const leadId = params.leadId as Id<"leads"> | undefined;
    const lead = useQuery(api.private.leads.getOne, leadId ? { leadId } : "skip");
    const leadActivities = useQuery(api.private.activities.listByLead, leadId ? { leadId } : "skip");
    const association = useQuery((api as any).private.leadAssociations.getByLead, leadId ? { leadId } : "skip");
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});
    const { formatMoney } = useCrmCurrency();

    if (!leadId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid lead.</p>
                <Button className="mt-4" variant="outline" onClick={() => router.push("/crm/leads")}>
                    Back to leads
                </Button>
            </div>
        );
    }

    if (lead === undefined) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center bg-[#f5f8fa] p-6">
                <p className="text-slate-500">Loading…</p>
            </div>
        );
    }

    if (lead === null) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#f5f8fa] p-6">
                <p className="font-medium text-slate-800">Lead not found</p>
                <Button variant="outline" asChild>
                    <Link href="/crm/leads">Back to leads</Link>
                </Button>
            </div>
        );
    }

    const account = association?.accountId ? accounts?.find((a) => a._id === association.accountId) : undefined;
    const contact = association?.contactId ? contacts?.find((c) => c._id === association.contactId) : undefined;

    const leadEmail = lead.email?.trim() ?? "";
    const gmailComposeUrl = leadEmail
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(leadEmail)}`
        : "";
    const phoneDigits = lead.phone?.replace(/\D/g, "") ?? "";
    const telHref = phoneDigits ? `tel:${phoneDigits}` : "";
    const waHref = whatsappChatUrl(lead.whatsapp?.trim());

    const displayStatus = displayLeadStatus(lead.stage);
    const created = formatShortDate(leadCreatedAt(lead));

    return (
        <div className="min-h-screen bg-[#f5f8fa]">
            <div className="border-b border-slate-200/80 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="shrink-0 border-slate-300" asChild>
                            <Link href="/crm/leads" aria-label="Back to leads">
                                <ArrowLeftIcon className="size-4" />
                            </Link>
                        </Button>
                        <div>
                            <p className="text-xs text-slate-500">
                                <Link href="/crm/leads" className="font-medium text-slate-700 hover:text-slate-900 hover:underline">
                                    Leads
                                </Link>
                                <span className="mx-1.5 text-slate-400">/</span>
                                <span className="text-slate-600">Record</span>
                            </p>
                            <h1 className="mt-0.5 text-lg font-semibold text-slate-900 md:text-xl">Lead profile</h1>
                        </div>
                    </div>
                    <Button asChild className={cn("gap-2 self-start md:self-auto", CRM_PRIMARY_BTN)}>
                        <Link href={`/crm/leads/${lead._id}/edit`}>
                            <PencilIcon className="size-4" />
                            Edit lead
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
                <Card className="overflow-hidden rounded-none border-2 border-slate-200 bg-white shadow-[3px_3px_0_0_rgb(226,232,240)]">
                    <CardContent className="p-0">
                        <div className="border-b border-slate-200 bg-[#eaf0f6] px-5 py-5 md:px-6 md:py-6">
                            <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
                                <div
                                    className="flex size-16 shrink-0 items-center justify-center rounded-none border-2 border-slate-300 bg-white text-lg font-bold text-slate-700 shadow-sm md:size-20 md:text-xl"
                                    aria-hidden
                                >
                                    {initialsFromName(lead.name)}
                                </div>
                                <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2 gap-y-2">
                                                <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                                                    {lead.name}
                                                </h2>
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                                                        leadProfileStatusPillClass(displayStatus),
                                                    )}
                                                >
                                                    {displayStatus}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                                                {lead.company ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Building2Icon className="size-3.5 shrink-0 text-slate-400" />
                                                        {lead.company}
                                                    </span>
                                                ) : null}
                                                <span className="inline-flex items-center gap-1.5">
                                                    <TrendingUpIcon className="size-3.5 shrink-0 text-slate-400" />
                                                    Source: {formatLeadSourceLabel(lead.leadSource)}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className="flex shrink-0 flex-wrap gap-2 lg:justify-end"
                                            role="group"
                                            aria-label="Quick actions"
                                        >
                                            {leadEmail ? (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" asChild>
                                                    <a href={gmailComposeUrl} target="_blank" rel="noreferrer">
                                                        <MailIcon className="size-3.5" />
                                                        Email
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" disabled type="button">
                                                    <MailIcon className="size-3.5" />
                                                    Email
                                                </Button>
                                            )}
                                            {telHref ? (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" asChild>
                                                    <a href={telHref}>
                                                        <PhoneIcon className="size-3.5" />
                                                        Call
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" disabled type="button">
                                                    <PhoneIcon className="size-3.5" />
                                                    Call
                                                </Button>
                                            )}
                                            {waHref ? (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" asChild>
                                                    <a href={waHref} target="_blank" rel="noreferrer">
                                                        <MessageCircleIcon className="size-3.5" />
                                                        WhatsApp
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" disabled type="button">
                                                    <MessageCircleIcon className="size-3.5" />
                                                    WhatsApp
                                                </Button>
                                            )}
                                            {lead.website ? (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" asChild>
                                                    <a href={lead.website} target="_blank" rel="noreferrer">
                                                        <GlobeIcon className="size-3.5" />
                                                        Website
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" className="gap-1.5 border-slate-300" disabled type="button">
                                                    <GlobeIcon className="size-3.5" />
                                                    Website
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
                            <StatTile label="Expected deal value" value={formatMoney(lead.expectedDealValue)} icon={WalletIcon} />
                            <StatTile label="Lead score" value={lead.leadScore ?? "—"} icon={TrendingUpIcon} />
                            <StatTile label="Created" value={created} icon={CalendarClockIcon} />
                            <StatTile
                                label="Last contacted"
                                value={formatShortDate(lead.lastContactedAt)}
                                icon={CalendarClockIcon}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <CrmProfileActivitiesSection
                            activities={leadActivities}
                            subtitle="Tasks, calls, emails, and meetings linked to this lead."
                            createContext={{ relatedLeadId: lead._id }}
                            emptyState={
                                <>
                                    No activities linked to this lead yet.{" "}
                                    <span className="mt-2 block text-xs">
                                        <CrmActivitiesEmptyStateLinks />
                                    </span>
                                </>
                            }
                        />
                        <Card className="rounded-none border-2 border-slate-200 bg-white shadow-[3px_3px_0_0_rgb(226,232,240)]">
                            <CardHeader className="border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-semibold text-slate-900">Contact details</CardTitle>
                                <CardDescription>How to reach this lead and where they are located.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <dl className="grid gap-5 sm:grid-cols-2">
                                    <DetailField label="Email">
                                        {leadEmail ? (
                                            <a
                                                href={gmailComposeUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                                            >
                                                <MailIcon className="size-3.5 shrink-0 text-slate-400" />
                                                {leadEmail}
                                            </a>
                                        ) : (
                                            "—"
                                        )}
                                    </DetailField>
                                    <DetailField label="Phone">
                                        {lead.phone ? (
                                            telHref ? (
                                                <a
                                                    href={telHref}
                                                    className="inline-flex items-center gap-1.5 font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                                                >
                                                    <PhoneIcon className="size-3.5 shrink-0 text-slate-400" />
                                                    {lead.phone}
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <PhoneIcon className="size-3.5 shrink-0 text-slate-400" />
                                                    {lead.phone}
                                                </span>
                                            )
                                        ) : (
                                            "—"
                                        )}
                                    </DetailField>
                                    <DetailField label="WhatsApp">
                                        {lead.whatsapp?.trim() ? (
                                            waHref ? (
                                                <a
                                                    href={waHref}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                                                >
                                                    <MessageCircleIcon className="size-3.5 shrink-0 text-slate-400" />
                                                    {lead.whatsapp.trim()}
                                                </a>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <MessageCircleIcon className="size-3.5 shrink-0 text-slate-400" />
                                                    {lead.whatsapp.trim()}
                                                </span>
                                            )
                                        ) : (
                                            "—"
                                        )}
                                    </DetailField>
                                    <DetailField label="Website" className="sm:col-span-2">
                                        {lead.website ? (
                                            <a
                                                href={lead.website}
                                                className="inline-flex max-w-full items-center gap-1.5 break-all font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <GlobeIcon className="size-3.5 shrink-0 text-slate-400" />
                                                {lead.website}
                                                <ExternalLinkIcon className="size-3 shrink-0 text-slate-400" />
                                            </a>
                                        ) : (
                                            "—"
                                        )}
                                    </DetailField>
                                    <DetailField label="Address" className="sm:col-span-2">
                                        {lead.address ? (
                                            <span className="inline-flex items-start gap-1.5 whitespace-pre-wrap">
                                                <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                                                {lead.address}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </DetailField>
                                </dl>
                            </CardContent>
                        </Card>

                        <Card className="rounded-none border-2 border-slate-200 bg-white shadow-[3px_3px_0_0_rgb(226,232,240)]">
                            <CardHeader className="border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-semibold text-slate-900">Company &amp; ownership</CardTitle>
                                <CardDescription>Organizational context and assignment.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <dl className="grid gap-5 sm:grid-cols-2">
                                    <DetailField label="Company name">{lead.company ?? "—"}</DetailField>
                                    <DetailField label="Industry">{lead.industry ?? "—"}</DetailField>
                                    <DetailField label="Assigned to">{lead.assignedToName ?? "—"}</DetailField>
                                    <DetailField label="Product interest" className="sm:col-span-2">
                                        <span className="whitespace-pre-wrap">{lead.productInterest ?? "—"}</span>
                                    </DetailField>
                                </dl>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="rounded-none border-2 border-slate-200 bg-white shadow-[3px_3px_0_0_rgb(226,232,240)]">
                            <CardHeader className="border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-semibold text-slate-900">Associations</CardTitle>
                                <CardDescription>Linked CRM records.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="rounded-none border border-slate-200 bg-[#f5f8fa] p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Account</p>
                                    {account ? (
                                        <Link
                                            href={`/crm/accounts/${account._id}`}
                                            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline"
                                        >
                                            <Building2Icon className="size-4 text-slate-500" />
                                            {account.name}
                                        </Link>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-600">No account linked</p>
                                    )}
                                </div>
                                <Separator className="bg-slate-200" />
                                <div className="rounded-none border border-slate-200 bg-[#f5f8fa] p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Contact</p>
                                    {contact ? (
                                        <Link
                                            href={`/crm/contacts/${contact._id}`}
                                            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline"
                                        >
                                            <UserIcon className="size-4 text-slate-500" />
                                            {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.firstName}
                                        </Link>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-600">No contact linked</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
