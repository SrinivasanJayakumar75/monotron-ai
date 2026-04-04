"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { PencilIcon } from "lucide-react";
import {
    CrmActivitiesEmptyStateLinks,
    CrmProfileActivitiesSection,
} from "../components/crm-profile-activities-section";
import { cn } from "@workspace/ui/lib/utils";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

export const AccountDetailView = () => {
    const params = useParams<{ accountId: string }>();
    const accountId = params.accountId as Id<"accounts"> | undefined;
    const account = useQuery(api.private.accounts.getOne, accountId ? { accountId } : "skip");
    const accountActivities = useQuery(api.private.activities.listByAccount, accountId ? { accountId } : "skip");
    const contacts = useQuery(
        api.private.contacts.listRelatedToAccount,
        accountId ? { accountId } : "skip",
    );
    const linkedLeadIds = useQuery(api.private.leadAssociations.listByAccount, accountId ? { accountId } : "skip");
    const leads = useQuery(api.private.leads.list, {});

    if (!accountId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid account.</p>
                <Button className="mt-4" asChild variant="outline">
                    <Link href="/crm/accounts">Back to accounts</Link>
                </Button>
            </div>
        );
    }

    if (account === undefined || contacts === undefined || leads === undefined || linkedLeadIds === undefined) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (account === null) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
                <p className="font-medium">Account not found</p>
                <Button variant="outline" asChild>
                    <Link href="/crm/accounts">Back to accounts</Link>
                </Button>
            </div>
        );
    }

    const linkedLeadIdSet = new Set(linkedLeadIds.map(String));
    const linkedLeads = leads.filter((l) => linkedLeadIdSet.has(String(l._id)));
    const accountEmail = account.email?.trim() ?? "";
    const accountGmailComposeUrl = accountEmail
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(accountEmail)}`
        : "";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 md:p-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex flex-col gap-4 border-b border-white/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">
                            <Link href="/crm/accounts" className="text-indigo-600 hover:underline">
                                Accounts
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Profile</span>
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">{account.name}</h1>
                    </div>
                    <Button asChild className={cn("gap-2", CRM_PRIMARY_BTN)}>
                        <Link href={`/crm/accounts/${account._id}/edit`}>
                            <PencilIcon className="size-4" />
                            Edit account
                        </Link>
                    </Button>
                </div>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Account information</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Company details, linked contacts, and leads you associated with this account.
                    </p>
                    <Separator className="my-4" />
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Name</dt>
                            <dd className="font-medium">{account.name}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Industry</dt>
                            <dd>{account.industry ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Website</dt>
                            <dd>
                                {account.website ? (
                                    <a href={account.website} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                                        {account.website}
                                    </a>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Phone</dt>
                            <dd>{account.phone ?? "—"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Email</dt>
                            <dd>
                                {accountEmail ? (
                                    <a
                                        href={accountGmailComposeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 hover:underline"
                                    >
                                        {accountEmail}
                                    </a>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                    </dl>

                    <Separator className="my-6" />
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-900">Associated contacts</h3>
                        <p className="text-muted-foreground text-xs">
                            People on this account (including any linked from leads tied to this account).
                        </p>
                        {contacts.length === 0 ? (
                            <p className="text-muted-foreground text-sm">None yet — add them when creating or editing this account.</p>
                        ) : (
                            <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-3">
                                {contacts.map((contact) => (
                                    <li key={contact._id}>
                                        <Link className="text-indigo-600 hover:underline" href={`/crm/contacts/${contact._id}`}>
                                            {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.firstName}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <Separator className="my-6" />
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-900">Associated leads</h3>
                        <p className="text-muted-foreground text-xs">Leads you linked to this account.</p>
                        {linkedLeads.length === 0 ? (
                            <p className="text-muted-foreground text-sm">None yet — add them when creating or editing this account.</p>
                        ) : (
                            <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-3">
                                {linkedLeads.map((lead) => (
                                    <li key={lead._id}>
                                        <Link className="text-indigo-600 hover:underline" href={`/crm/leads/${lead._id}`}>
                                            {lead.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <CrmProfileActivitiesSection
                    activities={accountActivities}
                    subtitle="Tasks, calls, emails, and meetings linked to this account."
                    createContext={{ relatedAccountId: account._id }}
                    emptyState={
                        <>
                            No activities linked to this account yet.{" "}
                            <span className="mt-2 block text-xs">
                                <CrmActivitiesEmptyStateLinks />
                            </span>
                        </>
                    }
                />
            </div>
        </div>
    );
};
