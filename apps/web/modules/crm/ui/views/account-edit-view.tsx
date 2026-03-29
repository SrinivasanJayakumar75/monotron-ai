"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { PencilIcon, XIcon } from "lucide-react";

type Account = Doc<"accounts">;
type Contact = Doc<"contacts">;
type Lead = Doc<"leads">;

export const AccountEditView = () => {
    const params = useParams<{ accountId: string }>();
    const router = useRouter();
    const accountId = params.accountId as Id<"accounts"> | undefined;

    const account = useQuery(api.private.accounts.getOne, accountId ? { accountId } : "skip");
    const contactsOnAccount = useQuery(
        api.private.contacts.listRelatedToAccount,
        accountId ? { accountId } : "skip",
    );
    const allContacts = useQuery(api.private.contacts.list, {});
    const allLeads = useQuery(api.private.leads.list, {});
    const linkedLeadIdsRaw = useQuery((api as any).private.leadAssociations.listByAccount, accountId ? { accountId } : "skip");

    const updateAccount = useMutation(api.private.accounts.update);
    const setContactAccount = useMutation(api.private.contacts.setAccount);
    const upsertLeadAssociation = useMutation((api as any).private.leadAssociations.upsert);

    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [linkedContactIds, setLinkedContactIds] = useState<Id<"contacts">[]>([]);
    const [linkedLeadIds, setLinkedLeadIds] = useState<Id<"leads">[]>([]);
    const [pickContact, setPickContact] = useState<string>("__none__");
    const [pickLead, setPickLead] = useState<string>("__none__");
    const [hydrated, setHydrated] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!account || account === null) return;
        setName(account.name);
        setWebsite(account.website ?? "");
        setIndustry(account.industry ?? "");
        setPhone(account.phone ?? "");
        setEmail(account.email ?? "");
        setHydrated(true);
    }, [account]);

    useEffect(() => {
        if (!contactsOnAccount) return;
        setLinkedContactIds(contactsOnAccount.map((c) => c._id));
    }, [contactsOnAccount]);

    useEffect(() => {
        if (!linkedLeadIdsRaw || !allLeads) return;
        const set = new Set(linkedLeadIdsRaw as string[]);
        setLinkedLeadIds(allLeads.filter((l) => set.has(String(l._id))).map((l) => l._id));
    }, [linkedLeadIdsRaw, allLeads]);

    const contactOptions = useMemo(() => {
        const rows = allContacts ?? [];
        const linked = new Set(linkedContactIds.map(String));
        return rows.filter((c) => !linked.has(String(c._id)));
    }, [allContacts, linkedContactIds]);

    const leadOptions = useMemo(() => {
        const rows = allLeads ?? [];
        const linked = new Set(linkedLeadIds.map(String));
        return rows.filter((l) => !linked.has(String(l._id)));
    }, [allLeads, linkedLeadIds]);

    const addContact = () => {
        if (pickContact === "__none__") return;
        const id = pickContact as Id<"contacts">;
        setLinkedContactIds((prev) => [...prev, id]);
        setPickContact("__none__");
    };

    const addLead = () => {
        if (pickLead === "__none__") return;
        const id = pickLead as Id<"leads">;
        setLinkedLeadIds((prev) => [...prev, id]);
        setPickLead("__none__");
    };

    const save = async () => {
        if (!accountId || !account) return;
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("Account name is required");
            return;
        }
        setSubmitting(true);
        try {
            await updateAccount({
                accountId,
                name: trimmed,
                website: website.trim() || undefined,
                industry: industry.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });

            const currentContactIds = new Set((contactsOnAccount ?? []).map((c) => String(c._id)));
            const desiredContact = new Set(linkedContactIds.map(String));
            for (const c of contactsOnAccount ?? []) {
                if (!desiredContact.has(String(c._id))) {
                    await setContactAccount({ contactId: c._id, accountId: null });
                }
            }
            for (const id of linkedContactIds) {
                if (!currentContactIds.has(String(id))) {
                    await setContactAccount({ contactId: id, accountId });
                }
            }

            const currentLeadIds = new Set((linkedLeadIdsRaw ?? []) as string[]);
            const desiredLead = new Set(linkedLeadIds.map(String));
            for (const lid of linkedLeadIdsRaw ?? []) {
                if (!desiredLead.has(String(lid))) {
                    await upsertLeadAssociation({
                        leadId: lid as Id<"leads">,
                        accountId: null,
                    });
                }
            }
            for (const lid of linkedLeadIds) {
                if (!currentLeadIds.has(String(lid))) {
                    await upsertLeadAssociation({
                        leadId: lid,
                        accountId,
                    });
                }
            }

            toast.success("Account updated");
            router.push(`/crm/accounts/${accountId}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
            setSubmitting(false);
        }
    };

    if (!accountId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid account.</p>
            </div>
        );
    }

    if (
        account === undefined ||
        contactsOnAccount === undefined ||
        allContacts === undefined ||
        allLeads === undefined ||
        linkedLeadIdsRaw === undefined ||
        !hydrated
    ) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (account === null) {
        return (
            <div className="p-6">
                <p className="font-medium">Account not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/crm/accounts">Back to accounts</Link>
                </Button>
            </div>
        );
    }

    const contactLabel = (c: Contact) =>
        [c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName;

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
                            <Link href={`/crm/accounts/${accountId}`} className="text-indigo-600 hover:underline">
                                {account.name}
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Edit</span>
                        </p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                            <PencilIcon className="size-6 text-indigo-600" />
                            Edit account
                        </h1>
                    </div>
                </div>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Account details</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2 space-y-1">
                            <Label>Account name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Website</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Industry</Label>
                            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Associated contacts</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Contacts linked to this account (also shown on each contact&apos;s profile).
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {linkedContactIds.length === 0 ? (
                            <p className="text-muted-foreground text-sm">None yet.</p>
                        ) : (
                            linkedContactIds.map((id) => {
                                const c = allContacts.find((x) => x._id === id);
                                return (
                                    <span
                                        key={id}
                                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
                                    >
                                        {c ? contactLabel(c) : id}
                                        <button
                                            type="button"
                                            className="rounded p-0.5 hover:bg-slate-200"
                                            aria-label="Remove"
                                            onClick={() =>
                                                setLinkedContactIds((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <XIcon className="size-3.5" />
                                        </button>
                                    </span>
                                );
                            })
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px] flex-1 space-y-1">
                            <Label>Add contact</Label>
                            <Select value={pickContact} onValueChange={setPickContact}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Choose contact" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Select…</SelectItem>
                                    {contactOptions.map((c) => (
                                        <SelectItem key={c._id} value={c._id}>
                                            {contactLabel(c)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="button" variant="secondary" onClick={addContact}>
                            Add
                        </Button>
                    </div>
                </section>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Associated leads</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Leads linked to this account (same associations as on the lead edit screen).
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {linkedLeadIds.length === 0 ? (
                            <p className="text-muted-foreground text-sm">None yet.</p>
                        ) : (
                            linkedLeadIds.map((id) => {
                                const lead = allLeads.find((l) => l._id === id);
                                return (
                                    <span
                                        key={id}
                                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-900"
                                    >
                                        {lead?.name ?? id}
                                        <button
                                            type="button"
                                            className="rounded p-0.5 hover:bg-indigo-100"
                                            aria-label="Remove"
                                            onClick={() =>
                                                setLinkedLeadIds((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <XIcon className="size-3.5" />
                                        </button>
                                    </span>
                                );
                            })
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px] flex-1 space-y-1">
                            <Label>Add lead</Label>
                            <Select value={pickLead} onValueChange={setPickLead}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Choose lead" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Select…</SelectItem>
                                    {leadOptions.map((l) => (
                                        <SelectItem key={l._id} value={l._id}>
                                            {l.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="button" variant="secondary" onClick={addLead}>
                            Add
                        </Button>
                    </div>
                </section>

                <div className="flex flex-wrap gap-2">
                    <Button
                        className="bg-indigo-600 text-white hover:bg-indigo-500"
                        onClick={() => void save()}
                        disabled={submitting}
                    >
                        {submitting ? "Saving…" : "Save changes"}
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/crm/accounts/${accountId}`}>Cancel</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};
