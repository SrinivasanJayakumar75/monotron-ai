"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ChangeEventHandler, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Trash2Icon } from "lucide-react";

type Contact = Doc<"contacts">;
type Account = Doc<"accounts">;

export const ContactsView = () => {
    const contacts = useQuery(api.private.contacts.list, {});
    const accounts = useQuery(api.private.accounts.list);
    const createContact = useMutation(api.private.contacts.create);
    const removeContact = useMutation(api.private.contacts.remove);
    const importContactsCsv = useMutation((api as any).private.contacts.importCsv);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [accountId, setAccountId] = useState<string>("none");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [title, setTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [search, setSearch] = useState("");
    const [filterAccount, setFilterAccount] = useState("all");
    const [filterHasEmail, setFilterHasEmail] = useState("all");
    const [filterIndustry, setFilterIndustry] = useState("all");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);

    const accountMap = useMemo(() => {
        if (!accounts) return new Map<string, Account>();
        return new Map(accounts.map((a: Account) => [a._id, a]));
    }, [accounts]);
    const industryOptions = useMemo(() => {
        return Array.from(
            new Set((accounts ?? []).map((a) => (a.industry ?? "").trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b));
    }, [accounts]);
    const filteredContacts = useMemo(() => {
        const rows = contacts ?? [];
        const byFilter = rows.filter((contact) => {
            const accountOk = filterAccount === "all" ? true : contact.accountId === filterAccount;
            const emailOk =
                filterHasEmail === "all"
                    ? true
                    : filterHasEmail === "yes"
                      ? Boolean(contact.email?.trim())
                      : !Boolean(contact.email?.trim());
            const account = contact.accountId ? accountMap.get(contact.accountId) : undefined;
            const industryOk =
                filterIndustry === "all"
                    ? true
                    : (account?.industry ?? "").trim().toLowerCase() === filterIndustry.toLowerCase();
            const createdAt = contact._creationTime;
            const fromMs = createdFrom ? new Date(createdFrom + "T00:00:00").getTime() : undefined;
            const toMs = createdTo ? new Date(createdTo + "T23:59:59.999").getTime() : undefined;
            const createdOk =
                (fromMs === undefined || createdAt >= fromMs) &&
                (toMs === undefined || createdAt <= toMs);
            return accountOk && emailOk && industryOk && createdOk;
        });
        const q = search.trim().toLowerCase();
        if (!q) return byFilter;
        return byFilter.filter((c) =>
            [c.firstName, c.lastName, c.email, c.phone, c.title]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [contacts, filterAccount, filterHasEmail, filterIndustry, createdFrom, createdTo, search, accountMap]);

    const exportFiltered = () => {
        const headers = ["first_name", "last_name", "email", "phone", "title", "account", "industry", "created_at"];
        const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const rows = filteredContacts.map((c) => {
            const account = c.accountId ? accountMap.get(c.accountId) : undefined;
            return [
                c.firstName,
                c.lastName ?? "",
                c.email ?? "",
                c.phone ?? "",
                c.title ?? "",
                account?.name ?? "",
                account?.industry ?? "",
                new Date(c._creationTime).toISOString(),
            ]
                .map((v) => escape(String(v)))
                .join(",");
        });
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Contacts exported");
    };

    const handleCreate = async () => {
        const trimmedFirst = firstName.trim();
        if (!trimmedFirst) {
            toast.error("First name is required");
            return;
        }

        setIsCreating(true);
        try {
            await createContact({
                accountId: accountId === "none" ? undefined : (accountId as Id<"accounts">),
                firstName: trimmedFirst,
                lastName: lastName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                title: title.trim() || undefined,
            });
            setAccountId("none");
            setFirstName("");
            setLastName("");
            setEmail("");
            setPhone("");
            setTitle("");
            toast.success("Contact created");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create contact";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (contactId: Id<"contacts">) => {
        try {
            await removeContact({ contactId });
            toast.success("Contact deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete contact";
            toast.error(message);
        }
    };

    const onImportCsv: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const csv = await file.text();
        try {
            const result = await importContactsCsv({ csv });
            toast.success(`Imported ${result.imported} contact${result.imported === 1 ? "" : "s"}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Import failed");
        } finally {
            e.target.value = "";
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl md:text-4xl">Contacts</h1>
                            <p className="text-muted-foreground">Manage people and their account relationship.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                Import contacts
                            </Button>
                            <Button variant="outline" onClick={exportFiltered}>
                                Export data
                            </Button>
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => setShowCreateForm((v) => !v)}>
                                {showCreateForm ? "Hide form" : "Create contact"}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={onImportCsv}
                            />
                        </div>
                    </div>
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white/80 p-3 md:grid-cols-6">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email..." />
                        <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Filter by account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All accounts</SelectItem>
                                {(accounts ?? []).map((a) => (
                                    <SelectItem key={a._id} value={a._id}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterHasEmail} onValueChange={setFilterHasEmail}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Email filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All contacts</SelectItem>
                                <SelectItem value="yes">Has email</SelectItem>
                                <SelectItem value="no">Missing email</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Industry" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All industries</SelectItem>
                                {industryOptions.map((industry) => (
                                    <SelectItem key={industry} value={industry}>
                                        {industry}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
                        <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
                    </div>
                </div>

                {showCreateForm && (
                <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-6">
                        <div className="md:col-span-2 space-y-1">
                            <Label>First name</Label>
                            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                        </div>
                        <div className="space-y-1">
                            <Label>Last name</Label>
                            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                        </div>
                        <div className="space-y-1 md:col-span-1">
                            <Label>Account</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {accounts?.map((a: Account) => (
                                        <SelectItem key={a._id} value={a._id}>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 ..." />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sales Lead" />
                        </div>

                        <div className="md:col-span-6 flex items-end">
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleCreate} disabled={isCreating}>
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
                )}

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : filteredContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No contacts match this view
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact: Contact) => {
                                    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
                                    const account = contact.accountId ? accountMap.get(contact.accountId) : undefined;
                                    return (
                                        <TableRow key={contact._id}>
                                            <TableCell className="font-medium">
                                                <Link className="text-indigo-700 hover:underline" href={`/crm/contacts/${contact._id}`}>
                                                    {fullName || "Contact"}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{account?.name ?? "—"}</TableCell>
                                            <TableCell>{contact.email ?? "—"}</TableCell>
                                            <TableCell>{contact.phone ?? "—"}</TableCell>
                                            <TableCell>{contact.title ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(contact._id)}
                                                    aria-label={`Delete ${fullName}`}
                                                >
                                                    <Trash2Icon className="size-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

