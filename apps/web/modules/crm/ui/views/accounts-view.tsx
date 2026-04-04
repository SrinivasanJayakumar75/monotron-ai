"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ChangeEventHandler, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Building2Icon, ExternalLinkIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { CRM_ACTIVITY_TYPE_OPTIONS, type CrmActivityTypeValue } from "../crm-activity-constants";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

type Account = Doc<"accounts">;
type Contact = Doc<"contacts">;

export const AccountsView = () => {
    const router = useRouter();
    const { user } = useUser();
    const accounts = useQuery(api.private.accounts.list);
    const allContacts = useQuery(api.private.contacts.list, {});
    const leads = useQuery(api.private.leads.list, {});
    const createAccount = useMutation(api.private.accounts.create);
    const upsertLeadAssociation = useMutation(api.private.leadAssociations.upsert);
    const createActivity = useMutation(api.private.activities.create);
    const removeAccount = useMutation(api.private.accounts.remove);
    const importAccountsCsv = useMutation((api as any).private.accounts.importCsv);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [activityType, setActivityType] = useState<CrmActivityTypeValue>("task");
    const [activitySubject, setActivitySubject] = useState("");
    const [activityDescription, setActivityDescription] = useState("");
    const [activityDueDate, setActivityDueDate] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [search, setSearch] = useState("");
    const [industryFilter, setIndustryFilter] = useState("all");
    const [websiteFilter, setWebsiteFilter] = useState("all");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [linkedContactIds, setLinkedContactIds] = useState<Id<"contacts">[]>([]);
    const [linkedLeadIds, setLinkedLeadIds] = useState<Id<"leads">[]>([]);
    const [pickContact, setPickContact] = useState("__none__");
    const [pickLead, setPickLead] = useState("__none__");

    const industryOptions = useMemo(() => {
        const vals = Array.from(
            new Set((accounts ?? []).map((a) => (a.industry ?? "").trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b));
        return vals;
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        const rows = accounts ?? [];
        const byFilter = rows.filter((a) => {
            const industryOk = industryFilter === "all" ? true : (a.industry ?? "") === industryFilter;
            const websiteOk =
                websiteFilter === "all"
                    ? true
                    : websiteFilter === "yes"
                      ? Boolean(a.website?.trim())
                      : !Boolean(a.website?.trim());
            const fromMs = createdFrom ? new Date(createdFrom + "T00:00:00").getTime() : undefined;
            const toMs = createdTo ? new Date(createdTo + "T23:59:59.999").getTime() : undefined;
            const createdOk =
                (fromMs === undefined || a._creationTime >= fromMs) &&
                (toMs === undefined || a._creationTime <= toMs);
            return industryOk && websiteOk && createdOk;
        });
        const q = search.trim().toLowerCase();
        if (!q) return byFilter;
        return byFilter.filter((a) =>
            [a.name, a.industry, a.website, a.phone, a.email]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [accounts, industryFilter, websiteFilter, createdFrom, createdTo, search]);

    const contactOptionsForCreate = useMemo(() => {
        const rows = allContacts ?? [];
        const linked = new Set(linkedContactIds.map(String));
        return rows.filter((c) => !linked.has(String(c._id)));
    }, [allContacts, linkedContactIds]);

    const leadOptionsForCreate = useMemo(() => {
        const rows = leads ?? [];
        const linked = new Set(linkedLeadIds.map(String));
        return rows.filter((l) => !linked.has(String(l._id)));
    }, [leads, linkedLeadIds]);

    const contactLabel = (c: Contact) =>
        [c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName;

    const onPickContactForCreate = (value: string) => {
        if (value === "__none__") {
            setPickContact("__none__");
            return;
        }
        const id = value as Id<"contacts">;
        setLinkedContactIds((prev) =>
            prev.some((x) => String(x) === value) ? prev : [...prev, id],
        );
        setPickContact("__none__");
    };

    const onPickLeadForCreate = (value: string) => {
        if (value === "__none__") {
            setPickLead("__none__");
            return;
        }
        const id = value as Id<"leads">;
        setLinkedLeadIds((prev) =>
            prev.some((x) => String(x) === value) ? prev : [...prev, id],
        );
        setPickLead("__none__");
    };

    const exportFiltered = () => {
        const headers = ["name", "website", "industry", "phone", "email", "created_at"];
        const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const rows = filteredAccounts.map((a) =>
            [
                a.name,
                a.website ?? "",
                a.industry ?? "",
                a.phone ?? "",
                a.email ?? "",
                new Date(a._creationTime).toISOString(),
            ]
                .map((v) => escape(String(v)))
                .join(","),
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `accounts-export-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Accounts exported");
    };

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Account name is required");
            return;
        }

        setIsCreating(true);
        try {
            const accountId = await createAccount({
                name: trimmedName,
                website: website.trim() || undefined,
                industry: industry.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                linkedContactIds:
                    linkedContactIds.length > 0 ? linkedContactIds : undefined,
            });
            for (const lid of linkedLeadIds) {
                await upsertLeadAssociation({ leadId: lid, accountId });
            }
            const actSubject = activitySubject.trim();
            if (actSubject) {
                await createActivity({
                    type: activityType,
                    subject: actSubject,
                    description: activityDescription.trim() || undefined,
                    dueAt: activityDueDate
                        ? new Date(`${activityDueDate}T12:00:00`).getTime()
                        : undefined,
                    relatedAccountId: accountId,
                    assignee: user?.fullName || user?.primaryEmailAddress?.emailAddress || undefined,
                });
            }
            setName("");
            setWebsite("");
            setIndustry("");
            setPhone("");
            setEmail("");
            setActivityType("task");
            setActivitySubject("");
            setActivityDescription("");
            setActivityDueDate("");
            setLinkedContactIds([]);
            setLinkedLeadIds([]);
            setPickContact("__none__");
            setPickLead("__none__");
            toast.success("Account created");
            router.push(`/crm/accounts/${accountId}`);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create account";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (accountId: Id<"accounts">) => {
        try {
            await removeAccount({ accountId });
            toast.success("Account deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete account";
            toast.error(message);
        }
    };

    const onImportCsv: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const csv = await file.text();
        try {
            const result = await importAccountsCsv({ csv });
            toast.success(`Imported ${result.imported} account${result.imported === 1 ? "" : "s"}`);
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
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Accounts</h1>
                        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed md:text-base">
                            Companies you sell to — link contacts and leads so activities and deals stay connected.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            Import accounts
                        </Button>
                        <Button variant="outline" onClick={exportFiltered}>
                            Export data
                        </Button>
                        <Button
                            className={CRM_PRIMARY_BTN}
                            onClick={() => setShowCreateForm((v) => !v)}
                        >
                            {showCreateForm ? "Close form" : "Create account"}
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
                    <CardContent className="grid gap-3 p-4 md:grid-cols-5">
                        <div className="relative md:col-span-2">
                            <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, website, industry, phone, email…"
                                className="h-10 pl-9"
                            />
                        </div>
                        <Select value={industryFilter} onValueChange={setIndustryFilter}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Industry" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All industries</SelectItem>
                                {industryOptions.map((ind) => (
                                    <SelectItem key={ind} value={ind}>
                                        {ind}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Website" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All accounts</SelectItem>
                                <SelectItem value="yes">Has website</SelectItem>
                                <SelectItem value="no">Missing website</SelectItem>
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
                        <div className="grid gap-4 md:grid-cols-5">
                        <div className="md:col-span-2 space-y-1">
                            <Label>Account name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
                        </div>
                        <div className="space-y-1">
                            <Label>Website</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
                        </div>
                        <div className="space-y-1">
                            <Label>Industry</Label>
                            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 ..." />
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@acme.com" />
                        </div>

                        <div className="md:col-span-5 space-y-3 border-t border-slate-100 pt-4">
                            <div>
                                <p className="text-sm font-medium">Associated contacts &amp; leads (optional)</p>
                                <p className="text-muted-foreground text-xs">
                                    Pick a contact or lead from the list to link it (no separate &quot;Add&quot; step).
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Contacts</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {linkedContactIds.length === 0 ? (
                                            <span className="text-muted-foreground text-xs">None selected</span>
                                        ) : (
                                            linkedContactIds.map((id) => {
                                                const c = allContacts?.find((x) => x._id === id);
                                                return (
                                                    <span
                                                        key={id}
                                                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                                                    >
                                                        {c ? contactLabel(c) : id}
                                                        <button
                                                            type="button"
                                                            className="rounded p-0.5 hover:bg-slate-200"
                                                            aria-label="Remove"
                                                            onClick={() =>
                                                                setLinkedContactIds((p) => p.filter((x) => x !== id))
                                                            }
                                                        >
                                                            <XIcon className="size-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })
                                        )}
                                    </div>
                                    <Select value={pickContact} onValueChange={onPickContactForCreate}>
                                        <SelectTrigger className="h-9 min-w-[220px] w-full max-w-sm">
                                            <SelectValue placeholder="Add contact" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Select…</SelectItem>
                                            {contactOptionsForCreate.map((c) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {contactLabel(c)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Leads</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {linkedLeadIds.length === 0 ? (
                                            <span className="text-muted-foreground text-xs">None selected</span>
                                        ) : (
                                            linkedLeadIds.map((id) => {
                                                const l = leads?.find((x) => x._id === id);
                                                return (
                                                    <span
                                                        key={id}
                                                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-900"
                                                    >
                                                        {l?.name ?? id}
                                                        <button
                                                            type="button"
                                                            className="rounded p-0.5 hover:bg-indigo-100"
                                                            aria-label="Remove"
                                                            onClick={() =>
                                                                setLinkedLeadIds((p) => p.filter((x) => x !== id))
                                                            }
                                                        >
                                                            <XIcon className="size-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })
                                        )}
                                    </div>
                                    <Select value={pickLead} onValueChange={onPickLeadForCreate}>
                                        <SelectTrigger className="h-9 min-w-[220px] w-full max-w-sm">
                                            <SelectValue placeholder="Add lead" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Select…</SelectItem>
                                            {leadOptionsForCreate.map((l) => (
                                                <SelectItem key={l._id} value={l._id}>
                                                    {l.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-5 space-y-3 border-t border-slate-100 pt-4">
                            <div>
                                <p className="text-sm font-medium">Initial activity (optional)</p>
                                <p className="text-muted-foreground text-xs">
                                    Creates a CRM activity linked to this account when you add a subject.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-5">
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
                                <div className="md:col-span-3 space-y-1">
                                    <Label>Subject</Label>
                                    <Input
                                        value={activitySubject}
                                        onChange={(e) => setActivitySubject(e.target.value)}
                                        placeholder="e.g. Schedule intro call"
                                    />
                                </div>
                                <div className="md:col-span-5 space-y-1">
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
                        <div className="md:col-span-5 flex items-end">
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
                                <TableHead className="min-w-[200px]">Account</TableHead>
                                <TableHead>Website</TableHead>
                                <TableHead>Industry</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : filteredAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                                        {search || industryFilter !== "all" || websiteFilter !== "all" || createdFrom || createdTo
                                            ? "No accounts match these filters — try clearing dates or search."
                                            : "No accounts yet. Create one or import a CSV to populate this list."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAccounts.map((account: Account) => {
                                    const site = account.website?.trim();
                                    const href =
                                        site && /^https?:\/\//i.test(site) ? site : site ? `https://${site}` : null;
                                    return (
                                        <TableRow key={account._id} className="group">
                                            <TableCell>
                                                <div className="flex items-start gap-3">
                                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/80 text-indigo-700">
                                                        <Building2Icon className="size-5 opacity-90" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            className="font-semibold text-indigo-800 hover:text-indigo-950 hover:underline"
                                                            href={`/crm/accounts/${account._id}`}
                                                        >
                                                            {account.name}
                                                        </Link>
                                                        <p className="text-muted-foreground text-xs">Company record</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {href ? (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex max-w-[200px] items-center gap-1 truncate text-sm text-indigo-700 hover:underline"
                                                    >
                                                        <span className="truncate">{site}</span>
                                                        <ExternalLinkIcon className="size-3.5 shrink-0 opacity-70" />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {account.industry?.trim() ? (
                                                    <Badge variant="secondary" className="font-normal">
                                                        {account.industry}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{account.phone ?? "—"}</TableCell>
                                            <TableCell>
                                                {account.email ? (
                                                    <a
                                                        href={`mailto:${account.email}`}
                                                        className="text-sm text-indigo-700 hover:underline"
                                                    >
                                                        {account.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-70 hover:opacity-100"
                                                    onClick={() => handleDelete(account._id)}
                                                    aria-label={`Delete ${account.name}`}
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

