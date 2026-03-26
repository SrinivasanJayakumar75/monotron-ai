"use client";

import Link from "next/link";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Trash2Icon } from "lucide-react";

export const CustomModulesView = () => {
    const modules = useQuery(api.private.customCrmModules.list, {});
    const removeModule = useMutation(api.private.customCrmModules.remove);

    const onDelete = async (moduleId: Id<"customCrmModules">) => {
        try {
            await removeModule({ moduleId });
            toast.success("Custom module removed");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to remove module";
            toast.error(message);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-purple-50 to-violet-100 p-6 md:p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl">Custom CRM Modules</h1>
                    <p className="text-muted-foreground">
                        Open records for existing custom modules.{" "}
                        <Link href="/crm" className="text-indigo-600 hover:underline">
                            Back to CRM
                        </Link>
                    </p>
                </div>

                <div className="mt-6 rounded-lg border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Open</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modules === undefined ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        Loading…
                                    </TableCell>
                                </TableRow>
                            ) : modules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No custom modules yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                modules.map((m) => (
                                    <TableRow key={m._id}>
                                        <TableCell className="font-medium">{m.name}</TableCell>
                                        <TableCell>{m.description ?? "—"}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-2">
                                                <span
                                                    className="inline-block h-3 w-3 rounded-full"
                                                    style={{ backgroundColor: m.color ?? "#8b5cf6" }}
                                                />
                                                {m.color ?? "default"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/crm/custom/${m.slug}`}
                                                className="text-indigo-600 hover:underline"
                                            >
                                                Open
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete(m._id)}
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

