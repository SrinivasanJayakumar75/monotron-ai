"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
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
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

function toTimestamp(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    const ms = new Date(dateStr).getTime();
    return Number.isNaN(ms) ? undefined : ms;
}

function formatDate(ms?: number) {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString();
}

const statuses = ["new", "active", "in-progress", "completed", "closed"];

export const CustomModuleRecordsView = ({ slug }: { slug: string }) => {
    const module = useQuery(api.private.customCrmModules.getBySlug, { slug });
    const records = useQuery(
        api.private.customCrmRecords.listByModule,
        module?._id ? { moduleId: module._id } : "skip"
    );
    const createRecord = useMutation(api.private.customCrmRecords.create);
    const updateStatus = useMutation(api.private.customCrmRecords.updateStatus);
    const removeRecord = useMutation(api.private.customCrmRecords.remove);

    const [title, setTitle] = useState("");
    const [status, setStatus] = useState(statuses[0]);
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [details, setDetails] = useState("");
    const [saving, setSaving] = useState(false);

    const displayTitle = useMemo(() => module?.name ?? "Custom Module", [module?.name]);

    const onCreate = async () => {
        if (!module?._id) return;
        const trimmed = title.trim();
        if (!trimmed) {
            toast.error("Title is required");
            return;
        }
        setSaving(true);
        try {
            await createRecord({
                moduleId: module._id,
                title: trimmed,
                status,
                amount: amount.trim() ? Number(amount) : undefined,
                dueAt: toTimestamp(dueDate),
                details: details.trim() || undefined,
            });
            setTitle("");
            setStatus(statuses[0]);
            setAmount("");
            setDueDate("");
            setDetails("");
            toast.success("Record created");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create record";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const onStatusChange = async (recordId: Id<"customCrmRecords">, nextStatus: string) => {
        try {
            await updateStatus({ recordId, status: nextStatus });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to update status";
            toast.error(message);
        }
    };

    const onDelete = async (recordId: Id<"customCrmRecords">) => {
        try {
            await removeRecord({ recordId });
            toast.success("Record removed");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to remove record";
            toast.error(message);
        }
    };

    if (module === undefined) {
        return <div className="p-8 text-muted-foreground">Loading module…</div>;
    }
    if (module === null) {
        return <div className="p-8 text-muted-foreground">Module not found.</div>;
    }

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-purple-50 to-violet-100 p-6 md:p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl">{displayTitle}</h1>
                    <p className="text-muted-foreground">{module.description ?? "Custom CRM records"}</p>
                </div>

                <div className="mt-6 rounded-lg border bg-white p-6">
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="space-y-1">
                            <Label>Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Amount</Label>
                            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Due date</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Details</Label>
                            <Input value={details} onChange={(e) => setDetails(e.target.value)} />
                        </div>
                        <div className="md:col-span-5">
                            <Button className={CRM_PRIMARY_BTN} onClick={onCreate} disabled={saving}>
                                Add record
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 rounded-lg border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No records yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((r) => (
                                    <TableRow key={r._id}>
                                        <TableCell className="font-medium">{r.title}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <Select
                                                value={r.status ?? statuses[0]}
                                                onValueChange={(v) => onStatusChange(r._id, v)}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{r.amount ?? "—"}</TableCell>
                                        <TableCell>{formatDate(r.dueAt)}</TableCell>
                                        <TableCell>{r.details ?? "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => onDelete(r._id)}>
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

