"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@workspace/ui/components/sheet";
import { Separator } from "@workspace/ui/components/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    CalendarDaysIcon,
    DollarSignIcon,
    DownloadIcon,
    HashIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    TrendingUpIcon,
} from "lucide-react";
import { useCrmCurrency } from "../../lib/use-crm-currency";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";
import { cn } from "@workspace/ui/lib/utils";

type SalesEntry = Doc<"crmSalesEntries">;
type Deal = Doc<"deals">;
type Account = Doc<"accounts">;

function formatSaleDayUtc(ms: number) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function localYmdToday() {
    const d = new Date();
    return format(d, "yyyy-MM-dd");
}

function utcMonthStartMs(at: number): number {
    const d = new Date(at);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
}

function escapeCsvCell(value: string): string {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
}

export const SalesView = () => {
    const { formatMoney, currency } = useCrmCurrency();
    const entries = useQuery(api.private.sales.list, {});
    const deals = useQuery(api.private.deals.list, {});
    const accounts = useQuery(api.private.accounts.list);
    const createEntry = useMutation(api.private.sales.create);
    const updateEntry = useMutation(api.private.sales.update);
    const removeEntry = useMutation(api.private.sales.remove);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<Id<"crmSalesEntries"> | null>(null);
    const [saleDate, setSaleDate] = useState(localYmdToday);
    const [amount, setAmount] = useState("");
    const [soldTo, setSoldTo] = useState("");
    const [customerIndustry, setCustomerIndustry] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [customerContact, setCustomerContact] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerWhatsapp, setCustomerWhatsapp] = useState("");
    const [notes, setNotes] = useState("");
    const [dealId, setDealId] = useState<string>("none");
    const [accountId, setAccountId] = useState<string>("none");
    const [isSaving, setIsSaving] = useState(false);
    const [journalSearch, setJournalSearch] = useState("");

    const resetForm = useCallback(() => {
        setEditingEntryId(null);
        setSaleDate(localYmdToday());
        setAmount("");
        setSoldTo("");
        setCustomerIndustry("");
        setCustomerName("");
        setCompanyName("");
        setCustomerContact("");
        setCustomerEmail("");
        setCustomerWhatsapp("");
        setNotes("");
        setDealId("none");
        setAccountId("none");
    }, []);

    function populateFormFromEntry(entry: SalesEntry) {
        setSaleDate(formatSaleDayUtc(entry.saleDate));
        setAmount(String(entry.amount));
        setSoldTo(entry.soldTo ?? "");
        setCustomerIndustry(entry.customerIndustry ?? "");
        setCustomerName(entry.customerName ?? "");
        setCompanyName(entry.companyName ?? "");
        setCustomerContact(entry.customerContact ?? "");
        setCustomerEmail(entry.customerEmail ?? "");
        setCustomerWhatsapp(entry.customerWhatsapp ?? "");
        setNotes(entry.notes ?? "");
        setDealId(entry.dealId ?? "none");
        setAccountId(entry.accountId ?? "none");
    }

    const dealMap = useMemo(() => {
        if (!deals) return new Map<string, Deal>();
        return new Map(deals.map((d) => [d._id, d]));
    }, [deals]);

    const accountMap = useMemo(() => {
        if (!accounts) return new Map<string, Account>();
        return new Map(accounts.map((a) => [a._id, a]));
    }, [accounts]);

    const stats = useMemo(() => {
        if (!entries) return null;
        const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
        const monthStart = utcMonthStartMs(Date.now());
        const monthAmount = entries
            .filter((e) => e.saleDate >= monthStart)
            .reduce((s, e) => s + e.amount, 0);
        const avg = entries.length > 0 ? totalAmount / entries.length : 0;
        return {
            count: entries.length,
            totalAmount,
            monthAmount,
            avg,
        };
    }, [entries]);

    const filteredEntries = useMemo(() => {
        const rows = entries ?? [];
        const q = journalSearch.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => {
            const deal = row.dealId ? dealMap.get(row.dealId) : undefined;
            const acc = row.accountId ? accountMap.get(row.accountId) : undefined;
            const hay = [
                formatSaleDayUtc(row.saleDate),
                row.soldTo,
                row.customerIndustry,
                row.customerName,
                row.companyName,
                row.customerContact,
                row.customerEmail,
                row.customerWhatsapp,
                row.notes,
                row.title,
                deal?.name,
                acc?.name,
                formatMoney(row.amount),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [entries, journalSearch, dealMap, accountMap, formatMoney]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const raw = amount.trim().replace(/,/g, "");
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
            toast.error("Enter a positive amount.");
            return;
        }
        if (!saleDate || !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
            toast.error("Pick a valid sale date.");
            return;
        }
        const payload = {
            saleDate,
            amount: n,
            soldTo: soldTo.trim() || undefined,
            customerIndustry: customerIndustry.trim() || undefined,
            customerName: customerName.trim() || undefined,
            companyName: companyName.trim() || undefined,
            customerContact: customerContact.trim() || undefined,
            customerEmail: customerEmail.trim() || undefined,
            customerWhatsapp: customerWhatsapp.trim() || undefined,
            notes: notes.trim() || undefined,
            dealId: dealId !== "none" ? (dealId as Id<"deals">) : undefined,
            accountId: accountId !== "none" ? (accountId as Id<"accounts">) : undefined,
        };

        setIsSaving(true);
        try {
            if (editingEntryId) {
                await updateEntry({ entryId: editingEntryId, ...payload });
                toast.success("Sale updated.");
            } else {
                await createEntry(payload);
                toast.success("Sale recorded.");
            }
            resetForm();
            setShowAddForm(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not save.";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    function onCancelForm() {
        resetForm();
        setShowAddForm(false);
    }

    function openAddSheet() {
        resetForm();
        setShowAddForm(true);
    }

    function openEditSheet(entry: SalesEntry) {
        populateFormFromEntry(entry);
        setEditingEntryId(entry._id);
        setShowAddForm(true);
    }

    async function onRemove(entryId: Id<"crmSalesEntries">) {
        if (!window.confirm("Remove this sale entry?")) return;
        try {
            await removeEntry({ entryId });
            toast.success("Removed.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not remove.";
            toast.error(message);
        }
    }

    const totalCount = entries?.length ?? 0;
    const isEditing = editingEntryId !== null;
    const submitLabel = isEditing ? "Save changes" : "Record sale";

    function exportSalesCsv() {
        if (!filteredEntries.length) {
            toast.error("No rows to export.");
            return;
        }
        const headers = [
            "sale_date_utc",
            "amount",
            "currency",
            "sold_to",
            "customer_industry",
            "customer_name",
            "company_name",
            "customer_contact",
            "customer_email",
            "customer_whatsapp",
            "notes",
            "deal_name",
            "account_name",
            "created_at_iso",
        ];
        const rows = filteredEntries.map((row) => {
            const deal = row.dealId ? dealMap.get(row.dealId) : undefined;
            const acc = row.accountId ? accountMap.get(row.accountId) : undefined;
            const values = [
                formatSaleDayUtc(row.saleDate),
                String(row.amount),
                currency,
                row.soldTo ?? "",
                row.customerIndustry ?? "",
                row.customerName ?? "",
                row.companyName ?? "",
                row.customerContact ?? "",
                row.customerEmail ?? "",
                row.customerWhatsapp ?? "",
                row.notes ?? "",
                deal?.name ?? "",
                acc?.name ?? "",
                new Date(row.createdAt).toISOString(),
            ];
            return values.map((v) => escapeCsvCell(String(v))).join(",");
        });
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredEntries.length} row${filteredEntries.length === 1 ? "" : "s"}`);
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f8fa]">
            <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-5 px-4 py-5 md:space-y-6 md:px-6 md:py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Sales</h1>
                            <Badge variant="secondary" className="font-mono text-[10px] font-normal">
                                {currency}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {entries === undefined ? (
                                "Loading records…"
                            ) : (
                                <>
                                    <span className="font-medium text-slate-700">{totalCount.toLocaleString()}</span>{" "}
                                    entr{totalCount === 1 ? "y" : "ies"}
                                    <span className="text-muted-foreground"> · Revenue log</span>
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start">
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 border-slate-300 bg-white shadow-sm"
                            disabled={entries === undefined || filteredEntries.length === 0}
                            onClick={exportSalesCsv}
                        >
                            <DownloadIcon className="size-4" />
                            Export CSV
                        </Button>
                        <Button
                            type="button"
                            onClick={openAddSheet}
                            className={cn("gap-2 shadow-sm", CRM_PRIMARY_BTN)}
                        >
                            <PlusIcon className="size-4" />
                            Add sale
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <p className="text-muted-foreground text-sm font-medium">Total volume</p>
                            <TrendingUpIcon className="text-muted-foreground size-4" />
                        </div>
                        <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                            {stats === null ? "—" : formatMoney(stats.totalAmount)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {stats === null ? "Loading…" : `${stats.count} entr${stats.count === 1 ? "y" : "ies"}`}
                        </p>
                    </div>
                    <div className="border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <p className="text-muted-foreground text-sm font-medium">This month (UTC)</p>
                            <CalendarDaysIcon className="text-muted-foreground size-4" />
                        </div>
                        <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                            {stats === null ? "—" : formatMoney(stats.monthAmount)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">Calendar month to date</p>
                    </div>
                    <div className="border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <p className="text-muted-foreground text-sm font-medium">Avg per entry</p>
                            <HashIcon className="text-muted-foreground size-4" />
                        </div>
                        <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                            {stats === null || stats.count === 0 ? "—" : formatMoney(stats.avg)}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">All-time average</p>
                    </div>
                </div>

                <div className="border border-slate-200 bg-white shadow-sm">
                    <div className="space-y-4 border-b border-slate-200 p-4 md:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold text-slate-900">Journal</h2>
                                <p className="text-muted-foreground text-sm">
                                    Newest first. Search filters the table and export. Includes email,
                                    WhatsApp, and linked records.
                                </p>
                            </div>
                            <div className="relative w-full sm:max-w-xs">
                                <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                                <Input
                                    value={journalSearch}
                                    onChange={(e) => setJournalSearch(e.target.value)}
                                    placeholder="Search…"
                                    className="h-9 border-slate-300 bg-white pl-9 text-sm"
                                    aria-label="Search journal"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-0">
                    {entries === undefined ? (
                        <p className="text-muted-foreground px-6 py-12 text-center text-sm">Loading entries…</p>
                    ) : entries.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
                            <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                                <DollarSignIcon className="size-7 opacity-50" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No sales yet</p>
                            <p className="max-w-sm text-sm">
                                Click <span className="font-medium text-foreground">Add sale</span> above to log
                                your first entry.
                            </p>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <p className="text-muted-foreground px-6 py-12 text-center text-sm">
                            No entries match “{journalSearch.trim()}”.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                                        <TableHead className="w-[110px]">Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Sold to</TableHead>
                                        <TableHead className="hidden sm:table-cell">Company</TableHead>
                                        <TableHead className="hidden md:table-cell">Customer</TableHead>
                                        <TableHead className="hidden lg:table-cell">Industry</TableHead>
                                        <TableHead className="hidden xl:table-cell">Contact</TableHead>
                                        <TableHead className="hidden 2xl:table-cell">Email</TableHead>
                                        <TableHead className="hidden 2xl:table-cell">WhatsApp</TableHead>
                                        <TableHead className="hidden md:table-cell">Linked</TableHead>
                                        <TableHead className="w-[88px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEntries.map((row: SalesEntry) => {
                                        const deal = row.dealId ? dealMap.get(row.dealId) : undefined;
                                        const acc = row.accountId ? accountMap.get(row.accountId) : undefined;
                                        const soldLabel =
                                            row.soldTo?.trim() || row.title?.trim() || "";
                                        return (
                                            <TableRow
                                                key={row._id}
                                                className="group border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                                            >
                                                <TableCell className="text-muted-foreground whitespace-nowrap font-mono text-sm tabular-nums">
                                                    {formatSaleDayUtc(row.saleDate)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums tracking-tight">
                                                    {formatMoney(row.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    {soldLabel ? (
                                                        <span className="line-clamp-2 font-medium">
                                                            {soldLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden max-w-[140px] sm:table-cell">
                                                    {row.companyName?.trim() ? (
                                                        <span className="line-clamp-2 text-sm">
                                                            {row.companyName.trim()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden max-w-[140px] md:table-cell">
                                                    {row.customerName?.trim() ? (
                                                        <span className="line-clamp-2 text-sm">
                                                            {row.customerName.trim()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground hidden max-w-[120px] lg:table-cell">
                                                    {row.customerIndustry?.trim() || "—"}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground hidden max-w-[160px] text-sm xl:table-cell">
                                                    {row.customerContact?.trim() || "—"}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground hidden max-w-[180px] truncate text-sm 2xl:table-cell">
                                                    {row.customerEmail?.trim() || "—"}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground hidden max-w-[140px] truncate text-sm 2xl:table-cell">
                                                    {row.customerWhatsapp?.trim() || "—"}
                                                </TableCell>
                                                <TableCell className="hidden max-w-[160px] md:table-cell">
                                                    {[deal?.name, acc?.name].filter(Boolean).length ? (
                                                        <span className="text-muted-foreground line-clamp-2 text-sm">
                                                            {[deal?.name, acc?.name].filter(Boolean).join(" · ")}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground opacity-70 transition-opacity hover:text-foreground group-hover:opacity-100"
                                                            onClick={() => openEditSheet(row)}
                                                            aria-label="Edit entry"
                                                        >
                                                            <PencilIcon className="size-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100"
                                                            onClick={() => onRemove(row._id)}
                                                            aria-label="Remove entry"
                                                        >
                                                            <Trash2Icon className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            <Sheet
                open={showAddForm}
                onOpenChange={(open) => {
                    if (!open) onCancelForm();
                }}
            >
                <SheetContent
                    side="right"
                    className={cn(
                        "flex h-full w-full max-w-full flex-col gap-0 overflow-hidden border-l border-slate-200 p-0",
                        "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 sm:max-w-2xl",
                    )}
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>{isEditing ? "Edit sale" : "New sale"}</SheetTitle>
                        <SheetDescription>
                            {isEditing ? "Update this sales journal entry" : "Create a sales journal entry"}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="sticky top-0 z-10 flex shrink-0 flex-col gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
                                {isEditing ? "Edit sale" : "New sale"}
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                <span className="text-indigo-600">Sales</span>
                                <span className="mx-1 text-slate-400">›</span>
                                <span>{isEditing ? "Edit" : "New"}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={onCancelForm} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="sales-create-form"
                                className={CRM_PRIMARY_BTN}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving…" : submitLabel}
                            </Button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        <form id="sales-create-form" onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sale-date">Sale date</Label>
                                    <Input
                                        id="sale-date"
                                        type="date"
                                        value={saleDate}
                                        onChange={(e) => setSaleDate(e.target.value)}
                                        required
                                        className="border-slate-300 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sale-amount">Amount ({currency})</Label>
                                    <Input
                                        id="sale-amount"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        className="border-slate-300 tabular-nums"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sold-to">Sold to</Label>
                                <Input
                                    id="sold-to"
                                    value={soldTo}
                                    onChange={(e) => setSoldTo(e.target.value)}
                                    placeholder="Who bought (account or label)"
                                    className="border-slate-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customer-industry">Customer industry</Label>
                                <Input
                                    id="customer-industry"
                                    value={customerIndustry}
                                    onChange={(e) => setCustomerIndustry(e.target.value)}
                                    placeholder="e.g. Healthcare, Manufacturing"
                                    className="border-slate-300"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="customer-name">Customer name</Label>
                                    <Input
                                        id="customer-name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Primary contact or buyer name"
                                        className="border-slate-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company-name">Company name</Label>
                                    <Input
                                        id="company-name"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Legal or brand name"
                                        className="border-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customer-contact">Customer contact</Label>
                                <Input
                                    id="customer-contact"
                                    value={customerContact}
                                    onChange={(e) => setCustomerContact(e.target.value)}
                                    placeholder="Phone or alternate contact"
                                    type="text"
                                    autoComplete="off"
                                    className="border-slate-300"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="customer-email">Email</Label>
                                    <Input
                                        id="customer-email"
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="buyer@company.com"
                                        autoComplete="off"
                                        className="border-slate-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer-whatsapp">WhatsApp</Label>
                                    <Input
                                        id="customer-whatsapp"
                                        value={customerWhatsapp}
                                        onChange={(e) => setCustomerWhatsapp(e.target.value)}
                                        placeholder="+1 555 0100 (with country code)"
                                        autoComplete="off"
                                        className="border-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Deal (optional)</Label>
                                    <Select value={dealId} onValueChange={setDealId}>
                                        <SelectTrigger className="border-slate-300">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {(deals ?? []).map((d) => (
                                                <SelectItem key={d._id} value={d._id}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Account (optional)</Label>
                                    <Select value={accountId} onValueChange={setAccountId}>
                                        <SelectTrigger className="border-slate-300">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {(accounts ?? []).map((a) => (
                                                <SelectItem key={a._id} value={a._id}>
                                                    {a.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sale-notes">Notes (optional)</Label>
                                <Textarea
                                    id="sale-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Invoice #, PO, or internal reference."
                                    className="min-h-[88px] resize-y border-slate-300"
                                />
                            </div>

                            <Separator className="bg-slate-200" />

                            <div className="flex flex-col gap-2 sm:hidden">
                                <Button type="button" variant="outline" onClick={onCancelForm} disabled={isSaving}>
                                    Cancel
                                </Button>
                                <Button type="submit" className={CRM_PRIMARY_BTN} disabled={isSaving}>
                                    {isSaving ? "Saving…" : submitLabel}
                                </Button>
                            </div>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};
