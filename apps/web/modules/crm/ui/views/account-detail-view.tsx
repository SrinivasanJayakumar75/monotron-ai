"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

export const AccountDetailView = () => {
    const params = useParams<{ accountId: string }>();
    const accountId = params.accountId as Id<"accounts"> | undefined;
    const account = useQuery(api.private.accounts.getOne, accountId ? { accountId } : "skip");
    const contacts = useQuery(api.private.contacts.list, accountId ? { accountId } : "skip");
    const linkedLeadIds = useQuery((api as any).private.leadAssociations.listByAccount, accountId ? { accountId } : "skip");
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
    const linkedLeads = leads.filter((l) => linkedLeadIds.includes(String(l._id)));

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
                </div>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Account information</h2>
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
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Email</dt>
                            <dd>{account.email ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Contacts</dt>
                            <dd>{contacts.length}</dd>
                        </div>
                    </dl>
                </section>
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Associated contacts</h2>
                    <Separator className="my-4" />
                    {contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No associated contacts.</p>
                    ) : (
                        <ul className="space-y-2">
                            {contacts.map((contact) => (
                                <li key={contact._id}>
                                    <Link className="text-indigo-600 hover:underline" href={`/crm/contacts/${contact._id}`}>
                                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.firstName}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Associated leads</h2>
                    <Separator className="my-4" />
                    {linkedLeads.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No associated leads.</p>
                    ) : (
                        <ul className="space-y-2">
                            {linkedLeads.map((lead) => (
                                <li key={lead._id}>
                                    <Link className="text-indigo-600 hover:underline" href={`/crm/leads/${lead._id}`}>
                                        {lead.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
};

