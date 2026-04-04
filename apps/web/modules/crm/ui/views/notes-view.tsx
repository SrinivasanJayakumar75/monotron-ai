"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Trash2Icon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { CRM_PRIMARY_BTN } from "../crm-ui-styles";

type Note = Doc<"notes">;

export const NotesView = () => {
    const notes = useQuery(api.private.notes.list, {});
    const createNote = useMutation(api.private.notes.create);
    const removeNote = useMutation(api.private.notes.remove);

    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        const trimmedBody = body.trim();
        if (!trimmedBody) {
            toast.error("Note body is required");
            return;
        }

        setIsCreating(true);
        try {
            await createNote({
                subject: subject.trim() || undefined,
                body: trimmedBody,
            });
            setSubject("");
            setBody("");
            toast.success("Note added");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to create note";
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (noteId: Id<"notes">) => {
        try {
            await removeNote({ noteId });
            toast.success("Note deleted");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to delete note";
            toast.error(message);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">Notes</h1>
                    <p className="text-muted-foreground">Add context to leads, deals, and customers.</p>
                </div>

                <div className="mt-8 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Subject</Label>
                            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Meeting notes" />
                        </div>
                        <div className="space-y-1 flex items-end">
                            <Button onClick={handleCreate} disabled={isCreating} className={cn("w-full", CRM_PRIMARY_BTN)}>
                                Add note
                            </Button>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label>Body</Label>
                            <Textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Write your note here…"
                                rows={6}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Body</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notes === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : notes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                        No notes yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                notes.map((n: Note) => (
                                    <TableRow key={n._id}>
                                        <TableCell className="max-w-[200px] truncate">
                                            {n.subject ?? "—"}
                                        </TableCell>
                                        <TableCell className="max-w-[520px]">
                                            <div className="line-clamp-3 whitespace-pre-wrap break-words">
                                                {n.body}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(n._id)}
                                                aria-label={`Delete note ${n.subject ?? ""}`}
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

