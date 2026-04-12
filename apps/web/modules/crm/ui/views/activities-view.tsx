"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
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
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import {
    Building2Icon,
    CalendarClockIcon,
    CheckSquareIcon,
    ListTodoIcon,
    MailIcon,
    PhoneIcon,
    PencilIcon,
    SearchIcon,
    Trash2Icon,
    UserIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

type Activity = Doc<"activities">;

const activityTypes = ["task", "call", "email", "meeting"] as const;
const activityStatuses = ["open", "completed", "cancelled"] as const;

function parseDueAtInput(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed}T12:00:00`).getTime();
    }
    const ms = new Date(trimmed).getTime();
    if (Number.isNaN(ms)) return undefined;
    return ms;
}

function startOfTodayMs() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function formatDueAt(dueAt?: number) {
    if (!dueAt) return "—";
    return new Date(dueAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function dueAtToDateInput(dueAt?: number): string {
    if (!dueAt) return "";
    const d = new Date(dueAt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseDueAtInputOrNull(dateStr: string): number | null {
    const trimmed = dateStr.trim();
    if (!trimmed) return null;
    const n = parseDueAtInput(dateStr);
    return n === undefined ? null : n;
}

function activityTypeIcon(type: Activity["type"]) {
    switch (type) {
        case "task":
            return CheckSquareIcon;
        case "call":
            return PhoneIcon;
        case "email":
            return MailIcon;
        case "meeting":
            return CalendarClockIcon;
        default:
            return ListTodoIcon;
    }
}

function activityTypeBadgeClass(type: Activity["type"]) {
    switch (type) {
        case "task":
            return "border-indigo-200 bg-indigo-50 text-indigo-900";
        case "call":
            return "border-emerald-200 bg-emerald-50 text-emerald-900";
        case "email":
            return "border-sky-200 bg-sky-50 text-sky-900";
        case "meeting":
            return "border-violet-200 bg-violet-50 text-violet-900";
        default:
            return "border-slate-200 bg-slate-50 text-slate-800";
    }
}

function statusBadgeClass(status: Activity["status"]) {
    switch (status) {
        case "open":
            return "border-amber-200 bg-amber-50 text-amber-950";
        case "completed":
            return "border-emerald-200 bg-emerald-50 text-emerald-900";
        case "cancelled":
            return "border-slate-200 bg-slate-100 text-slate-600";
        default:
            return "border-slate-200 bg-slate-50 text-slate-800";
    }
}

function formatStatusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

export const ActivitiesView = ({ type }: { type?: (typeof activityTypes)[number] }) => {
    const activities = useQuery(api.private.activities.list, type ? { type } : {});
    const accounts = useQuery(api.private.accounts.list);
    const contacts = useQuery(api.private.contacts.list, {});
    const leads = useQuery(api.private.leads.list, {});
    const deals = useQuery(api.private.deals.list, {});
    const createActivity = useMutation(api.private.activities.create);
    const updateStatus = useMutation(api.private.activities.updateStatus);
    const updateActivity = useMutation(api.private.activities.update);
    const removeActivity = useMutation(api.private.activities.remove);

    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [status, setStatus] = useState<(typeof activityStatuses)[number]>("open");
    const [linkAccountId, setLinkAccountId] = useState<string>("none");
    const [linkContactId, setLinkContactId] = useState<string>("none");
    const [isCreating, setIsCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [editSubject, setEditSubject] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editDueAt, setEditDueAt] = useState("");
    const [editStatus, setEditStatus] = useState<(typeof activityStatuses)[number]>("open");
    const [editLinkAccountId, setEditLinkAccountId] = useState<string>("none");
    const [editLinkContactId, setEditLinkContactId] = useState<string>("none");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const effectiveType = type ?? "task";

    const title = useMemo(() => {
        if (!type) return "Activities";
        return type === "meeting"
            ? "Events"
            : type === "task"
              ? "Tasks"
              : type === "call"
                ? "Calls"
                : "Emails";
    }, [type]);

    const accountById = useMemo(
        () => new Map((accounts ?? []).map((a) => [a._id, a])),
        [accounts],
    );
    const contactLabel = (c: Doc<"contacts">) =>
        [c.firstName, c.lastName].filter(Boolean).join(" ") || c.firstName;
    const contactById = useMemo(
        () => new Map((contacts ?? []).map((c) => [c._id, c])),
        [contacts],
    );
    const leadById = useMemo(() => new Map((leads ?? []).map((l) => [l._id, l])), [leads]);
    const dealById = useMemo(() => new Map((deals ?? []).map((d) => [d._id, d])), [deals]);

    const relatedSummary = (
        a: Activity,
    ): { href: string; label: string; linkable: boolean } | null => {
        if (a.relatedContactId) {
            const c = contactById.get(a.relatedContactId);
            return {
                href: `/crm/contacts/${a.relatedContactId}`,
                label: c ? contactLabel(c) : "Contact",
                linkable: true,
            };
        }
        if (a.relatedAccountId) {
            const acc = accountById.get(a.relatedAccountId);
            return {
                href: `/crm/accounts/${a.relatedAccountId}`,
                label: acc?.name ?? "Account",
                linkable: true,
            };
        }
        if (a.relatedLeadId) {
            const l = leadById.get(a.relatedLeadId);
            return { href: `/crm/leads/${a.relatedLeadId}`, label: l?.name ?? "Lead", linkable: true };
        }
        if (a.relatedDealId) {
            const d = dealById.get(a.relatedDealId);
            return {
                href: "/crm/deals",
                label: d?.name ?? "Deal",
                linkable: false,
            };
        }
        return null;
    };

    const filteredActivities = useMemo(() => {
        let rows = [...(activities ?? [])];
        if (statusFilter !== "all") {
            rows = rows.filter((a) => a.status === statusFilter);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter((a) => {
                const rel = relatedSummary(a);
                const blob = [
                    a.subject,
                    a.description,
                    a.assignee,
                    rel?.label,
                    a.type,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return blob.includes(q);
            });
        }
        rows.sort((a, b) => {
            const da = a.dueAt ?? Number.POSITIVE_INFINITY;
            const db = b.dueAt ?? Number.POSITIVE_INFINITY;
            if (da !== db) return da - db;
            return b._creationTime - a._creationTime;
        });
        return rows;
    }, [activities, statusFilter, search, contactById, accountById, leadById, dealById]);

    const handleCreate = async () => {
        const trimmed = subject.trim();
        if (!trimmed) {
            toast.error("Subject is required");
            return;
        }

        setIsCreating(true);
        try {
            await createActivity({
                type: effectiveType,
                subject: trimmed,
                description: description.trim() || undefined,
                dueAt: parseDueAtInput(dueAt),
                status,
                relatedAccountId: linkAccountId !== "none" ? (linkAccountId as Id<"accounts">) : undefined,
                relatedContactId: linkContactId !== "none" ? (linkContactId as Id<"contacts">) : undefined,
            });
            setSubject("");
            setDescription("");
            setDueAt("");
            setStatus("open");
            setLinkAccountId("none");
            setLinkContactId("none");
            setShowCreate(false);
            toast.success("Activity created");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create activity";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (activityId: Id<"activities">) => {
        try {
            await removeActivity({ activityId });
            toast.success("Activity deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete activity";
            toast.error(message);
        }
    };

    const handleStatusChange = async (activityId: Id<"activities">, nextStatus: Activity["status"]) => {
        try {
            await updateStatus({ activityId, status: nextStatus });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to update status";
            toast.error(message);
        }
    };

    useEffect(() => {
        if (!editingActivity) return;
        setEditSubject(editingActivity.subject);
        setEditDescription(editingActivity.description ?? "");
        setEditDueAt(dueAtToDateInput(editingActivity.dueAt));
        setEditStatus(editingActivity.status);
        setEditLinkAccountId(editingActivity.relatedAccountId ?? "none");
        setEditLinkContactId(editingActivity.relatedContactId ?? "none");
    }, [editingActivity]);

    const handleSaveEdit = async () => {
        if (!editingActivity) return;
        const trimmed = editSubject.trim();
        if (!trimmed) {
            toast.error("Subject is required");
            return;
        }
        const dueParsed = parseDueAtInputOrNull(editDueAt);
        if (editDueAt.trim() && dueParsed === null) {
            toast.error("Invalid due date");
            return;
        }
        setIsSavingEdit(true);
        try {
            await updateActivity({
                activityId: editingActivity._id,
                subject: trimmed,
                description: editDescription,
                dueAt: dueParsed,
                status: editStatus,
                relatedAccountId:
                    editLinkAccountId !== "none" ? (editLinkAccountId as Id<"accounts">) : null,
                relatedContactId:
                    editLinkContactId !== "none" ? (editLinkContactId as Id<"contacts">) : null,
            });
            setEditingActivity(null);
            toast.success("Saved");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save";
            toast.error(message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 p-6 md:p-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                            {title}
                        </h1>
                        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed md:text-base">
                            Stay on top of follow-ups. Link items to accounts or contacts so your team sees
                            context everywhere.
                        </p>
                    </div>
                    <Button
                        className={cn("shrink-0", CRM_PRIMARY_BTN)}
                        onClick={() => setShowCreate((v) => !v)}
                    >
                        {showCreate ? "Close composer" : `New ${title.replace(/s$/, "")}`}
                    </Button>
                </div>

                <Card className="border-slate-200/80 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search subject, notes, assignee, related record…"
                                className="h-10 pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-full sm:w-[200px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {activityStatuses.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {formatStatusLabel(s)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {showCreate && (
                    <Card className="border-indigo-200/60 bg-indigo-50/20 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Create {title.replace(/s$/, "").toLowerCase()}</CardTitle>
                            <CardDescription>
                                Add details now; optionally link to a company or person for one-click context on
                                their record.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Subject</Label>
                                    <Input
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="e.g. Follow up on pricing proposal"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Context, agenda, or next step…"
                                        rows={3}
                                        className="min-h-[88px] resize-y"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due date</Label>
                                    <Input
                                        type="date"
                                        value={dueAt}
                                        onChange={(e) => setDueAt(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Starting status</Label>
                                    <Select
                                        value={status}
                                        onValueChange={(v) => setStatus(v as (typeof activityStatuses)[number])}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activityStatuses.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {formatStatusLabel(s)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Building2Icon className="size-3.5 opacity-70" />
                                        Link account
                                    </Label>
                                    <Select value={linkAccountId} onValueChange={setLinkAccountId}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Optional" />
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
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <UserIcon className="size-3.5 opacity-70" />
                                        Link contact
                                    </Label>
                                    <Select value={linkContactId} onValueChange={setLinkContactId}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Optional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {(contacts ?? []).map((c) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {contactLabel(c)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className={CRM_PRIMARY_BTN}
                                >
                                    Save activity
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                <TableHead className="w-[36%]">Activity</TableHead>
                                {!type ? <TableHead className="w-[100px]">Type</TableHead> : null}
                                <TableHead>Related</TableHead>
                                <TableHead className="w-[120px]">Due</TableHead>
                                <TableHead className="w-[150px]">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities === undefined ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={type ? 5 : 6}
                                        className="text-muted-foreground py-12 text-center"
                                    >
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : filteredActivities.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={type ? 5 : 6}
                                        className="text-muted-foreground py-12 text-center"
                                    >
                                        {search || statusFilter !== "all"
                                            ? "No activities match filters — try clearing search or status."
                                            : `No ${title.toLowerCase()} yet. Create one above to get started.`}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredActivities.map((a: Activity) => {
                                    const Icon = activityTypeIcon(a.type);
                                    const rel = relatedSummary(a);
                                    const t0 = startOfTodayMs();
                                    const overdue =
                                        a.status === "open" && a.dueAt !== undefined && a.dueAt < t0;
                                    return (
                                        <TableRow key={a._id} className="group">
                                            <TableCell>
                                                <div className="flex gap-3">
                                                    <div
                                                        className={cn(
                                                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
                                                            activityTypeBadgeClass(a.type),
                                                        )}
                                                    >
                                                        <Icon className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium leading-snug text-slate-900">
                                                            {a.subject}
                                                        </p>
                                                        {a.description ? (
                                                            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                                                                {a.description}
                                                            </p>
                                                        ) : null}
                                                        {a.assignee ? (
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                Assignee: {a.assignee}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {!type ? (
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("font-normal", activityTypeBadgeClass(a.type))}
                                                    >
                                                        {a.type}
                                                    </Badge>
                                                </TableCell>
                                            ) : null}
                                            <TableCell>
                                                {rel ? (
                                                    rel.linkable ? (
                                                        <Link
                                                            href={rel.href}
                                                            className="text-indigo-700 hover:text-indigo-900 hover:underline"
                                                        >
                                                            {rel.label}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-slate-800 text-sm">{rel.label}</span>
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={cn(
                                                        "text-sm tabular-nums",
                                                        overdue && "font-medium text-red-700",
                                                    )}
                                                >
                                                    {formatDueAt(a.dueAt)}
                                                </span>
                                                {overdue ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="mt-1 border-red-200 bg-red-50 text-red-800"
                                                    >
                                                        Overdue
                                                    </Badge>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={a.status}
                                                    onValueChange={(v) =>
                                                        handleStatusChange(a._id, v as Activity["status"])
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={cn(
                                                            "h-9 w-[140px] capitalize",
                                                            statusBadgeClass(a.status),
                                                        )}
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {activityStatuses.map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                {formatStatusLabel(s)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="opacity-70 hover:opacity-100"
                                                        onClick={() => setEditingActivity(a)}
                                                        aria-label={`Edit ${a.subject}`}
                                                    >
                                                        <PencilIcon className="size-4 text-slate-700" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="opacity-70 hover:opacity-100"
                                                        onClick={() => handleDelete(a._id)}
                                                        aria-label={`Delete ${a.subject}`}
                                                    >
                                                        <Trash2Icon className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>

                <Dialog
                    open={editingActivity !== null}
                    onOpenChange={(open) => {
                        if (!open) setEditingActivity(null);
                    }}
                >
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit {title.replace(/s$/, "").toLowerCase()}</DialogTitle>
                            <DialogDescription>
                                Update subject, notes, due date, status, and linked records. Lead or deal links on
                                this activity are unchanged when you save.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input
                                    value={editSubject}
                                    onChange={(e) => setEditSubject(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="min-h-[88px] resize-y"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Due date</Label>
                                    <Input
                                        type="date"
                                        value={editDueAt}
                                        onChange={(e) => setEditDueAt(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={editStatus}
                                        onValueChange={(v) => setEditStatus(v as (typeof activityStatuses)[number])}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activityStatuses.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {formatStatusLabel(s)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Building2Icon className="size-3.5 opacity-70" />
                                        Link account
                                    </Label>
                                    <Select value={editLinkAccountId} onValueChange={setEditLinkAccountId}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Optional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {(accounts ?? []).map((acc) => (
                                                <SelectItem key={acc._id} value={acc._id}>
                                                    {acc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <UserIcon className="size-3.5 opacity-70" />
                                        Link contact
                                    </Label>
                                    <Select value={editLinkContactId} onValueChange={setEditLinkContactId}>
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Optional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {(contacts ?? []).map((c) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {contactLabel(c)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setEditingActivity(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit}
                                className={CRM_PRIMARY_BTN}
                            >
                                {isSavingEdit ? "Saving…" : "Save changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};
