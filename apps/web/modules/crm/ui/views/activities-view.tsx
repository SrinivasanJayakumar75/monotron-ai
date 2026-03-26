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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Trash2Icon } from "lucide-react";

type Activity = Doc<"activities">;

const activityTypes = ["task", "call", "email", "meeting"] as const;
const activityStatuses = ["open", "completed", "cancelled"] as const;

function toTimestamp(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    const ms = new Date(trimmed).getTime();
    if (Number.isNaN(ms)) return undefined;
    return ms;
}

function formatDueAt(dueAt?: number) {
    if (!dueAt) return "—";
    return new Date(dueAt).toLocaleDateString();
}

export const ActivitiesView = ({ type }: { type?: (typeof activityTypes)[number] }) => {
    const activities = useQuery(api.private.activities.list, type ? { type } : {});
    const createActivity = useMutation(api.private.activities.create);
    const updateStatus = useMutation(api.private.activities.updateStatus);
    const removeActivity = useMutation(api.private.activities.remove);

    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [status, setStatus] = useState<(typeof activityStatuses)[number]>("open");
    const [isCreating, setIsCreating] = useState(false);

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
                dueAt: toTimestamp(dueAt),
                status,
            });
            setSubject("");
            setDescription("");
            setDueAt("");
            setStatus("open");
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

    const handleStatusChange = async (
        activityId: Id<"activities">,
        nextStatus: Activity["status"]
    ) => {
        try {
            await updateStatus({ activityId, status: nextStatus });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to update status";
            toast.error(message);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">{title}</h1>
                    <p className="text-muted-foreground">Track {title.toLowerCase()} in your CRM.</p>
                </div>

                <div className="mt-8 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-6">
                        <div className="md:col-span-2 space-y-1">
                            <Label>Subject</Label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Follow up with decision maker"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Description</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add short notes for this activity"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Due date</Label>
                            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as (typeof activityStatuses)[number])}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activityStatuses.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-1 flex items-end">
                            <Button onClick={handleCreate} disabled={isCreating} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">
                                Create
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : activities.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No {title.toLowerCase()} yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activities.map((a: Activity) => (
                                    <TableRow key={a._id}>
                                        <TableCell className="font-medium">{a.subject}</TableCell>
                                        <TableCell>{a.type}</TableCell>
                                        <TableCell>{formatDueAt(a.dueAt)}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <Select
                                                value={a.status}
                                                onValueChange={(v) =>
                                                    handleStatusChange(a._id, v as Activity["status"])
                                                }
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activityStatuses.map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(a._id)}
                                                aria-label={`Delete ${a.subject}`}
                                            >
                                                <Trash2Icon className="size-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

