"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
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
    BriefcaseIcon,
    CalendarIcon,
    ChevronUpIcon,
    DollarSignIcon,
    KanbanIcon,
    PlusIcon,
    SearchIcon,
    Trash2Icon,
    TrendingUpIcon,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useCrmCurrency } from "../../lib/use-crm-currency";
import { cn } from "@workspace/ui/lib/utils";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

type Deal = Doc<"deals">;
type Account = Doc<"accounts">;
type Contact = Doc<"contacts">;
type Lead = Doc<"leads">;

const dealStages = [
    "Prospecting",
    "Qualification",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
] as const;

function toTimestamp(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    const ms = new Date(trimmed).getTime();
    if (Number.isNaN(ms)) return undefined;
    return ms;
}

function formatDealDate(ms: number | undefined) {
    if (ms === undefined) return null;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(ms));
}

function stageColumnAccent(stage: string) {
    switch (stage) {
        case "Prospecting":
            return "border-t-slate-400 bg-[#eaf0f6]";
        case "Qualification":
            return "border-t-sky-500 bg-sky-50/50";
        case "Proposal":
            return "border-t-violet-500 bg-violet-50/40";
        case "Negotiation":
            return "border-t-amber-500 bg-amber-50/40";
        case "Closed Won":
            return "border-t-emerald-500 bg-emerald-50/40";
        case "Closed Lost":
            return "border-t-red-500 bg-red-50/40";
        default:
            return "border-t-slate-300 bg-[#eaf0f6]";
    }
}

export const DealsView = () => {
    const { user } = useUser();
    const { currency, formatMoney } = useCrmCurrency();
    const deals = useQuery(api.private.deals.list, {});
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});
    const leads = useQuery(api.private.leads.list, {});

    const createDeal = useMutation(api.private.deals.create);
    const updateDealStage = useMutation(api.private.deals.updateStage);
    const removeDeal = useMutation(api.private.deals.remove);

    const accountMap = useMemo(() => {
        if (!accounts) return new Map<string, Account>();
        return new Map(accounts.map((a: Account) => [a._id, a]));
    }, [accounts]);
    const contactMap = useMemo(() => {
        if (!contacts) return new Map<string, Contact>();
        return new Map(contacts.map((c: Contact) => [c._id, c]));
    }, [contacts]);
    const leadMap = useMemo(() => {
        if (!leads) return new Map<string, Lead>();
        return new Map(leads.map((l: Lead) => [l._id, l]));
    }, [leads]);

    const [name, setName] = useState("");
    const [amount, setAmount] = useState<string>("");
    const [stage, setStage] = useState<(typeof dealStages)[number]>("Prospecting");
    const [closeDate, setCloseDate] = useState("");
    const [probability, setProbability] = useState("");
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState<string>("all");
    const [ownerFilter, setOwnerFilter] = useState<string>("all");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");

    const [accountId, setAccountId] = useState<string>("none");
    const [contactId, setContactId] = useState<string>("none");
    const [leadId, setLeadId] = useState<string>("none");
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const ownerOptions = useMemo(() => {
        const map = new Map<string, string>();
        (deals ?? []).forEach((d) => {
            const lead = d.leadId ? leadMap.get(d.leadId) : undefined;
            if (lead?.assignedToName) {
                map.set(lead.assignedToName, lead.assignedToName);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    }, [deals, leadMap]);

    const filteredDeals = useMemo(() => {
        const rows = deals ?? [];
        const q = search.trim().toLowerCase();
        const fromMs = createdFrom ? new Date(createdFrom + "T00:00:00").getTime() : undefined;
        const toMs = createdTo ? new Date(createdTo + "T23:59:59.999").getTime() : undefined;
        return rows.filter((deal) => {
            const lead = deal.leadId ? leadMap.get(deal.leadId) : undefined;
            const owner = lead?.assignedToName ?? "";
            const ownerUserId = lead?.assignedToUserId ?? "";
            const account = deal.accountId ? accountMap.get(deal.accountId) : undefined;
            const contact = deal.contactId ? contactMap.get(deal.contactId) : undefined;
            const blob = [
                deal.name,
                account?.name,
                contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") : "",
                owner,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            const searchOk = q ? blob.includes(q) : true;
            const stageOk = stageFilter === "all" ? true : deal.stage === stageFilter;
            const ownerOk =
                ownerFilter === "all"
                    ? true
                    : ownerFilter === "__my__"
                      ? !!user?.id && ownerUserId === user.id
                      : ownerFilter === "__unassigned__"
                        ? !owner
                        : owner === ownerFilter;
            const createdOk =
                (fromMs === undefined || deal._creationTime >= fromMs) &&
                (toMs === undefined || deal._creationTime <= toMs);
            return searchOk && stageOk && ownerOk && createdOk;
        });
    }, [
        deals,
        search,
        stageFilter,
        ownerFilter,
        createdFrom,
        createdTo,
        user?.id,
        leadMap,
        accountMap,
        contactMap,
    ]);

    const pipelineSummary = useMemo(() => {
        const open = filteredDeals.filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
        const won = filteredDeals.filter((d) => d.stage === "Closed Won");
        const lost = filteredDeals.filter((d) => d.stage === "Closed Lost");
        const openValue = open.reduce((s, d) => s + d.amount, 0);
        const wonValue = won.reduce((s, d) => s + d.amount, 0);
        return {
            openCount: open.length,
            openValue,
            wonCount: won.length,
            wonValue,
            lostCount: lost.length,
            totalShown: filteredDeals.length,
        };
    }, [filteredDeals]);

    const dealsByStage = useMemo(() => {
        const grouped = new Map<string, Deal[]>();
        dealStages.forEach((s) => grouped.set(s, []));
        filteredDeals.forEach((d) => {
            grouped.set(d.stage, [...(grouped.get(d.stage) ?? []), d]);
        });
        return grouped;
    }, [filteredDeals]);

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Deal name is required");
            return;
        }

        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount)) {
            toast.error("Amount must be a valid number");
            return;
        }

        setIsCreating(true);
        try {
            await createDeal({
                name: trimmedName,
                amount: parsedAmount,
                stage,
                closeDate: toTimestamp(closeDate),
                probability: probability.trim() ? Number(probability) : undefined,
                accountId: accountId === "none" ? undefined : (accountId as Id<"accounts">),
                contactId: contactId === "none" ? undefined : (contactId as Id<"contacts">),
                leadId: leadId === "none" ? undefined : (leadId as Id<"leads">),
            });

            setName("");
            setAmount("");
            setStage("Prospecting");
            setCloseDate("");
            setProbability("");
            setAccountId("none");
            setContactId("none");
            setLeadId("none");
            toast.success("Deal created");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create deal";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleStageChange = async (dealId: Id<"deals">, nextStage: Deal["stage"]) => {
        try {
            await updateDealStage({ dealId, stage: nextStage });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to update stage";
            toast.error(message);
        }
    };

    const handleDelete = async (dealId: Id<"deals">) => {
        try {
            await removeDeal({ dealId });
            toast.success("Deal deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete deal";
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f8fa]">
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between md:px-8 md:py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <KanbanIcon className="size-3.5 shrink-0" aria-hidden />
                            <span className="text-[10px] font-medium uppercase tracking-wide">Pipeline</span>
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">Deals</h1>
                        <span className="hidden text-xs text-slate-500 sm:inline">Opportunities by stage</span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        className={cn("gap-1.5 self-start md:self-auto", CRM_PRIMARY_BTN)}
                        onClick={() => setShowCreateForm((v) => !v)}
                    >
                        {showCreateForm ? (
                            <>
                                <ChevronUpIcon className="size-3.5" />
                                Hide
                            </>
                        ) : (
                            <>
                                <PlusIcon className="size-3.5" />
                                Create
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="mx-auto w-full max-w-[1600px] space-y-3 px-4 py-3 md:px-8 md:py-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="rounded-none border-2 border-slate-200 bg-white py-0 shadow-[2px_2px_0_0_rgb(226,232,240)]">
                        <CardContent className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-[#f5f8fa] text-slate-600">
                                <DollarSignIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Open pipeline</p>
                                <p className="truncate text-sm font-semibold leading-tight text-slate-900">{formatMoney(pipelineSummary.openValue)}</p>
                                <p className="text-[10px] text-slate-500">{pipelineSummary.openCount} open</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-none border-2 border-slate-200 bg-white py-0 shadow-[2px_2px_0_0_rgb(226,232,240)]">
                        <CardContent className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-[#f5f8fa] text-slate-600">
                                <BriefcaseIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Showing</p>
                                <p className="text-sm font-semibold leading-tight text-slate-900">{pipelineSummary.totalShown}</p>
                                <p className="text-[10px] text-slate-500">Filtered</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-none border-2 border-slate-200 bg-white py-0 shadow-[2px_2px_0_0_rgb(226,232,240)]">
                        <CardContent className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-none border border-emerald-200 bg-emerald-50 text-emerald-700">
                                <TrendingUpIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Won</p>
                                <p className="truncate text-sm font-semibold leading-tight text-slate-900">{formatMoney(pipelineSummary.wonValue)}</p>
                                <p className="text-[10px] text-slate-500">{pipelineSummary.wonCount} deals</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-none border-2 border-slate-200 bg-white py-0 shadow-[2px_2px_0_0_rgb(226,232,240)]">
                        <CardContent className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-none border border-red-200 bg-red-50 text-red-700">
                                <span className="text-xs font-bold" aria-hidden>
                                    —
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Lost</p>
                                <p className="text-sm font-semibold leading-tight text-slate-900">{pipelineSummary.lostCount}</p>
                                <p className="text-[10px] text-slate-500">In view</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {showCreateForm && (
                    <Card className="rounded-none border-2 border-slate-200 bg-white shadow-[3px_3px_0_0_rgb(226,232,240)]">
                        <CardHeader className="border-b border-slate-100 pb-4">
                            <CardTitle className="text-base font-semibold text-slate-900">New deal</CardTitle>
                            <CardDescription>Add an opportunity and optional links to account, contact, or lead.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid gap-4 md:grid-cols-6">
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Deal name</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New enterprise deal" className="border-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Amount ({currency})</Label>
                                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" className="border-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Stage</Label>
                                    <Select value={stage} onValueChange={(v) => setStage(v as (typeof dealStages)[number])}>
                                        <SelectTrigger className="h-9 border-slate-300">
                                            <SelectValue placeholder="Select stage" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dealStages.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Close date</Label>
                                    <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="border-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Probability %</Label>
                                    <Input value={probability} onChange={(e) => setProbability(e.target.value)} placeholder="60" className="border-slate-300" />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <Label>Account</Label>
                                    <Select value={accountId} onValueChange={setAccountId}>
                                        <SelectTrigger className="h-9 border-slate-300">
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
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Contact</Label>
                                    <Select value={contactId} onValueChange={setContactId}>
                                        <SelectTrigger className="h-9 border-slate-300">
                                            <SelectValue placeholder="Select contact" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {contacts?.map((c: Contact) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label>Lead</Label>
                                    <Select value={leadId} onValueChange={setLeadId}>
                                        <SelectTrigger className="h-9 border-slate-300">
                                            <SelectValue placeholder="Select lead" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {leads?.map((l: Lead) => (
                                                <SelectItem key={l._id} value={l._id}>
                                                    {l.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-end md:col-span-6">
                                    <Button
                                        type="button"
                                        className={CRM_PRIMARY_BTN}
                                        onClick={() => void handleCreate()}
                                        disabled={isCreating}
                                    >
                                        {isCreating ? "Creating…" : "Create deal"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-none border-2 border-slate-200 bg-white py-0 shadow-[2px_2px_0_0_rgb(226,232,240)]">
                    <CardContent className="p-2.5 md:p-3">
                        <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Filters</span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-5">
                            <div className="md:col-span-2">
                                <label htmlFor="deals-filter-search" className="sr-only">
                                    Search deals
                                </label>
                                <div
                                    className={cn(
                                        "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md border border-slate-300 bg-background px-2 shadow-xs",
                                        "outline-none transition-[color,box-shadow]",
                                        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                                    )}
                                >
                                    <SearchIcon className="size-3.5 shrink-0 text-slate-400" aria-hidden strokeWidth={2} />
                                    <input
                                        id="deals-filter-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search…"
                                        className="min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 text-xs text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
                                    />
                                </div>
                            </div>
                            <Select value={stageFilter} onValueChange={setStageFilter}>
                                <SelectTrigger className="h-8 border-slate-300 text-xs">
                                    <SelectValue placeholder="Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All stages</SelectItem>
                                    {dealStages.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                                <SelectTrigger className="h-8 border-slate-300 text-xs">
                                    <SelectValue placeholder="Owner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All owners</SelectItem>
                                    <SelectItem value="__my__">My deals</SelectItem>
                                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                                    {ownerOptions.map((owner) => (
                                        <SelectItem key={owner} value={owner}>
                                            {owner}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                    <Label className="text-[9px] uppercase text-slate-500">From</Label>
                                    <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} className="h-8 border-slate-300 px-2 text-xs" />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-[9px] uppercase text-slate-500">To</Label>
                                    <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} className="h-8 border-slate-300 px-2 text-xs" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="w-full min-w-0">
                    <div className="grid min-h-[min(70vh,720px)] w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {dealStages.map((stageName) => {
                            const stageDeals = dealsByStage.get(stageName) ?? [];
                            const stageTotal = stageDeals.reduce((sum, d) => sum + d.amount, 0);
                            return (
                                <div
                                    key={stageName}
                                    className={cn(
                                        "flex min-h-0 min-w-0 flex-col rounded-none border-2 border-slate-200 bg-white shadow-[3px_3px_0_0_rgb(226,232,240)]",
                                        "border-t-4",
                                        stageColumnAccent(stageName),
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-2 py-2.5 sm:px-3 sm:py-3">
                                        <div className="min-w-0">
                                            <p className="break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-700 sm:text-xs">
                                                {stageName}
                                            </p>
                                            <p className="mt-1 break-words text-[10px] text-slate-500 sm:text-[11px]">
                                                {stageDeals.length} deal{stageDeals.length === 1 ? "" : "s"} · {formatMoney(stageTotal)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2 sm:p-2.5">
                                        {stageDeals.length === 0 ? (
                                            <p className="rounded-md border border-dashed border-slate-200 bg-[#f5f8fa] px-3 py-6 text-center text-xs text-slate-500">
                                                Drop deals here by changing stage — or create a new one.
                                            </p>
                                        ) : (
                                            stageDeals.map((deal) => {
                                                const account = deal.accountId ? accountMap.get(deal.accountId) : undefined;
                                                const contact = deal.contactId ? contactMap.get(deal.contactId) : undefined;
                                                const lead = deal.leadId ? leadMap.get(deal.leadId) : undefined;
                                                const owner = lead?.assignedToName;
                                                const closeLabel = formatDealDate(deal.closeDate);
                                                return (
                                                    <div
                                                        key={deal._id}
                                                        className="space-y-2 rounded-none border-2 border-slate-200 bg-white p-3 shadow-sm"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="text-sm font-semibold leading-snug text-slate-900">{deal.name}</p>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 shrink-0 text-slate-500 hover:text-destructive"
                                                                onClick={() => void handleDelete(deal._id)}
                                                                aria-label={`Delete ${deal.name}`}
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </Button>
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-800">{formatMoney(deal.amount)}</p>
                                                        <p className="text-xs text-slate-600">
                                                            {account?.name ?? "No account"}
                                                            {contact
                                                                ? ` · ${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}`
                                                                : ""}
                                                        </p>
                                                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                                            <span>Owner: {owner ?? "Unassigned"}</span>
                                                            {deal.probability != null ? <span>· {deal.probability}%</span> : null}
                                                            {closeLabel ? (
                                                                <span className="inline-flex items-center gap-0.5">
                                                                    <CalendarIcon className="size-3" />
                                                                    {closeLabel}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <Select value={deal.stage} onValueChange={(v) => void handleStageChange(deal._id, v as Deal["stage"])}>
                                                            <SelectTrigger className="h-8 border-slate-300 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {dealStages.map((s) => (
                                                                    <SelectItem key={s} value={s}>
                                                                        {s}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="mt-auto border-t border-slate-200 bg-[#f5f8fa] px-3 py-2">
                                        <p className="text-xs font-medium text-slate-700">
                                            Column total: <span className="text-slate-900">{formatMoney(stageTotal)}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
