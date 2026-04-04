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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Trash2Icon } from "lucide-react";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

type ModuleKey =
    | "products"
    | "quotes"
    | "orders"
    | "invoices"
    | "payments"
    | "contracts"
    | "documents"
    | "approvals";

function toTimestamp(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    const ms = new Date(trimmed).getTime();
    return Number.isNaN(ms) ? undefined : ms;
}

function formatDate(ms?: number) {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString();
}

export const CrmModuleItemsView = ({
    module,
    title,
    description,
    statuses = ["draft", "active", "completed"],
}: {
    module: ModuleKey;
    title: string;
    description: string;
    statuses?: string[];
}) => {
    const items = useQuery(api.private.crmModules.list, { module });
    const createItem = useMutation(api.private.crmModules.create);
    const updateStatus = useMutation(api.private.crmModules.updateStatus);
    const removeItem = useMutation(api.private.crmModules.remove);

    const [name, setName] = useState("");
    const [status, setStatus] = useState(statuses[0] ?? "draft");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [details, setDetails] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const shouldShowAmount = useMemo(
        () => ["quotes", "orders", "invoices", "payments", "contracts"].includes(module),
        [module]
    );
    const shouldShowDate = useMemo(() => module !== "products", [module]);

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error(`${title} name is required`);
            return;
        }
        setIsCreating(true);
        try {
            await createItem({
                module,
                title: trimmed,
                status,
                amount: shouldShowAmount && amount.trim() ? Number(amount) : undefined,
                dueAt: shouldShowDate ? toTimestamp(dueDate) : undefined,
                details: details.trim() || undefined,
            });
            setName("");
            setStatus(statuses[0] ?? "draft");
            setAmount("");
            setDueDate("");
            setDetails("");
            toast.success(`${title} item created`);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create item";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (itemId: Id<"crmModuleItems">) => {
        try {
            await removeItem({ itemId });
            toast.success("Item deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete item";
            toast.error(message);
        }
    };

    const handleStatusChange = async (itemId: Id<"crmModuleItems">, nextStatus: string) => {
        try {
            await updateStatus({ itemId, status: nextStatus });
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
                    <p className="text-muted-foreground">{description}</p>
                </div>

                <div className="mt-8 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-6">
                        <div className="md:col-span-2 space-y-1">
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
                        {shouldShowAmount && (
                            <div className="space-y-1">
                                <Label>Amount</Label>
                                <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>
                        )}
                        {shouldShowDate && (
                            <div className="space-y-1">
                                <Label>Due date</Label>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        )}
                        <div className="space-y-1 md:col-span-2">
                            <Label>Details</Label>
                            <Input value={details} onChange={(e) => setDetails(e.target.value)} />
                        </div>
                        <div className="md:col-span-6">
                            <Button className={CRM_PRIMARY_BTN} onClick={handleCreate} disabled={isCreating}>
                                Create
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No items yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item._id}>
                                        <TableCell className="font-medium">{item.title}</TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <Select
                                                value={item.status ?? (statuses[0] ?? "draft")}
                                                onValueChange={(v) => handleStatusChange(item._id, v)}
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
                                        <TableCell>{item.amount ?? "—"}</TableCell>
                                        <TableCell>{formatDate(item.dueAt)}</TableCell>
                                        <TableCell className="max-w-[260px] truncate">{item.details ?? "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(item._id)}
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

