"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
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
import { SearchIcon, Trash2Icon } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useCrmCurrency } from "../../lib/use-crm-currency";

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
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-4xl">Deals</h1>
                            <p className="text-muted-foreground">Track opportunities through the sales process.</p>
                        </div>
                        <Button
                            className="bg-indigo-600 text-white hover:bg-indigo-500"
                            onClick={() => setShowCreateForm((v) => !v)}
                        >
                            {showCreateForm ? "Hide form" : "Create deal"}
                        </Button>
                    </div>
                </div>

                {showCreateForm && (
                <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-6">
                        <div className="md:col-span-2 space-y-1">
                            <Label>Deal name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New enterprise deal" />
                        </div>
                        <div className="space-y-1">
                            <Label>Amount ({currency})</Label>
                            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
                        </div>
                        <div className="space-y-1">
                            <Label>Stage</Label>
                            <Select value={stage} onValueChange={(v) => setStage(v as (typeof dealStages)[number])}>
                                <SelectTrigger className="h-9">
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
                            <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Probability %</Label>
                            <Input value={probability} onChange={(e) => setProbability(e.target.value)} placeholder="60" />
                        </div>

                        <div className="md:col-span-2 space-y-1">
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
                        <div className="space-y-1 md:col-span-2">
                            <Label>Contact</Label>
                            <Select value={contactId} onValueChange={setContactId}>
                                <SelectTrigger className="h-9">
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
                                <SelectTrigger className="h-9">
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

                        <div className="md:col-span-6 flex items-end">
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleCreate} disabled={isCreating}>
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
                )}

                <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-5">
                        <div className="relative md:col-span-2">
                            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or account"
                            />
                        </div>
                        <Select value={stageFilter} onValueChange={setStageFilter}>
                            <SelectTrigger className="h-9">
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
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Deal owner" />
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
                            <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
                            <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dealStages.map((stageName) => {
                        const stageDeals = dealsByStage.get(stageName) ?? [];
                        const stageTotal = stageDeals.reduce((sum, d) => sum + d.amount, 0);
                        return (
                            <div key={stageName} className="rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        {stageName}
                                    </p>
                                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                                </div>
                                <div className="space-y-2 p-3">
                                    {stageDeals.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No deals</p>
                                    ) : (
                                        stageDeals.map((deal) => {
                                            const account = deal.accountId ? accountMap.get(deal.accountId) : undefined;
                                            const contact = deal.contactId ? contactMap.get(deal.contactId) : undefined;
                                            const lead = deal.leadId ? leadMap.get(deal.leadId) : undefined;
                                            const owner = lead?.assignedToName;
                                            return (
                                                <div key={deal._id} className="rounded-lg border border-slate-200 bg-white p-3">
                                                    <p className="text-sm font-semibold text-slate-900">{deal.name}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Amount: {formatMoney(deal.amount)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {account?.name ?? "No account"}
                                                        {contact
                                                            ? ` · ${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}`
                                                            : ""}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Owner: {owner ?? "Unassigned"}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <Select
                                                            value={deal.stage}
                                                            onValueChange={(v) =>
                                                                handleStageChange(deal._id, v as Deal["stage"])
                                                            }
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(deal._id)}
                                                            aria-label={`Delete ${deal.name}`}
                                                        >
                                                            <Trash2Icon className="size-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <div className="border-t border-slate-200/80 px-3 py-2 text-xs text-muted-foreground">
                                    Total: {formatMoney(stageTotal)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

