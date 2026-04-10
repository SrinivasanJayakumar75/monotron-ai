"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ChangeEventHandler, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
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
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Building2Icon, SearchIcon, Trash2Icon } from "lucide-react";
import { CRM_ACTIVITY_TYPE_OPTIONS, type CrmActivityTypeValue } from "../crm-activity-constants";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

type Contact = Doc<"contacts">;
type Account = Doc<"accounts">;

export const ContactsView = () => {
    const { user } = useUser();
    const contacts = useQuery(api.private.contacts.list, {});
    const accounts = useQuery(api.private.accounts.list);
    const createContact = useMutation(api.private.contacts.create);
    const createActivity = useMutation(api.private.activities.create);
    const removeContact = useMutation(api.private.contacts.remove);
    const importContactsCsv = useMutation((api as any).private.contacts.importCsv);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [accountId, setAccountId] = useState<string>("none");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [title, setTitle] = useState("");
    const [activityType, setActivityType] = useState<CrmActivityTypeValue>("task");
    const [activitySubject, setActivitySubject] = useState("");
    const [activityDescription, setActivityDescription] = useState("");
    const [activityDueDate, setActivityDueDate] = useState("");
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

    const contactStats = useMemo(() => {
        const rows = contacts ?? [];
        const withEmail = rows.filter((c) => Boolean(c.email?.trim())).length;
        const withAccount = rows.filter((c) => Boolean(c.accountId)).length;
        return { total: rows.length, withEmail, withAccount };
    }, [contacts]);

    function initialsFor(first: string, last?: string) {
        const a = (first.trim()[0] ?? "").toUpperCase();
        const b = (last?.trim()[0] ?? "").toUpperCase();
        return (a + b || a || "?").slice(0, 2);
    }

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
            const contactId = await createContact({
                accountId: accountId === "none" ? undefined : (accountId as Id<"accounts">),
                firstName: trimmedFirst,
                lastName: lastName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                title: title.trim() || undefined,
            });
            const actSubject = activitySubject.trim();
            if (actSubject) {
                await createActivity({
                    type: activityType,
                    subject: actSubject,
                    description: activityDescription.trim() || undefined,
                    dueAt: activityDueDate
                        ? new Date(`${activityDueDate}T12:00:00`).getTime()
                        : undefined,
                    relatedContactId: contactId,
                    assignee: user?.fullName || user?.primaryEmailAddress?.emailAddress || undefined,
                });
            }
            setAccountId("none");
            setFirstName("");
            setLastName("");
            setEmail("");
            setPhone("");
            setTitle("");
            setActivityType("task");
            setActivitySubject("");
            setActivityDescription("");
            setActivityDueDate("");
            setShowCreateForm(false);
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
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 p-6 md:p-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Contacts</h1>
                        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed md:text-base">
                            People tied to accounts — use this list for outreach, handoffs, and bulk email recipient
                            picks.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            Import contacts
                        </Button>
                        <Button variant="outline" onClick={exportFiltered}>
                            Export data
                        </Button>
                        <Button
                            className={CRM_PRIMARY_BTN}
                            onClick={() => setShowCreateForm((v) => !v)}
                        >
                            {showCreateForm ? "Close form" : "Create contact"}
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

                <Card className="border-slate-200/80 shadow-sm">
                    <CardContent className="grid gap-3 p-4 md:grid-cols-6">
                        <div className="relative md:col-span-2">
                            <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, title, phone, email…"
                                className="h-10 pl-9"
                            />
                        </div>
                        <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger className="h-10">
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
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Email filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All contacts</SelectItem>
                                <SelectItem value="yes">Has email</SelectItem>
                                <SelectItem value="no">Missing email</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                            <SelectTrigger className="h-10">
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
                        <Input
                            type="date"
                            value={createdFrom}
                            onChange={(e) => setCreatedFrom(e.target.value)}
                            className="h-10"
                        />
                        <Input
                            type="date"
                            value={createdTo}
                            onChange={(e) => setCreatedTo(e.target.value)}
                            className="h-10"
                        />
                    </CardContent>
                </Card>

                {showCreateForm && (
                <Card className="border-indigo-200/50 bg-indigo-50/15 shadow-md">
                    <CardContent className="p-6">
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

                        <div className="md:col-span-6 space-y-3 border-t border-slate-100 pt-4">
                            <div>
                                <p className="text-sm font-medium">Initial activity (optional)</p>
                                <p className="text-muted-foreground text-xs">
                                    Creates a CRM activity linked to this contact when you add a subject.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-6">
                                <div className="space-y-1">
                                    <Label>Activity type</Label>
                                    <Select
                                        value={activityType}
                                        onValueChange={(v) => setActivityType(v as CrmActivityTypeValue)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CRM_ACTIVITY_TYPE_OPTIONS.map((o) => (
                                                <SelectItem key={o.value} value={o.value}>
                                                    {o.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Due date</Label>
                                    <Input
                                        type="date"
                                        value={activityDueDate}
                                        onChange={(e) => setActivityDueDate(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-1">
                                    <Label>Subject</Label>
                                    <Input
                                        value={activitySubject}
                                        onChange={(e) => setActivitySubject(e.target.value)}
                                        placeholder="e.g. Send welcome email"
                                    />
                                </div>
                                <div className="md:col-span-6 space-y-1">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={activityDescription}
                                        onChange={(e) => setActivityDescription(e.target.value)}
                                        placeholder="Notes…"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-6 flex items-end">
                            <Button className={CRM_PRIMARY_BTN} onClick={handleCreate} disabled={isCreating}>
                                Create
                            </Button>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                )}

                <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                <TableHead className="min-w-[220px]">Contact</TableHead>
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
                                    <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : filteredContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                                        {search ||
                                        filterAccount !== "all" ||
                                        filterHasEmail !== "all" ||
                                        filterIndustry !== "all" ||
                                        createdFrom ||
                                        createdTo
                                            ? "No contacts match these filters — adjust search or filters above."
                                            : "No contacts yet. Add someone or import a CSV to get started."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact: Contact) => {
                                    const fullName =
                                        [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                                        contact.firstName;
                                    const account = contact.accountId ? accountMap.get(contact.accountId) : undefined;
                                    const ini = initialsFor(contact.firstName, contact.lastName ?? undefined);
                                    return (
                                        <TableRow key={contact._id} className="group">
                                            <TableCell>
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-gradient-to-br from-indigo-100 to-white text-xs font-semibold text-indigo-900"
                                                        aria-hidden
                                                    >
                                                        {ini}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            className="font-semibold text-indigo-800 hover:text-indigo-950 hover:underline"
                                                            href={`/crm/contacts/${contact._id}`}
                                                        >
                                                            {fullName}
                                                        </Link>
                                                        {contact.title?.trim() ? (
                                                            <p className="text-muted-foreground text-xs">{contact.title}</p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {account ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Link
                                                            href={`/crm/accounts/${account._id}`}
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-800 hover:underline"
                                                        >
                                                            <Building2Icon className="size-3.5 opacity-70" />
                                                            {account.name}
                                                        </Link>
                                                        {account.industry?.trim() ? (
                                                            <Badge variant="outline" className="w-fit font-normal text-xs">
                                                                {account.industry}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary" className="font-normal">
                                                        Unassigned
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {contact.email?.trim() ? (
                                                    <a
                                                        href={`mailto:${contact.email}`}
                                                        className="text-sm text-indigo-700 hover:underline"
                                                    >
                                                        {contact.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{contact.phone ?? "—"}</TableCell>
                                            <TableCell className="max-w-[160px] truncate text-sm">
                                                {contact.title ?? "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-70 hover:opacity-100"
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
                </Card>
            </div>
        </div>
    );
};

