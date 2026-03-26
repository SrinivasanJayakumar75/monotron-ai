"use client";

import Link from "next/link";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";

export type LeadCustomFieldDef = Doc<"crmLeadCustomFields">;

type Props = {
    fields: LeadCustomFieldDef[] | undefined;
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
    disabled?: boolean;
};

export function LeadCustomFieldsForm({ fields, values, onChange, disabled }: Props) {
    if (!fields?.length) return null;

    return (
        <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold">Custom fields</h2>
            <p className="text-muted-foreground text-sm">
                Defined for your organization. Manage them from{" "}
                <Link href="/crm/leads/fields" className="text-indigo-600 hover:underline">
                    Leads → Customize fields
                </Link>
                .
            </p>
            <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => {
                    const req = field.required;
                    const v = values[field.key] ?? "";
                    const label = (
                        <span>
                            {field.label}
                            {req ? <span className="text-destructive"> *</span> : null}
                        </span>
                    );

                    if (field.fieldType === "textarea") {
                        return (
                            <div key={field._id} className="space-y-1 md:col-span-2">
                                <Label>{label}</Label>
                                <Textarea
                                    rows={3}
                                    value={v}
                                    disabled={disabled}
                                    onChange={(e) => onChange(field.key, e.target.value)}
                                />
                            </div>
                        );
                    }

                    if (field.fieldType === "number") {
                        return (
                            <div key={field._id} className="space-y-1">
                                <Label>{label}</Label>
                                <Input
                                    type="number"
                                    value={v}
                                    disabled={disabled}
                                    onChange={(e) => onChange(field.key, e.target.value)}
                                />
                            </div>
                        );
                    }

                    if (field.fieldType === "date") {
                        return (
                            <div key={field._id} className="space-y-1">
                                <Label>{label}</Label>
                                <Input
                                    type="date"
                                    value={v}
                                    disabled={disabled}
                                    onChange={(e) => onChange(field.key, e.target.value)}
                                />
                            </div>
                        );
                    }

                    if (field.fieldType === "select") {
                        const opts = field.selectOptions ?? [];
                        const selectValue = v || "__empty__";
                        return (
                            <div key={field._id} className="space-y-1">
                                <Label>{label}</Label>
                                <Select
                                    value={selectValue}
                                    disabled={disabled}
                                    onValueChange={(nv) =>
                                        onChange(field.key, nv === "__empty__" ? "" : nv)
                                    }
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Choose…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__empty__">—</SelectItem>
                                        {opts.map((o) => (
                                            <SelectItem key={o} value={o}>
                                                {o}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        );
                    }

                    if (field.fieldType === "checkbox") {
                        const checked = v === "true";
                        return (
                            <div key={field._id} className="flex items-center gap-2 md:col-span-2">
                                <input
                                    type="checkbox"
                                    id={`cf_${field.key}`}
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={(e) =>
                                        onChange(field.key, e.target.checked ? "true" : "false")
                                    }
                                    className="h-4 w-4"
                                />
                                <Label htmlFor={`cf_${field.key}`} className="font-normal">
                                    {label}
                                </Label>
                            </div>
                        );
                    }

                    return (
                        <div key={field._id} className="space-y-1">
                            <Label>{label}</Label>
                            <Input
                                value={v}
                                disabled={disabled}
                                onChange={(e) => onChange(field.key, e.target.value)}
                            />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export function validateLeadCustomFieldsClient(
    fields: LeadCustomFieldDef[],
    values: Record<string, string>,
): string | null {
    for (const f of fields) {
        if (!f.required) continue;
        if (f.fieldType === "checkbox") {
            if (values[f.key] !== "true" && values[f.key] !== "false") {
                return `Please set "${f.label}"`;
            }
            continue;
        }
        const raw = values[f.key]?.trim() ?? "";
        if (!raw) return `"${f.label}" is required`;
    }
    return null;
}

export function buildCustomValuesPayload(
    fields: LeadCustomFieldDef[],
    values: Record<string, string>,
): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of fields) {
        const raw = values[f.key];
        if (f.fieldType === "checkbox") {
            out[f.key] = raw === "true" ? "true" : "false";
            continue;
        }
        out[f.key] = raw === undefined ? "" : raw.trim();
    }
    return out;
}
