"use client";

import Link from "next/link";
import { api } from "@workspace/backend/_generated/api";
import type { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Trash2Icon, PencilIcon } from "lucide-react";
import { Card } from "@workspace/ui/components/card";

type FieldType = Doc<"crmLeadCustomFields">["fieldType"];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: "text", label: "Single line text" },
    { value: "textarea", label: "Multi-line text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
];

const emptyAddForm = () => ({
    label: "",
    fieldType: "text" as FieldType,
    selectOptionsRaw: "",
    required: false,
});

export const ManageLeadFieldsView = () => {
    const fields = useQuery(api.private.crmLeadCustomFields.list, {});
    const createField = useMutation(api.private.crmLeadCustomFields.create);
    const updateField = useMutation(api.private.crmLeadCustomFields.update);
    const removeField = useMutation(api.private.crmLeadCustomFields.remove);

    const [addForm, setAddForm] = useState(emptyAddForm);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<Id<"crmLeadCustomFields"> | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editType, setEditType] = useState<FieldType>("text");
    const [editOptionsRaw, setEditOptionsRaw] = useState("");
    const [editRequired, setEditRequired] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    const parseOptions = (raw: string) =>
        raw
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean);

    const startEdit = (f: Doc<"crmLeadCustomFields">) => {
        setEditingId(f._id);
        setEditLabel(f.label);
        setEditType(f.fieldType);
        setEditOptionsRaw((f.selectOptions ?? []).join("\n"));
        setEditRequired(f.required);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async () => {
        if (!editingId || !editLabel.trim()) {
            toast.error("Label is required");
            return;
        }
        const opts = parseOptions(editOptionsRaw);
        if (editType === "select" && opts.length === 0) {
            toast.error("Add at least one dropdown option (one per line)");
            return;
        }
        setEditSaving(true);
        try {
            await updateField({
                fieldId: editingId,
                label: editLabel.trim(),
                fieldType: editType,
                selectOptions: editType === "select" ? opts : undefined,
                required: editRequired,
            });
            toast.success("Field updated");
            cancelEdit();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update field");
        } finally {
            setEditSaving(false);
        }
    };

    const addField = async () => {
        if (!addForm.label.trim()) {
            toast.error("Label is required");
            return;
        }
        const opts = parseOptions(addForm.selectOptionsRaw);
        if (addForm.fieldType === "select" && opts.length === 0) {
            toast.error("Add at least one dropdown option (one per line)");
            return;
        }
        setAdding(true);
        try {
            await createField({
                label: addForm.label.trim(),
                fieldType: addForm.fieldType,
                selectOptions: addForm.fieldType === "select" ? opts : undefined,
                required: addForm.required,
            });
            toast.success("Field added");
            setAddForm(emptyAddForm());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not add field");
        } finally {
            setAdding(false);
        }
    };

    const onRemove = async (id: Id<"crmLeadCustomFields">) => {
        if (!confirm("Remove this field? Values will be removed from all leads in your org.")) return;
        try {
            await removeField({ fieldId: id });
            toast.success("Field removed");
            if (editingId === id) cancelEdit();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not remove field");
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            <div className="border-b bg-white/90 px-6 py-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl">Lead custom fields</h1>
                        <p className="text-muted-foreground text-sm">
                            <Link href="/crm/leads" className="text-indigo-600 hover:underline">
                                Leads
                            </Link>
                            <span className="mx-1">›</span>
                            <span>Customize fields</span>
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/crm/leads">Back to Leads</Link>
                    </Button>
                </div>
            </div>

            <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-6">
                <Card className="border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Add field</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        New fields appear on create/edit lead forms. Storage key is generated from the label.
                    </p>
                    <Separator className="my-4" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1 md:col-span-2">
                            <Label>Label</Label>
                            <Input
                                value={addForm.label}
                                onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
                                placeholder="e.g. Budget range"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select
                                value={addForm.fieldType}
                                onValueChange={(v) =>
                                    setAddForm((f) => ({ ...f, fieldType: v as FieldType }))
                                }
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                id="addReq"
                                checked={addForm.required}
                                onChange={(e) =>
                                    setAddForm((f) => ({ ...f, required: e.target.checked }))
                                }
                                className="h-4 w-4"
                            />
                            <Label htmlFor="addReq" className="font-normal">
                                Required
                            </Label>
                        </div>
                        {addForm.fieldType === "select" ? (
                            <div className="space-y-1 md:col-span-2">
                                <Label>Dropdown options (one per line or comma-separated)</Label>
                                <textarea
                                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                    value={addForm.selectOptionsRaw}
                                    onChange={(e) =>
                                        setAddForm((f) => ({ ...f, selectOptionsRaw: e.target.value }))
                                    }
                                />
                            </div>
                        ) : null}
                    </div>
                    <Button className="mt-4" onClick={addField} disabled={adding}>
                        Add field
                    </Button>
                </Card>

                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Your fields</h2>
                    {fields === undefined ? (
                        <p className="text-muted-foreground text-sm">Loading…</p>
                    ) : fields.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No custom fields yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {fields.map((f) => (
                                <li key={f._id}>
                                    <Card className="border bg-white p-4 shadow-sm">
                                        {editingId === f._id ? (
                                            <div className="space-y-4">
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <div className="space-y-1 md:col-span-2">
                                                        <Label>Label</Label>
                                                        <Input
                                                            value={editLabel}
                                                            onChange={(e) => setEditLabel(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label>Type</Label>
                                                        <Select
                                                            value={editType}
                                                            onValueChange={(v) =>
                                                                setEditType(v as FieldType)
                                                            }
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {FIELD_TYPES.map((t) => (
                                                                    <SelectItem
                                                                        key={t.value}
                                                                        value={t.value}
                                                                    >
                                                                        {t.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-6">
                                                        <input
                                                            type="checkbox"
                                                            id={`editReq_${f._id}`}
                                                            checked={editRequired}
                                                            onChange={(e) =>
                                                                setEditRequired(e.target.checked)
                                                            }
                                                            className="h-4 w-4"
                                                        />
                                                        <Label
                                                            htmlFor={`editReq_${f._id}`}
                                                            className="font-normal"
                                                        >
                                                            Required
                                                        </Label>
                                                    </div>
                                                    {editType === "select" ? (
                                                        <div className="space-y-1 md:col-span-2">
                                                            <Label>Options</Label>
                                                            <textarea
                                                                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                                                value={editOptionsRaw}
                                                                onChange={(e) =>
                                                                    setEditOptionsRaw(e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" onClick={saveEdit} disabled={editSaving}>
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={cancelEdit}
                                                        disabled={editSaving}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="font-medium">{f.label}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Key: <code>{f.key}</code> · {f.fieldType}
                                                        {f.required ? " · required" : ""}
                                                    </p>
                                                    {f.fieldType === "select" && f.selectOptions?.length ? (
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            {f.selectOptions.join(", ")}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => startEdit(f)}
                                                        aria-label={`Edit ${f.label}`}
                                                    >
                                                        <PencilIcon className="size-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => onRemove(f._id)}
                                                        aria-label={`Remove ${f.label}`}
                                                    >
                                                        <Trash2Icon className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
