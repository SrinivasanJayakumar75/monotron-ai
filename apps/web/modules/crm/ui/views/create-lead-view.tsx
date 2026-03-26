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
    const upsertLeadAssociation = useMutation((api as any).private.leadAssociations.upsert);
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});

    const [name, setName] = useState("");
    const [company, setCompany] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [leadSource, setLeadSource] = useState(storedSourceToSelect(undefined));
    const [stage, setStage] = useState<(typeof LEAD_STATUS_OPTIONS)[number]["value"]>("New");
    const [assigneeKey, setAssigneeKey] = useState(ASSIGNEE_NONE);
    const [associatedAccountId, setAssociatedAccountId] = useState<string>("none");
    const [associatedContactId, setAssociatedContactId] = useState<string>("none");
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
        const { userId, name: aname } = resolveAssignee();
        setSubmitting(true);
        try {
            const leadId = await createLead({
                name: name.trim(),
                company: company.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                leadSource: sourceSelectToStored(leadSource),
                stage,
                assignedToUserId: userId,
                assignedToName: aname,
            });
            await upsertLeadAssociation({
                leadId,
                accountId: associatedAccountId === "none" ? undefined : (associatedAccountId as Id<"accounts">),
                contactId: associatedContactId === "none" ? undefined : (associatedContactId as Id<"contacts">),
            });
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
                        <Button type="button" onClick={save} disabled={submitting}>
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
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
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
                </div>
            </div>
        </div>
    );
};
