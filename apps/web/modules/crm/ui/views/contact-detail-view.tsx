"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

export const ContactDetailView = () => {
    const params = useParams<{ contactId: string }>();
    const contactId = params.contactId as Id<"contacts"> | undefined;
    const contact = useQuery(api.private.contacts.getOne, contactId ? { contactId } : "skip");
    const accounts = useQuery(api.private.accounts.list);

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
                            <dd>{contact.email ?? "—"}</dd>
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
                            <dd>{account?.name ?? "—"}</dd>
                        </div>
                    </dl>
                </section>
            </div>
        </div>
    );
};

