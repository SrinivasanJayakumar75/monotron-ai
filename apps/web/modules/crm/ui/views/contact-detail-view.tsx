"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
    CrmActivitiesEmptyStateLinks,
    CrmProfileActivitiesSection,
} from "../components/crm-profile-activities-section";
import { PencilIcon } from "lucide-react";

export const ContactDetailView = () => {
    const params = useParams<{ contactId: string }>();
    const contactId = params.contactId as Id<"contacts"> | undefined;
    const contact = useQuery(api.private.contacts.getOne, contactId ? { contactId } : "skip");
    const contactActivities = useQuery(api.private.activities.listByContact, contactId ? { contactId } : "skip");
    const accounts = useQuery(api.private.accounts.list);
    const contactsAtSameAccount = useQuery(
        api.private.contacts.list,
        contact !== undefined && contact !== null && contact.accountId
            ? { accountId: contact.accountId }
            : "skip",
    );

    if (!contactId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid contact.</p>
                <Button className="mt-4" asChild variant="outline">
                    <Link href="/crm/contacts">Back to contacts</Link>
                </Button>
            </div>
        );
    }

    if (contact === undefined || accounts === undefined) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-6">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (contact === null) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
                <p className="font-medium">Contact not found</p>
                <Button variant="outline" asChild>
                    <Link href="/crm/contacts">Back to contacts</Link>
                </Button>
            </div>
        );
    }

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    const account = contact.accountId ? accounts.find((a) => a._id === contact.accountId) : undefined;
    const otherContactsAtAccount =
        contact.accountId && contactsAtSameAccount
            ? contactsAtSameAccount.filter((c) => c._id !== contact._id)
            : [];
    const contactEmail = contact.email?.trim() ?? "";
    const contactGmailComposeUrl = contactEmail
        ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactEmail)}`
        : "";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 md:p-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex flex-col gap-4 border-b border-white/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-muted-foreground text-sm">
                            <Link href="/crm/contacts" className="text-indigo-600 hover:underline">
                                Contacts
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Profile</span>
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">{fullName || "Contact"}</h1>
                    </div>
                    <Button asChild className="gap-2">
                        <Link href={`/crm/contacts/${contact._id}/edit`}>
                            <PencilIcon className="size-4" />
                            Edit contact
                        </Link>
                    </Button>
                </div>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Contact information</h2>
                    <Separator className="my-4" />
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">First name</dt>
                            <dd className="font-medium">{contact.firstName}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Last name</dt>
                            <dd>{contact.lastName ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Email</dt>
                            <dd>
                                {contactEmail ? (
                                    <a
                                        href={contactGmailComposeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 hover:underline"
                                    >
                                        {contactEmail}
                                    </a>
                                ) : (
                                    "—"
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Phone</dt>
                            <dd>{contact.phone ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Title</dt>
                            <dd>{contact.title ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Account</dt>
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
                    </dl>
                </section>

                {contact.accountId ? (
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">Other contacts at this account</h2>
                        <Separator className="my-4" />
                        {contactsAtSameAccount === undefined ? (
                            <p className="text-muted-foreground text-sm">Loading…</p>
                        ) : otherContactsAtAccount.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No other contacts linked to this account yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {otherContactsAtAccount.map((c) => (
                                    <li key={c._id}>
                                        <Link className="text-indigo-600 hover:underline" href={`/crm/contacts/${c._id}`}>
                                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                ) : null}

                <CrmProfileActivitiesSection
                    activities={contactActivities}
                    subtitle="Tasks, calls, emails, and meetings linked to this contact."
                    createContext={{ relatedContactId: contact._id }}
                    emptyState={
                        <>
                            No activities linked to this contact yet.{" "}
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

