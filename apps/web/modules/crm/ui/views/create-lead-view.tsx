"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization, useUser } from "@clerk/nextjs";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
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
} from "../leads-ui-constants";
import { CRM_ACTIVITY_TYPE_OPTIONS, type CrmActivityTypeValue } from "../crm-activity-constants";
import { useCrmCurrency } from "../../lib/use-crm-currency";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

const ASSIGNEE_NONE = "__assign_none__";
const ASSIGNEE_ME = "__me__";

export const CreateLeadView = () => {
    const router = useRouter();
    const { user } = useUser();
    const { memberships } = useOrganization({
        memberships: {
            pageSize: 50,
            infinite: true,
        },
    });

    const createLead = useMutation(api.private.leads.create);
    const createActivity = useMutation(api.private.activities.create);
    const upsertLeadAssociation = useMutation((api as any).private.leadAssociations.upsert);
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});
    const { currency } = useCrmCurrency();

    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [website, setWebsite] = useState("");
    const [address, setAddress] = useState("");
    const [industry, setIndustry] = useState("");
    const [leadScore, setLeadScore] = useState("");
    const [expectedDealValue, setExpectedDealValue] = useState("");
    const [productInterest, setProductInterest] = useState("");
    const [lastContactedLocal, setLastContactedLocal] = useState("");
    const [leadSource, setLeadSource] = useState(storedSourceToSelect(undefined));
    const [stage, setStage] = useState<(typeof LEAD_STATUS_OPTIONS)[number]["value"]>("New");
    const [assigneeKey, setAssigneeKey] = useState(ASSIGNEE_NONE);
    const [associatedAccountId, setAssociatedAccountId] = useState<string>("none");
    const [associatedContactId, setAssociatedContactId] = useState<string>("none");
    const [activityType, setActivityType] = useState<CrmActivityTypeValue>("task");
    const [activitySubject, setActivitySubject] = useState("");
    const [activityDescription, setActivityDescription] = useState("");
    const [activityDueDate, setActivityDueDate] = useState("");
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
        if (!name.trim()) {
            toast.error("Lead name is required");
            return;
        }
        let parsedLeadScore: number | undefined;
        if (leadScore.trim()) {
            const n = Number.parseInt(leadScore, 10);
            if (Number.isNaN(n)) {
                toast.error("Lead score must be a whole number");
                return;
            }
            parsedLeadScore = n;
        }
        let parsedExpectedValue: number | undefined;
        if (expectedDealValue.trim()) {
            const n = Number.parseFloat(expectedDealValue);
            if (Number.isNaN(n)) {
                toast.error("Expected deal value must be a number");
                return;
            }
            parsedExpectedValue = n;
        }
        let lastContactedAt: number | undefined;
        if (lastContactedLocal.trim()) {
            const ts = new Date(lastContactedLocal).getTime();
            if (Number.isNaN(ts)) {
                toast.error("Last contacted date is invalid");
                return;
            }
            lastContactedAt = ts;
        }
        const { userId, name: aname } = resolveAssignee();
        setSubmitting(true);
        try {
            const leadId = await createLead({
                name: name.trim(),
                company: company.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                whatsapp: whatsapp.trim() || undefined,
                website: website.trim() || undefined,
                address: address.trim() || undefined,
                industry: industry.trim() || undefined,
                leadScore: parsedLeadScore,
                expectedDealValue: parsedExpectedValue,
                productInterest: productInterest.trim() || undefined,
                lastContactedAt,
                leadSource: sourceSelectToStored(leadSource),
                stage,
                assignedToUserId: userId,
                assignedToName: aname,
            });
            await upsertLeadAssociation({
                leadId,
                accountId:
                    associatedAccountId === "none" ? null : (associatedAccountId as Id<"accounts">),
                contactId:
                    associatedContactId === "none" ? null : (associatedContactId as Id<"contacts">),
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
                    relatedLeadId: leadId,
                    assignee: user?.fullName || user?.primaryEmailAddress?.emailAddress || undefined,
                });
            }
            setActivityType("task");
            setActivitySubject("");
            setActivityDescription("");
            setActivityDueDate("");
            toast.success("Lead created");
            router.push("/crm/leads");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create lead");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            <div className="border-b bg-white/90 px-6 py-4">
                <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl">Create lead</h1>
                        <p className="text-muted-foreground text-sm">
                            <Link href="/crm/leads" className="text-indigo-600 hover:underline">
                                Leads
                            </Link>
                            <span className="mx-1">›</span>
                            <span>New</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="button" className={CRM_PRIMARY_BTN} onClick={save} disabled={submitting}>
                            Create lead
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mx-auto w-full max-w-2xl flex-1 p-6">
                <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
                    <div className="space-y-1">
                        <Label>
                            Lead name <span className="text-destructive">*</span>
                        </Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="space-y-1">
                        <Label>Company</Label>
                        <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Office / mobile" />
                        </div>
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                            <Label>WhatsApp</Label>
                            <Input
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="+1 555 0100 (with country code)"
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Website</Label>
                            <Input
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Industry</Label>
                            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Address</Label>
                        <Textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Street, city, region, postal code"
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Lead score</Label>
                            <Input
                                type="number"
                                min={0}
                                value={leadScore}
                                onChange={(e) => setLeadScore(e.target.value)}
                                placeholder="e.g. 50"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Expected deal value ({currency})</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={expectedDealValue}
                                onChange={(e) => setExpectedDealValue(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="space-y-1 max-w-md">
                        <Label>Last contacted</Label>
                        <Input
                            type="datetime-local"
                            value={lastContactedLocal}
                            onChange={(e) => setLastContactedLocal(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">Optional. Stored using your browser&apos;s local date and time.</p>
                    </div>
                    <div className="space-y-1">
                        <Label>Product interest</Label>
                        <Textarea
                            value={productInterest}
                            onChange={(e) => setProductInterest(e.target.value)}
                            placeholder="Products or services this lead is interested in"
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Lead source</Label>
                            <Select value={leadSource} onValueChange={setLeadSource}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select source" />
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
                            <Select value={stage} onValueChange={(v) => setStage(v as typeof stage)}>
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
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                                    {(contacts ?? []).map((c) => (
                                        <SelectItem key={c._id} value={c._id}>
                                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Assigned to (sales rep)</Label>
                        <Select value={assigneeKey} onValueChange={setAssigneeKey}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Unassigned" />
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
                        <p className="text-muted-foreground text-xs">
                            Created date is set automatically when you save.
                        </p>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                        <div>
                            <h3 className="text-sm font-medium">Initial activity (optional)</h3>
                            <p className="text-muted-foreground text-xs">
                                Add a follow-up task, call, email, or meeting linked to this lead.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>Type</Label>
                                <Select value={activityType} onValueChange={(v) => setActivityType(v as CrmActivityTypeValue)}>
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
                        </div>
                        <div className="space-y-1">
                            <Label>Subject</Label>
                            <Input
                                value={activitySubject}
                                onChange={(e) => setActivitySubject(e.target.value)}
                                placeholder="e.g. Follow up on demo request"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Description</Label>
                            <Textarea
                                value={activityDescription}
                                onChange={(e) => setActivityDescription(e.target.value)}
                                placeholder="Notes or details…"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
