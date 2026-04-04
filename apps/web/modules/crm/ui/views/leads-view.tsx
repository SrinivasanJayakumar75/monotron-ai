"use client";

import Link from "next/link";
import { useOrganization, useUser } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ChangeEventHandler, useMemo, useRef, useState } from "react";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { DownloadIcon, PlusIcon, SearchIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import {
    displayLeadStatus,
    EMPTY_SELECT_VALUE,
    formatLeadSourceLabel,
    formatShortDate,
    LEAD_SOURCE_OPTIONS,
    LEAD_STATUS_OPTIONS,
    leadCreatedAt,
} from "../leads-ui-constants";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { useCrmCurrency } from "../../lib/use-crm-currency";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";
import { cn } from "@workspace/ui/lib/utils";

type Lead = Doc<"leads">;

type SortKey = "name" | "company" | "created" | "status" | "source";
type SortDir = "asc" | "desc";

const ASSIGNEE_NONE = "__assign_none__";
const ASSIGNEE_ME = "__me__";

function escapeCsv(s: string) {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function leadStatusPillClass(displayStatus: string) {
    switch (displayStatus) {
        case "New":
            return "border-sky-200 bg-sky-50 text-sky-900";
        case "Contacted":
            return "border-amber-200 bg-amber-50 text-amber-950";
        case "Qualified":
            return "border-emerald-200 bg-emerald-50 text-emerald-900";
        case "Lost":
            return "border-red-200 bg-red-50 text-red-900";
        default:
            return "border-slate-200 bg-slate-100 text-slate-800";
    }
}

export const LeadsView = () => {
    const { formatMoney } = useCrmCurrency();
    const leadsRaw = useQuery(api.private.leads.list, {});
    const bulkRemove = useMutation(api.private.leads.bulkRemove);
    const bulkAssign = useMutation(api.private.leads.bulkAssign);
    const importLeadsCsv = useMutation(api.private.leads.importCsv);
    const orgExport = useQuery(api.private.crmPortability.exportAll, {});
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { user } = useUser();
    const { memberships } = useOrganization({
        memberships: {
            pageSize: 50,
            infinite: true,
        },
    });

    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>(EMPTY_SELECT_VALUE);
    const [filterSource, setFilterSource] = useState<string>(EMPTY_SELECT_VALUE);
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [contactedFrom, setContactedFrom] = useState("");
    const [contactedTo, setContactedTo] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("created");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [selected, setSelected] = useState<Set<Id<"leads">>>(new Set());
    const [assignOpen, setAssignOpen] = useState(false);
    const [assigneeKey, setAssigneeKey] = useState(ASSIGNEE_NONE);

    const memberOptions = useMemo(() => {
        const data = memberships?.data;
        if (!data?.length) return [];
        return data.map((m) => ({
            value: m.publicUserData?.userId ?? m.id,
            label:
                [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ") ||
                m.publicUserData?.identifier ||
                "Member",
        }));
    }, [memberships?.data]);

    const dayStart = (isoDate: string) => {
        const d = new Date(isoDate + "T00:00:00");
        return d.getTime();
    };
    const dayEnd = (isoDate: string) => {
        const d = new Date(isoDate + "T23:59:59.999");
        return d.getTime();
    };

    const filteredSorted = useMemo(() => {
        if (!leadsRaw) return [];
        let rows = [...leadsRaw];
        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter((l) => {
                const blob = [l.name, l.company, l.email, l.phone, l.whatsapp, l.assignedToName]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return blob.includes(q);
            });
        }
        if (filterStatus !== EMPTY_SELECT_VALUE) {
            rows = rows.filter((l) => displayLeadStatus(l.stage) === filterStatus);
        }
        if (filterSource !== EMPTY_SELECT_VALUE) {
            rows = rows.filter((l) => l.leadSource === filterSource);
        }
        if (createdFrom) {
            const t = dayStart(createdFrom);
            rows = rows.filter((l) => leadCreatedAt(l) >= t);
        }
        if (createdTo) {
            const t = dayEnd(createdTo);
            rows = rows.filter((l) => leadCreatedAt(l) <= t);
        }
        if (contactedFrom) {
            const t = dayStart(contactedFrom);
            rows = rows.filter((l) => (l.lastContactedAt ?? 0) >= t);
        }
        if (contactedTo) {
            const t = dayEnd(contactedTo);
            rows = rows.filter((l) => l.lastContactedAt !== undefined && l.lastContactedAt <= t);
        }

        const dir = sortDir === "asc" ? 1 : -1;
        rows.sort((a, b) => {
            let va: string | number = 0;
            let vb: string | number = 0;
            switch (sortKey) {
                case "name":
                    va = a.name.toLowerCase();
                    vb = b.name.toLowerCase();
                    break;
                case "company":
                    va = (a.company ?? "").toLowerCase();
                    vb = (b.company ?? "").toLowerCase();
                    break;
                case "created":
                    va = leadCreatedAt(a);
                    vb = leadCreatedAt(b);
                    break;
                case "status":
                    va = displayLeadStatus(a.stage);
                    vb = displayLeadStatus(b.stage);
                    break;
                case "source":
                    va = (a.leadSource ?? "").toLowerCase();
                    vb = (b.leadSource ?? "").toLowerCase();
                    break;
                default:
                    break;
            }
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });
        return rows;
    }, [
        leadsRaw,
        search,
        filterStatus,
        filterSource,
        createdFrom,
        createdTo,
        contactedFrom,
        contactedTo,
        sortKey,
        sortDir,
    ]);

    const toggle = (id: Id<"leads">) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllVisible = () => {
        if (selected.size === filteredSorted.length && filteredSorted.length > 0) {
            setSelected(new Set());
            return;
        }
        setSelected(new Set(filteredSorted.map((l) => l._id)));
    };

    const selectedIds = Array.from(selected);

    const resolveAssignee = () => {
        if (assigneeKey === ASSIGNEE_NONE)
            return { userId: undefined as string | undefined, name: undefined as string | undefined };
        if (assigneeKey === ASSIGNEE_ME && user) {
            return {
                userId: user.id,
                name: user.fullName || user.primaryEmailAddress?.emailAddress || user.id,
            };
        }
        const m = memberOptions.find((o) => o.value === assigneeKey);
        if (m) return { userId: assigneeKey, name: m.label };
        return { userId: undefined, name: undefined };
    };

    const runBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`Delete ${selectedIds.length} lead(s)?`)) return;
        try {
            await bulkRemove({ leadIds: selectedIds });
            toast.success("Deleted");
            setSelected(new Set());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
        }
    };

    const runBulkAssign = async () => {
        if (!selectedIds.length) return;
        const { userId, name } = resolveAssignee();
        try {
            await bulkAssign({
                leadIds: selectedIds,
                assignedToUserId: userId ?? "",
                assignedToName: name ?? "",
            });
            toast.success("Assignee updated");
            setAssignOpen(false);
            setSelected(new Set());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Assign failed");
        }
    };

    const exportRows = (rows: Lead[]) => {
        const headers = [
            "Lead Name",
            "Company",
            "Email",
            "Phone",
            "WhatsApp",
            "Lead Source",
            "Lead Status",
            "Expected deal value",
            "Assigned To",
            "Created Date",
            "Last Contacted",
        ];
        const lines = [
            headers.join(","),
            ...rows.map((l) =>
                [
                    escapeCsv(l.name),
                    escapeCsv(l.company ?? ""),
                    escapeCsv(l.email ?? ""),
                    escapeCsv(l.phone ?? ""),
                    escapeCsv(l.whatsapp ?? ""),
                    escapeCsv(formatLeadSourceLabel(l.leadSource)),
                    escapeCsv(displayLeadStatus(l.stage)),
                    escapeCsv(
                        l.expectedDealValue !== undefined && l.expectedDealValue !== null
                            ? String(l.expectedDealValue)
                            : "",
                    ),
                    escapeCsv(l.assignedToName ?? ""),
                    escapeCsv(formatShortDate(leadCreatedAt(l))),
                    escapeCsv(formatShortDate(l.lastContactedAt)),
                ].join(","),
            ),
        ];
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported");
    };

    const exportSelected = () => {
        const rows = filteredSorted.filter((l) => selected.has(l._id));
        if (!rows.length) return;
        exportRows(rows);
    };

    const downloadOrgExport = () => {
        if (!orgExport) return;
        const files = [
            { name: "leads.csv", content: orgExport.leadsCsv },
            { name: "deals.csv", content: orgExport.dealsCsv },
            { name: "activities.csv", content: orgExport.activitiesCsv },
        ];
        for (const f of files) {
            const blob = new Blob([f.content], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `crm-${f.name}`;
            a.click();
            URL.revokeObjectURL(url);
        }
        toast.success("Organization export downloaded");
    };

    const onImportCsv: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const csv = await file.text();
        const result = await importLeadsCsv({ csv });
        toast.success(`Imported ${result.imported} leads`);
        e.target.value = "";
    };

    const totalCount = leadsRaw?.length ?? 0;
    const showingCount = filteredSorted.length;

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f8fa]">
            <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-0 px-4 py-5 md:px-6 md:py-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Leads</h1>
                        <p className="text-muted-foreground text-sm">
                            {leadsRaw === undefined ? (
                                "Loading records…"
                            ) : filteredSorted.length === leadsRaw.length ? (
                                <>
                                    <span className="font-medium text-slate-700">{totalCount.toLocaleString()}</span>{" "}
                                    records
                                </>
                            ) : (
                                <>
                                    Showing{" "}
                                    <span className="font-medium text-slate-700">
                                        {showingCount.toLocaleString()}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-medium text-slate-700">
                                        {totalCount.toLocaleString()}
                                    </span>{" "}
                                    records (filters applied)
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            className="border-slate-300 bg-white shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Import CSV
                        </Button>
                        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onImportCsv} />
                        <Button asChild className={cn("gap-2", CRM_PRIMARY_BTN)}>
                            <Link href="/crm/leads/new">
                                <PlusIcon className="size-4" />
                                Create lead
                            </Link>
                        </Button>
                        <Button variant="outline" className="border-slate-300 bg-white shadow-sm" onClick={downloadOrgExport}>
                            Export org CRM
                        </Button>
                    </div>
                </div>

                <div className="mb-3 border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                        <div className="relative min-w-[200px] flex-1 lg:max-w-sm">
                            <Label className="text-xs text-slate-600">Search</Label>
                            <div className="relative mt-1">
                                <SearchIcon className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
                                <Input
                                    className="h-9 border-slate-300 bg-white pl-9 text-sm"
                                    placeholder="Name, company, email, phone, WhatsApp…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Search leads"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-9 w-[160px] border-slate-300">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={EMPTY_SELECT_VALUE}>All statuses</SelectItem>
                                    {LEAD_STATUS_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Source</Label>
                            <Select value={filterSource} onValueChange={setFilterSource}>
                                <SelectTrigger className="h-9 w-[180px] border-slate-300">
                                    <SelectValue placeholder="All sources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={EMPTY_SELECT_VALUE}>All sources</SelectItem>
                                    {LEAD_SOURCE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Created from</Label>
                            <Input
                                type="date"
                                className="h-9 w-[150px] border-slate-300"
                                value={createdFrom}
                                onChange={(e) => setCreatedFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Created to</Label>
                            <Input
                                type="date"
                                className="h-9 w-[150px] border-slate-300"
                                value={createdTo}
                                onChange={(e) => setCreatedTo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Last contacted from</Label>
                            <Input
                                type="date"
                                className="h-9 w-[150px] border-slate-300"
                                value={contactedFrom}
                                onChange={(e) => setContactedFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Last contacted to</Label>
                            <Input
                                type="date"
                                className="h-9 w-[150px] border-slate-300"
                                value={contactedTo}
                                onChange={(e) => setContactedTo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Sort by</Label>
                            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                                <SelectTrigger className="h-9 w-[150px] border-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="created">Created date</SelectItem>
                                    <SelectItem value="name">Lead name</SelectItem>
                                    <SelectItem value="company">Company</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="source">Source</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">Order</Label>
                            <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
                                <SelectTrigger className="h-9 w-[120px] border-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desc">Descending</SelectItem>
                                    <SelectItem value="asc">Ascending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {selectedIds.length > 0 ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                        <span className="font-medium text-slate-800">{selectedIds.length} selected</span>
                        <span className="text-slate-300">|</span>
                        <Button size="sm" variant="outline" className="h-7 gap-1 border-slate-300 text-xs" onClick={() => setAssignOpen(true)}>
                            <UserPlusIcon className="size-3.5" />
                            Assign owner
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 border-slate-300 text-xs" onClick={exportSelected}>
                            <DownloadIcon className="size-3.5" />
                            Export selected
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={runBulkDelete}>
                            <Trash2Icon className="size-3.5" />
                            Delete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
                            Clear
                        </Button>
                    </div>
                ) : null}

                <div className="border border-slate-200 bg-white shadow-sm">
                    <Table className="min-w-[1280px] text-sm">
                        <TableHeader className="sticky top-0 z-20 border-b border-slate-200 bg-[#eaf0f6] [&_tr]:border-0">
                            <TableRow className="border-0 hover:bg-transparent">
                                <TableHead className="w-10 px-2 py-2">
                                    <input
                                        type="checkbox"
                                        aria-label="Select all visible"
                                        checked={
                                            filteredSorted.length > 0 && selected.size === filteredSorted.length
                                        }
                                        onChange={toggleAllVisible}
                                        className="border-slate-400"
                                    />
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Name
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Company
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Email
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Phone
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    WhatsApp
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Source
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Status
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Deal value
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Owner
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Created
                                </TableHead>
                                <TableHead className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Last activity
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="[&_tr]:border-slate-100">
                            {leadsRaw === undefined ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={12} className="text-muted-foreground py-16 text-center text-sm">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : filteredSorted.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={12} className="text-muted-foreground py-16 text-center text-sm">
                                        No leads match your filters. Adjust search or clear filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSorted.map((lead, idx) => {
                                    const dStatus = displayLeadStatus(lead.stage);
                                    return (
                                        <TableRow
                                            key={lead._id}
                                            className={cn(
                                                "h-10 border-b border-slate-100 transition-colors",
                                                idx % 2 === 1 && "bg-slate-50/40",
                                                "hover:bg-sky-50/40",
                                            )}
                                        >
                                            <TableCell className="px-2 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(lead._id)}
                                                    onChange={() => toggle(lead._id)}
                                                    aria-label={`Select ${lead.name}`}
                                                    className="border-slate-400"
                                                />
                                            </TableCell>
                                            <TableCell className="max-w-[200px] px-3 py-1.5 align-middle">
                                                <Link
                                                    href={`/crm/leads/${lead._id}`}
                                                    className="font-medium text-sky-800 underline-offset-2 hover:text-sky-950 hover:underline"
                                                >
                                                    {lead.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="max-w-[160px] truncate px-3 py-1.5 align-middle text-slate-800">
                                                {lead.company ?? "—"}
                                            </TableCell>
                                            <TableCell className="max-w-[180px] truncate px-3 py-1.5 align-middle text-slate-700">
                                                {lead.email ?? "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-1.5 align-middle text-slate-700">
                                                {lead.phone ?? "—"}
                                            </TableCell>
                                            <TableCell className="max-w-[120px] truncate px-3 py-1.5 align-middle text-slate-700">
                                                {lead.whatsapp ?? "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-1.5 align-middle text-slate-700">
                                                {formatLeadSourceLabel(lead.leadSource)}
                                            </TableCell>
                                            <TableCell className="px-3 py-1.5 align-middle">
                                                <span
                                                    className={cn(
                                                        "inline-flex rounded border px-2 py-0.5 text-xs font-medium",
                                                        leadStatusPillClass(dStatus),
                                                    )}
                                                >
                                                    {dStatus}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-3 py-1.5 text-right align-middle tabular-nums text-slate-800">
                                                {formatMoney(lead.expectedDealValue)}
                                            </TableCell>
                                            <TableCell className="max-w-[140px] truncate px-3 py-1.5 align-middle text-slate-700">
                                                {lead.assignedToName ?? "—"}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-1.5 align-middle text-slate-600">
                                                {formatShortDate(leadCreatedAt(lead))}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-3 py-1.5 align-middle text-slate-600">
                                                {formatShortDate(lead.lastContactedAt)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign {selectedIds.length} lead(s)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Assign to</Label>
                        <Select value={assigneeKey} onValueChange={setAssigneeKey}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choose rep" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ASSIGNEE_NONE}>Unassigned</SelectItem>
                                {user ? (
                                    <SelectItem value={ASSIGNEE_ME}>
                                        Me ({user.fullName || user.primaryEmailAddress?.emailAddress || "you"})
                                    </SelectItem>
                                ) : null}
                                {memberOptions.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignOpen(false)}>
                            Cancel
                        </Button>
                        <Button className={CRM_PRIMARY_BTN} onClick={() => void runBulkAssign()}>
                            Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
