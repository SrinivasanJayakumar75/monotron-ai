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
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";
import { useCrmCurrency } from "../../lib/use-crm-currency";

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

function dateInputFromMs(ms: number | undefined): string {
    if (ms === undefined) return "";
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
}

function msFromDateInput(iso: string): number | undefined {
    const trimmed = iso.trim();
    if (!trimmed) return undefined;
    const ms = new Date(trimmed + "T12:00:00").getTime();
    return Number.isNaN(ms) ? undefined : ms;
}

export const EditDealView = () => {
    const params = useParams<{ dealId: string }>();
    const router = useRouter();
    const dealId = params.dealId as Id<"deals"> | undefined;
    const deal = useQuery(api.private.deals.getOne, dealId ? { dealId } : "skip");
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});
    const leads = useQuery(api.private.leads.list, {});
    const updateDeal = useMutation(api.private.deals.update);
    const { currency } = useCrmCurrency();

    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [stage, setStage] = useState<(typeof dealStages)[number]>("Prospecting");
    const [closeDate, setCloseDate] = useState("");
    const [probability, setProbability] = useState("");
    const [accountId, setAccountId] = useState<string>("none");
    const [contactId, setContactId] = useState<string>("none");
    const [leadId, setLeadId] = useState<string>("none");
    const [hydrated, setHydrated] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (deal === undefined) return;
        if (deal === null) {
            setHydrated(true);
            return;
        }
        setName(deal.name);
        setAmount(String(deal.amount));
        setStage(deal.stage);
        setCloseDate(dateInputFromMs(deal.closeDate));
        setProbability(deal.probability != null ? String(deal.probability) : "");
        setAccountId(deal.accountId ?? "none");
        setContactId(deal.contactId ?? "none");
        setLeadId(deal.leadId ?? "none");
        setHydrated(true);
    }, [deal]);

    const save = async () => {
        if (!dealId || !deal) return;
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
        let probabilityArg: number | undefined;
        const probTrim = probability.trim();
        if (probTrim) {
            const p = Number(probTrim);
            if (!Number.isFinite(p)) {
                toast.error("Probability must be a number");
                return;
            }
            probabilityArg = p;
        }

        setSubmitting(true);
        try {
            await updateDeal({
                dealId,
                name: trimmedName,
                amount: parsedAmount,
                stage,
                closeDate: msFromDateInput(closeDate),
                probability: probabilityArg,
                accountId: accountId === "none" ? undefined : (accountId as Id<"accounts">),
                contactId: contactId === "none" ? undefined : (contactId as Id<"contacts">),
                leadId: leadId === "none" ? undefined : (leadId as Id<"leads">),
            });
            toast.success("Deal updated");
            router.push("/crm/deals");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
            setSubmitting(false);
        }
    };

    if (!dealId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid deal.</p>
            </div>
        );
    }

    if (deal === undefined || (deal !== null && !hydrated)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (deal === null) {
        return (
            <div className="p-6">
                <p className="font-medium">Deal not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/crm/deals">Back to deals</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            <div className="border-b bg-white/90 px-6 py-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl">Edit deal</h1>
                        <p className="text-muted-foreground text-sm">
                            <Link href="/crm/deals" className="text-indigo-600 hover:underline">
                                Deals
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Edit</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="button" className={CRM_PRIMARY_BTN} onClick={() => void save()} disabled={submitting}>
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-8 p-6">
                <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Deal details</h2>
                    <div className="space-y-1">
                        <Label>
                            Deal name <span className="text-destructive">*</span>
                        </Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Amount ({currency})</Label>
                            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Stage</Label>
                            <Select value={stage} onValueChange={(v) => setStage(v as (typeof dealStages)[number])}>
                                <SelectTrigger>
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
                        <div className="space-y-1">
                            <Label>Close date</Label>
                            <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Probability %</Label>
                            <Input
                                value={probability}
                                onChange={(e) => setProbability(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-1">
                        <div className="space-y-1">
                            <Label>Account</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="None" />
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
                            <Label>Contact</Label>
                            <Select value={contactId} onValueChange={setContactId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {contacts?.map((c: Contact) => (
                                        <SelectItem key={c._id} value={c._id}>
                                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Lead</Label>
                            <Select value={leadId} onValueChange={setLeadId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="None" />
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
                    </div>
                </div>
            </div>
        </div>
    );
};
