"use client";

import Link from "next/link";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { formatShortDate } from "../leads-ui-constants";
import { CRM_ACTIVITY_TYPE_OPTIONS, type CrmActivityTypeValue } from "../crm-activity-constants";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

export type CrmActivityCreateContext =
    | { relatedLeadId: Id<"leads"> }
    | { relatedContactId: Id<"contacts"> }
    | { relatedAccountId: Id<"accounts"> };

function activityTypeLabel(type: Doc<"activities">["type"]) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

export function CrmProfileActivitiesSection({
    activities,
    subtitle,
    emptyState,
    createContext,
}: {
    activities: Doc<"activities">[] | undefined;
    subtitle: string;
    emptyState: ReactNode;
    createContext?: CrmActivityCreateContext;
}) {
    const createActivity = useMutation(api.private.activities.create);
    const updateActivityStatus = useMutation(api.private.activities.updateStatus);
    const removeActivity = useMutation(api.private.activities.remove);

    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activityType, setActivityType] = useState<CrmActivityTypeValue>("task");
    const [activitySubject, setActivitySubject] = useState("");
    const [activityDescription, setActivityDescription] = useState("");
    const [activityDueDate, setActivityDueDate] = useState("");
    const [activityAssignee, setActivityAssignee] = useState("");

    const resetForm = () => {
        setActivityType("task");
        setActivitySubject("");
        setActivityDescription("");
        setActivityDueDate("");
        setActivityAssignee("");
    };

    const onCreateActivity = async () => {
        if (!createContext) return;
        const subject = activitySubject.trim();
        if (!subject) {
            toast.error("Subject is required");
            return;
        }
        setSaving(true);
        try {
            await createActivity({
                type: activityType,
                subject,
                description: activityDescription.trim() || undefined,
                dueAt: activityDueDate
                    ? new Date(`${activityDueDate}T12:00:00`).getTime()
                    : undefined,
                assignee: activityAssignee.trim() || undefined,
                ...createContext,
            });
            toast.success("Activity added");
            resetForm();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not add activity");
        } finally {
            setSaving(false);
        }
    };

    const onActivityStatusChange = async (
        activityId: Doc<"activities">["_id"],
        status: Doc<"activities">["status"],
    ) => {
        try {
            await updateActivityStatus({ activityId, status });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update activity");
        }
    };

    const onRemoveActivity = async (activityId: Doc<"activities">["_id"]) => {
        if (!confirm("Remove this activity? This cannot be undone.")) return;
        try {
            await removeActivity({ activityId });
            toast.success("Activity removed");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not remove activity");
        }
    };

    return (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold">Activities</h2>
                    <p className="text-muted-foreground text-xs">{subtitle}</p>
                </div>
                {createContext ? (
                    <Button
                        type="button"
                        variant={formOpen ? "secondary" : "outline"}
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => setFormOpen((v) => !v)}
                    >
                        <PlusIcon className="size-4" />
                        {formOpen ? "Hide form" : "Add activity"}
                    </Button>
                ) : null}
            </div>
            <Separator className="my-4" />

            {createContext && formOpen ? (
                <div className="mb-6 space-y-4 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
                    <p className="text-muted-foreground text-xs">
                        New activity will be linked to this record and appear in CRM Activities / Tasks.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select
                                value={activityType}
                                onValueChange={(v) => setActivityType(v as CrmActivityTypeValue)}
                            >
                                <SelectTrigger className="h-9 bg-white">
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
                                className="h-9 bg-white"
                                value={activityDueDate}
                                onChange={(e) => setActivityDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label>Subject</Label>
                        <Input
                            className="bg-white"
                            value={activitySubject}
                            onChange={(e) => setActivitySubject(e.target.value)}
                            placeholder="e.g. Follow up on proposal"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Description</Label>
                        <Textarea
                            className="bg-white"
                            value={activityDescription}
                            onChange={(e) => setActivityDescription(e.target.value)}
                            placeholder="Notes or details…"
                            rows={3}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Assignee (optional)</Label>
                        <Input
                            className="bg-white"
                            value={activityAssignee}
                            onChange={(e) => setActivityAssignee(e.target.value)}
                            placeholder="Name or email"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            className={CRM_PRIMARY_BTN}
                            disabled={saving}
                            onClick={() => void onCreateActivity()}
                        >
                            {saving ? "Saving…" : "Save activity"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                            Clear fields
                        </Button>
                    </div>
                </div>
            ) : null}

            {activities === undefined ? (
                <p className="text-muted-foreground text-sm">Loading activities…</p>
            ) : activities.length === 0 ? (
                <div className="text-muted-foreground space-y-2 text-sm">
                    <p>{emptyState}</p>
                    {createContext ? (
                        <p className="text-xs">
                            Click <span className="font-medium text-foreground">Add activity</span> to create one
                            linked to this record.
                        </p>
                    ) : null}
                </div>
            ) : (
                <ul className="space-y-3">
                    {activities.map((a) => (
                        <li
                            key={a._id}
                            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                        {activityTypeLabel(a.type)}
                                    </span>
                                    <span className="font-medium">{a.subject}</span>
                                </div>
                                {a.description ? (
                                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{a.description}</p>
                                ) : null}
                                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <span>Due: {formatShortDate(a.dueAt)}</span>
                                    {a.assignee ? <span>Assignee: {a.assignee}</span> : null}
                                    <span>Created: {formatShortDate(a._creationTime)}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end md:flex-row md:items-center">
                                <Select
                                    value={a.status}
                                    onValueChange={(v) =>
                                        void onActivityStatusChange(a._id, v as Doc<"activities">["status"])
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[130px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label="Delete activity"
                                    onClick={() => void onRemoveActivity(a._id)}
                                >
                                    <Trash2Icon className="size-4" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Shared empty-state helper with links to create flows */
export function CrmActivitiesEmptyStateLinks() {
    return (
        <>
            You can also add an activity when{" "}
            <Link href="/crm/leads/new" className="text-indigo-600 hover:underline">
                creating a lead
            </Link>
            , from the{" "}
            <Link href="/crm/contacts" className="text-indigo-600 hover:underline">
                contacts
            </Link>
            /{" "}
            <Link href="/crm/accounts" className="text-indigo-600 hover:underline">
                accounts
            </Link>{" "}
            lists, or under{" "}
            <Link href="/crm/activities" className="text-indigo-600 hover:underline">
                Activities
            </Link>
            .
        </>
    );
}
