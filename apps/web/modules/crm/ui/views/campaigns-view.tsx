"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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

type Campaign = Doc<"campaigns">;

const campaignStatuses = ["planned", "active", "completed", "paused"] as const;

function toTimestamp(dateStr: string): number | undefined {
    const trimmed = dateStr.trim();
    if (!trimmed) return undefined;
    const ms = new Date(trimmed).getTime();
    if (Number.isNaN(ms)) return undefined;
    return ms;
}

function formatDate(ms?: number) {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString();
}

export const CampaignsView = () => {
    const campaigns = useQuery(api.private.campaigns.list);
    const createCampaign = useMutation(api.private.campaigns.create);
    const removeCampaign = useMutation(api.private.campaigns.remove);

    const [name, setName] = useState("");
    const [status, setStatus] = useState<(typeof campaignStatuses)[number]>("planned");
    const [startAt, setStartAt] = useState("");
    const [endAt, setEndAt] = useState("");
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Campaign name is required");
            return;
        }
        setIsCreating(true);
        try {
            await createCampaign({
                name: trimmedName,
                status,
                startAt: toTimestamp(startAt),
                endAt: toTimestamp(endAt),
                description: description.trim() || undefined,
            });
            setName("");
            setStatus("planned");
            setStartAt("");
            setEndAt("");
            setDescription("");
            toast.success("Campaign created");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create campaign";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (campaignId: Id<"campaigns">) => {
        try {
            await removeCampaign({ campaignId });
            toast.success("Campaign deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete campaign";
            toast.error(message);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">Campaigns</h1>
                    <p className="text-muted-foreground">Marketing campaign tracking.</p>
                </div>

                <div className="mt-8 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-6">
                        <div className="md:col-span-2 space-y-1">
                            <Label>Campaign name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring outbound" />
                        </div>
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as (typeof campaignStatuses)[number])}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {campaignStatuses.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Start</Label>
                            <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>End</Label>
                            <Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Description</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" />
                        </div>
                        <div className="md:col-span-6 flex items-end">
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleCreate} disabled={isCreating}>
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
                                <TableHead>Start</TableHead>
                                <TableHead>End</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : campaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No campaigns yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map((c: Campaign) => (
                                    <TableRow key={c._id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell>{c.status}</TableCell>
                                        <TableCell>{formatDate(c.startAt)}</TableCell>
                                        <TableCell>{formatDate(c.endAt)}</TableCell>
                                        <TableCell className="max-w-[300px] truncate">{c.description ?? "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(c._id)}
                                                aria-label={`Delete campaign ${c.name}`}
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

