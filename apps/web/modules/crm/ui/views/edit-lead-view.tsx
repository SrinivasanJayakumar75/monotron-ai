"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOrganization, useUser } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
    EMPTY_SELECT_VALUE,
    LEAD_SOURCE_OPTIONS,
    LEAD_STATUS_OPTIONS,
    sourceSelectToStored,
    storedSourceToSelect,
    type PrimaryLeadStatus,
} from "../leads-ui-constants";

const ASSIGNEE_NONE = "__assign_none__";
const ASSIGNEE_ME = "__me__";

function normalizeStageForForm(stage: Doc<"leads">["stage"]): PrimaryLeadStatus {
    if (stage === "Lost" || stage === "Closed Lost") return "Lost";
    if (stage === "Proposal" || stage === "Negotiation" || stage === "Closed Won") return "Qualified";
    if (stage === "New" || stage === "Contacted" || stage === "Qualified") return stage;
    return "New";
}

function dateInputFromMs(ms: number | undefined): string {
    if (ms === undefined) return "";
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
}

function msFromDateInput(iso: string): number | undefined {
    if (!iso) return undefined;
    return new Date(iso + "T12:00:00").getTime();
}

export const EditLeadView = () => {
    const params = useParams<{ leadId: string }>();
    const router = useRouter();
    const leadId = params.leadId as Id<"leads"> | undefined;
    const lead = useQuery(api.private.leads.getOne, leadId ? { leadId } : "skip");
    const updateLead = useMutation(api.private.leads.update);
    const association = useQuery((api as any).private.leadAssociations.getByLead, leadId ? { leadId } : "skip");
    const upsertLeadAssociation = useMutation((api as any).private.leadAssociations.upsert);
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});
    const { user } = useUser();
    const { memberships } = useOrganization({
        memberships: {
            pageSize: 50,
            infinite: true,
        },
    });

    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [address, setAddress] = useState("");
    const [industry, setIndustry] = useState("");
    const [leadSource, setLeadSource] = useState(EMPTY_SELECT_VALUE);
    const [stage, setStage] = useState<PrimaryLeadStatus>("New");
    const [leadScore, setLeadScore] = useState("");
    const [expectedDealValue, setExpectedDealValue] = useState("");
    const [productInterest, setProductInterest] = useState("");
    const [assigneeKey, setAssigneeKey] = useState(ASSIGNEE_NONE);
    const [associatedAccountId, setAssociatedAccountId] = useState<string>("none");
    const [associatedContactId, setAssociatedContactId] = useState<string>("none");
    const [lastContacted, setLastContacted] = useState("");
    const [hydrated, setHydrated] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        if (!lead || lead === null) return;
        setName(lead.name);
        setCompany(lead.company ?? "");
        setEmail(lead.email ?? "");
        setPhone(lead.phone ?? "");
        setWebsite(lead.website ?? "");
        setAddress(lead.address ?? "");
        setIndustry(lead.industry ?? "");
        setLeadSource(storedSourceToSelect(lead.leadSource));
        setStage(normalizeStageForForm(lead.stage));
        setLeadScore(lead.leadScore !== undefined ? String(lead.leadScore) : "");
        setExpectedDealValue(
            lead.expectedDealValue !== undefined ? String(lead.expectedDealValue) : "",
        );
        setProductInterest(lead.productInterest ?? "");
        setLastContacted(dateInputFromMs(lead.lastContactedAt));
        if (lead.assignedToUserId && user?.id === lead.assignedToUserId) {
            setAssigneeKey(ASSIGNEE_ME);
        } else if (lead.assignedToUserId) {
            setAssigneeKey(lead.assignedToUserId);
        } else {
            setAssigneeKey(ASSIGNEE_NONE);
        }
        setHydrated(true);
    }, [lead, user?.id]);

    useEffect(() => {
        if (!association) return;
        setAssociatedAccountId(association.accountId ?? "none");
        setAssociatedContactId(association.contactId ?? "none");
    }, [association]);

    const resolveAssignee = () => {
        if (assigneeKey === ASSIGNEE_NONE) return { userId: undefined as string | undefined, name: undefined as string | undefined };
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

    const save = async () => {
        if (!leadId || !lead) return;
        if (!name.trim()) {
            toast.error("Lead name is required");
            return;
        }
        const { userId, name: aname } = resolveAssignee();
        const score = leadScore.trim() === "" ? undefined : Number(leadScore);
        const dealVal = expectedDealValue.trim() === "" ? undefined : Number(expectedDealValue);
        if (score !== undefined && Number.isNaN(score)) {
            toast.error("Lead score must be a number");
            return;
        }
        if (dealVal !== undefined && Number.isNaN(dealVal)) {
            toast.error("Expected deal value must be a number");
            return;
        }
        setSubmitting(true);
        try {
            await updateLead({
                leadId,
                name: name.trim(),
                company: company.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                website: website.trim() || undefined,
                address: address.trim() || undefined,
                industry: industry.trim() || undefined,
                leadSource: sourceSelectToStored(leadSource),
                stage,
                leadScore: score,
                expectedDealValue: dealVal,
                productInterest: productInterest.trim() || undefined,
                assignedToUserId: assigneeKey === ASSIGNEE_NONE ? "" : (userId ?? ""),
                assignedToName: assigneeKey === ASSIGNEE_NONE ? "" : (aname ?? ""),
                lastContactedAt: msFromDateInput(lastContacted),
            });
            await upsertLeadAssociation({
                leadId,
                accountId: associatedAccountId === "none" ? undefined : (associatedAccountId as Id<"accounts">),
                contactId: associatedContactId === "none" ? undefined : (associatedContactId as Id<"contacts">),
            });
            toast.success("Lead updated");
            router.push(`/crm/leads/${leadId}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not save");
        } finally {
            setSubmitting(false);
        }
    };

    if (!leadId) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Invalid lead.</p>
            </div>
        );
    }

    if (lead === undefined || !hydrated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (lead === null) {
        return (
            <div className="p-6">
                <p className="font-medium">Lead not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/crm/leads">Back</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            <div className="border-b bg-white/90 px-6 py-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl">Edit lead</h1>
                        <p className="text-muted-foreground text-sm">
                            <Link href={`/crm/leads/${leadId}`} className="text-indigo-600 hover:underline">
                                Profile
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Edit</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={save} disabled={submitting}>
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-8 p-6">
                <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Basic information</h2>
                    <div className="space-y-1">
                        <Label>
                            Name <span className="text-destructive">*</span>
                        </Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Company</Label>
                            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Industry</Label>
                            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>Website</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>Address</Label>
                            <Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Lead information</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Lead source</Label>
                            <Select value={leadSource} onValueChange={setLeadSource}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={EMPTY_SELECT_VALUE}>—</SelectItem>
                                    {LEAD_SOURCE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Lead status</Label>
                            <Select value={stage} onValueChange={(v) => setStage(v as PrimaryLeadStatus)}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEAD_STATUS_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Lead score</Label>
                            <Input
                                inputMode="numeric"
                                value={leadScore}
                                onChange={(e) => setLeadScore(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Expected deal value (USD)</Label>
                            <Input
                                inputMode="decimal"
                                value={expectedDealValue}
                                onChange={(e) => setExpectedDealValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label>Product interest</Label>
                            <Textarea
                                rows={3}
                                value={productInterest}
                                onChange={(e) => setProductInterest(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Associated account</Label>
                            <Select value={associatedAccountId} onValueChange={setAssociatedAccountId}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select account" />
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
                        <div className="space-y-1">
                            <Label>Associated contact</Label>
                            <Select value={associatedContactId} onValueChange={setAssociatedContactId}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select contact" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {(contacts ?? [])
                                        .filter((c) => associatedAccountId === "none" || c.accountId === associatedAccountId)
                                        .map((c) => (
                                            <SelectItem key={c._id} value={c._id}>
                                                {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Assigned to</Label>
                            <Select value={assigneeKey} onValueChange={setAssigneeKey}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ASSIGNEE_NONE}>Unassigned</SelectItem>
                                    {user ? (
                                        <SelectItem value={ASSIGNEE_ME}>
                                            Me (
                                            {user.fullName || user.primaryEmailAddress?.emailAddress || "you"})
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
                        <div className="space-y-1">
                            <Label>Last contacted</Label>
                            <Input
                                type="date"
                                className="h-9"
                                value={lastContacted}
                                onChange={(e) => setLastContacted(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
