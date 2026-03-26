"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
    displayLeadStatus,
    formatLeadSourceLabel,
    formatShortDate,
    leadCreatedAt,
} from "../leads-ui-constants";
import { PencilIcon } from "lucide-react";

function money(n: number | undefined) {
    if (n === undefined) return "—";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

export const LeadDetailView = () => {
    const params = useParams<{ leadId: string }>();
    const router = useRouter();
    const leadId = params.leadId as Id<"leads"> | undefined;
    const lead = useQuery(api.private.leads.getOne, leadId ? { leadId } : "skip");
    const association = useQuery((api as any).private.leadAssociations.getByLead, leadId ? { leadId } : "skip");
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});

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
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (lead === null) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
                <p className="font-medium">Lead not found</p>
                <Button variant="outline" asChild>
                    <Link href="/crm/leads">Back to leads</Link>
                </Button>
            </div>
        );
    }

    const account = association?.accountId ? accounts?.find((a) => a._id === association.accountId) : undefined;
    const contact = association?.contactId ? contacts?.find((c) => c._id === association.contactId) : undefined;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 md:p-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex flex-col gap-4 border-b border-white/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">
                            <Link href="/crm/leads" className="text-indigo-600 hover:underline">
                                Leads
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Profile</span>
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">{lead.name}</h1>
                    </div>
                    <Button asChild className="gap-2">
                        <Link href={`/crm/leads/${lead._id}/edit`}>
                            <PencilIcon className="size-4" />
                            Edit lead
                        </Link>
                    </Button>
                </div>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Basic information</h2>
                    <Separator className="my-4" />
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Name</dt>
                            <dd className="font-medium">{lead.name}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Company</dt>
                            <dd>{lead.company ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Email</dt>
                            <dd>{lead.email ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Phone</dt>
                            <dd>{lead.phone ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Website</dt>
                            <dd>
                                {lead.website ? (
                                    <a href={lead.website} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                                        {lead.website}
                                    </a>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Address</dt>
                            <dd className="whitespace-pre-wrap">{lead.address ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Industry</dt>
                            <dd>{lead.industry ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Associated account</dt>
                            <dd>
                                {account ? (
                                    <Link className="text-indigo-600 hover:underline" href={`/crm/accounts/${account._id}`}>
                                        {account.name}
                                    </Link>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Associated contact</dt>
                            <dd>
                                {contact ? (
                                    <Link className="text-indigo-600 hover:underline" href={`/crm/contacts/${contact._id}`}>
                                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.firstName}
                                    </Link>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Lead information</h2>
                    <Separator className="my-4" />
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Lead source</dt>
                            <dd>{formatLeadSourceLabel(lead.leadSource)}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Lead status</dt>
                            <dd>
                                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm text-indigo-800">
                                    {displayLeadStatus(lead.stage)}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Lead score</dt>
                            <dd>{lead.leadScore ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Expected deal value</dt>
                            <dd>{money(lead.expectedDealValue)}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Product interest</dt>
                            <dd className="whitespace-pre-wrap">{lead.productInterest ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Assigned to</dt>
                            <dd>{lead.assignedToName ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Created date</dt>
                            <dd>{formatShortDate(leadCreatedAt(lead))}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Last contacted</dt>
                            <dd>{formatShortDate(lead.lastContactedAt)}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </div>
    );
};
