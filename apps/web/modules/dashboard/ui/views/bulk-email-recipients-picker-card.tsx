"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDownIcon, DownloadIcon, FileSpreadsheetIcon, UploadIcon, UsersIcon } from "lucide-react";
import type { ChangeEventHandler, Dispatch, MutableRefObject, SetStateAction } from "react";
import type { BulkRecipientInput } from "../lib/parse-bulk-email-csv";

export type BulkEmailCrmRecipientRow = {
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    company?: string;
    source: "lead" | "contact";
    recordId: string;
};

type CrmTab = "all" | "leads" | "contacts";

export function BulkEmailRecipientsPickerCard({
    sending,
    fileRef,
    fileLabel,
    dragActive,
    setDragActive,
    onFile,
    onDrop,
    downloadSample,
    crmRecipientsRaw,
    crmTab,
    setCrmTab,
    crmPickerSearch,
    setCrmPickerSearch,
    crmPickerRows,
    crmPickerSelected,
    toggleCrmPick,
    selectAllCrmVisible,
    clearCrmPickSelection,
    addCrmPickedToRecipients,
    recipients,
    recipientsReady,
    recipientSearch,
    setRecipientSearch,
    chipRecipients,
    filteredRecipients,
    previewRecipients,
    removeRecipient,
    listOpen,
    setListOpen,
    setRecipients,
    setFileLabel,
    emptyTableHint = "Add people using CRM or CSV above.",
}: {
    sending: boolean;
    fileRef: MutableRefObject<HTMLInputElement | null>;
    fileLabel: string;
    dragActive: boolean;
    setDragActive: (v: boolean) => void;
    onFile: ChangeEventHandler<HTMLInputElement>;
    onDrop: (e: React.DragEvent) => void;
    downloadSample: () => void;
    crmRecipientsRaw: BulkEmailCrmRecipientRow[] | undefined;
    crmTab: CrmTab;
    setCrmTab: (t: CrmTab) => void;
    crmPickerSearch: string;
    setCrmPickerSearch: (s: string) => void;
    crmPickerRows: BulkEmailCrmRecipientRow[];
    crmPickerSelected: string[];
    toggleCrmPick: (email: string) => void;
    selectAllCrmVisible: () => void;
    clearCrmPickSelection: () => void;
    addCrmPickedToRecipients: () => void;
    recipients: BulkRecipientInput[];
    recipientsReady: boolean;
    recipientSearch: string;
    setRecipientSearch: (s: string) => void;
    chipRecipients: BulkRecipientInput[];
    filteredRecipients: BulkRecipientInput[];
    previewRecipients: BulkRecipientInput[];
    removeRecipient: (email: string) => void;
    listOpen: boolean;
    setListOpen: (o: boolean) => void;
    setRecipients: Dispatch<SetStateAction<BulkRecipientInput[]>>;
    setFileLabel: (s: string) => void;
    emptyTableHint?: string;
}) {
    return (
        <Card className="border-violet-200/50 shadow-md shadow-violet-500/5 ring-1 ring-slate-100">
            <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">Build your list</CardTitle>
                <CardDescription>
                    Add people from <strong className="font-medium text-slate-800">Leads</strong> or{" "}
                    <strong className="font-medium text-slate-800">Contacts</strong>, or drop in a CSV with an{" "}
                    <code className="rounded bg-violet-50 px-1 text-violet-900">email</code> column (plus{" "}
                    <code className="rounded bg-violet-50 px-1">first_name</code>,{" "}
                    <code className="rounded bg-violet-50 px-1">company</code>, etc.).
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => fileRef.current?.click()}
                        disabled={sending}
                    >
                        <UploadIcon className="size-4" />
                        Import CSV
                    </Button>
                    <Button type="button" variant="outline" className="gap-2" onClick={downloadSample} disabled={sending}>
                        <DownloadIcon className="size-4" />
                        Sample file
                    </Button>
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3 rounded-xl border border-violet-100/80 bg-gradient-to-br from-violet-50/40 to-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <UsersIcon className="size-5 shrink-0 text-violet-700/80" />
                        <h3 className="text-sm font-semibold text-slate-900">From CRM</h3>
                        <Badge variant="secondary" className="font-normal">
                            {crmRecipientsRaw === undefined ? "…" : `${crmRecipientsRaw.length.toLocaleString()} with email`}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Only records with a valid email appear. Same address is listed once (contact record wins over lead for
                        merge fields).
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                { id: "all" as const, label: "All" },
                                { id: "leads" as const, label: "Leads" },
                                { id: "contacts" as const, label: "Contacts" },
                            ] as const
                        ).map((t) => (
                            <Button
                                key={t.id}
                                type="button"
                                size="sm"
                                variant={crmTab === t.id ? "default" : "outline"}
                                className={cn("h-8", crmTab === t.id && "bg-indigo-600 hover:bg-indigo-700")}
                                onClick={() => setCrmTab(t.id)}
                                disabled={sending}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                    <Input
                        value={crmPickerSearch}
                        onChange={(e) => setCrmPickerSearch(e.target.value)}
                        placeholder="Search name, email, company…"
                        className="h-9"
                        disabled={sending || crmRecipientsRaw === undefined}
                    />
                    {crmRecipientsRaw === undefined ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">Loading leads and contacts…</p>
                    ) : crmRecipientsRaw.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                            No leads or contacts with an email yet. Add emails in CRM or use CSV import below.
                        </p>
                    ) : (
                        <>
                            <ScrollArea className="h-[min(280px,42vh)] rounded-md border border-slate-200 bg-white">
                                <ul className="divide-y divide-slate-100 p-0">
                                    {crmPickerRows.length === 0 ? (
                                        <li className="text-muted-foreground px-4 py-8 text-center text-sm">
                                            No matches. Try another filter or search.
                                        </li>
                                    ) : (
                                        crmPickerRows.map((r) => (
                                            <li key={`${r.source}:${r.recordId}`}>
                                                <label className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 px-3 py-2.5">
                                                    <Checkbox
                                                        checked={crmPickerSelected.includes(r.email)}
                                                        onCheckedChange={() => toggleCrmPick(r.email)}
                                                        disabled={sending}
                                                        className="mt-1"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex flex-wrap items-center gap-2">
                                                            <span className="font-medium text-slate-900">{r.name ?? r.email}</span>
                                                            <Badge variant="outline" className="h-5 text-[10px] font-normal capitalize">
                                                                {r.source}
                                                            </Badge>
                                                        </span>
                                                        <span className="text-muted-foreground block truncate text-xs">
                                                            {r.email}
                                                            {r.company ? ` · ${r.company}` : ""}
                                                        </span>
                                                    </span>
                                                </label>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </ScrollArea>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={sending || crmPickerRows.length === 0 || crmRecipientsRaw === undefined}
                                    onClick={selectAllCrmVisible}
                                >
                                    Select visible
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={sending || crmPickerSelected.length === 0}
                                    onClick={clearCrmPickSelection}
                                >
                                    Clear selection
                                </Button>
                                <span className="text-muted-foreground text-xs">{crmPickerSelected.length} selected</span>
                            </div>
                            <Button
                                type="button"
                                className="w-full gap-2 bg-teal-700 hover:bg-teal-800 sm:w-auto"
                                disabled={sending || crmPickerSelected.length === 0}
                                onClick={addCrmPickedToRecipients}
                            >
                                Add selected to recipients
                            </Button>
                        </>
                    )}
                </div>

                <Separator />

                <div>
                    <p className="mb-3 text-sm font-medium text-slate-800">Import from file</p>
                    <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileRef.current?.click();
                            }
                        }}
                        onClick={() => fileRef.current?.click()}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setDragActive(true);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false);
                        }}
                        onDrop={onDrop}
                        className={cn(
                            "cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                            dragActive
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-muted-foreground/30 bg-muted/15 hover:border-indigo-400/60",
                            sending && "pointer-events-none opacity-50",
                        )}
                    >
                        <FileSpreadsheetIcon
                            className={cn("mx-auto size-12", dragActive ? "text-indigo-600" : "text-muted-foreground")}
                            strokeWidth={1}
                        />
                        <p className="mt-3 font-medium">Drag &amp; drop a CSV here</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {fileLabel ? <>Using: {fileLabel}</> : "or click to browse"}
                        </p>
                    </div>
                </div>

                {recipientsReady ? (
                    <div className="space-y-3">
                        <Label className="text-xs text-slate-600">Recipient list</Label>
                        <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                            {chipRecipients.map((r) => (
                                <Badge key={r.email} variant="secondary" className="h-7 gap-1 pr-1 font-normal">
                                    <span className="max-w-[200px] truncate">
                                        {r.name || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email}
                                    </span>
                                    <button
                                        type="button"
                                        className="hover:bg-muted rounded-full p-0.5"
                                        onClick={() => removeRecipient(r.email)}
                                        disabled={sending}
                                        aria-label={`Remove ${r.email}`}
                                    >
                                        ×
                                    </button>
                                </Badge>
                            ))}
                            {filteredRecipients.length > chipRecipients.length ? (
                                <span className="text-muted-foreground self-center text-xs">
                                    +{filteredRecipients.length - chipRecipients.length} more
                                </span>
                            ) : null}
                        </div>
                        <Input
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            placeholder="Search this list…"
                            className="h-9"
                        />
                    </div>
                ) : null}

                <Collapsible open={listOpen} onOpenChange={setListOpen}>
                    <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left text-sm font-medium">
                        <span>
                            {recipients.length === 0 ? "Table preview" : `Rows (${filteredRecipients.length})`}
                        </span>
                        <ChevronDownIcon className={cn("size-4 transition-transform", listOpen && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRecipients([]);
                                    setFileLabel("");
                                    setRecipientSearch("");
                                }}
                                disabled={recipients.length === 0 || sending}
                            >
                                Clear list
                            </Button>
                        </div>
                        <div className="max-h-64 overflow-auto rounded-lg border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/80 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Email</th>
                                        <th className="px-3 py-2 font-medium">Name</th>
                                        <th className="px-3 py-2 font-medium">Company</th>
                                        <th className="px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewRecipients.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-muted-foreground px-3 py-8 text-center">
                                                {emptyTableHint}
                                            </td>
                                        </tr>
                                    ) : (
                                        previewRecipients.map((r) => (
                                            <tr key={r.email} className="border-t">
                                                <td className="px-3 py-2">{r.email}</td>
                                                <td className="px-3 py-2">
                                                    {r.name || [r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                                                </td>
                                                <td className="px-3 py-2">{r.company || "—"}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-destructive"
                                                        onClick={() => removeRecipient(r.email)}
                                                        disabled={sending}
                                                    >
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}
