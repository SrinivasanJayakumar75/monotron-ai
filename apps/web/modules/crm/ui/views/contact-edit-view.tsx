"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
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
import { PencilIcon } from "lucide-react";

type Account = Doc<"accounts">;

export const ContactEditView = () => {
    const params = useParams<{ contactId: string }>();
    const router = useRouter();
    const contactId = params.contactId as Id<"contacts"> | undefined;

    const contact = useQuery(api.private.contacts.getOne, contactId ? { contactId } : "skip");
    const accounts = useQuery(api.private.accounts.list);

    const updateContact = useMutation(api.private.contacts.update);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [title, setTitle] = useState("");
    const [accountId, setAccountId] = useState<string>("__none__");
    const [hydrated, setHydrated] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!contact || contact === null) return;
        setFirstName(contact.firstName);
        setLastName(contact.lastName ?? "");
        setEmail(contact.email ?? "");
        setPhone(contact.phone ?? "");
        setTitle(contact.title ?? "");
        setAccountId(contact.accountId ? String(contact.accountId) : "__none__");
        setHydrated(true);
    }, [contact]);

    const save = async () => {
        if (!contactId || !contact) return;
        const trimmedFirst = firstName.trim();
        if (!trimmedFirst) {
            toast.error("First name is required");
            return;
        }
        setSubmitting(true);
        try {
            await updateContact({
                contactId,
                firstName: trimmedFirst,
                lastName: lastName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                title: title.trim() || undefined,
                accountId:
                    accountId === "__none__" ? null : (accountId as Id<"accounts">),
            });

            toast.success("Contact updated");
            router.push(`/crm/contacts/${contactId}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
            setSubmitting(false);
        }
    };

    if (!contactId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid contact.</p>
            </div>
        );
    }

    if (contact === undefined || accounts === undefined || !hydrated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (contact === null) {
        return (
            <div className="p-6">
                <p className="font-medium">Contact not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/crm/contacts">Back to contacts</Link>
                </Button>
            </div>
        );
    }

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.firstName;

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
                            <Link href={`/crm/contacts/${contactId}`} className="text-indigo-600 hover:underline">
                                {fullName}
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Edit</span>
                        </p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                            <PencilIcon className="size-6 text-indigo-600" />
                            Edit contact
                        </h1>
                    </div>
                </div>

                <section className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Contact details</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>First name</Label>
                            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Last name</Label>
                            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                            <Label>Account</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {(accounts as Account[]).map((a) => (
                                        <SelectItem key={a._id} value={a._id}>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                            <Label>Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
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
                        <Link href={`/crm/contacts/${contactId}`}>Cancel</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};
