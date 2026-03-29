"use client";

import { api } from "@workspace/backend/_generated/api";
import {
    BULK_EMAIL_TEMPLATES,
    mergeBulkEmailTemplate,
} from "@workspace/backend/lib/bulkEmailTemplates";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { type ChangeEventHandler, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
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
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    ChevronDownIcon,
    DownloadIcon,
    FileSpreadsheetIcon,
    MailIcon,
    MailsIcon,
    SendIcon,
    UploadIcon,
} from "lucide-react";
import {
    parseBulkEmailRecipientsFromCsv,
    SAMPLE_BULK_EMAIL_CSV,
    type BulkRecipientInput,
} from "../lib/parse-bulk-email-csv";

const MAX_RECIPIENTS = 1000;
const STEPS = [
    { id: 1 as const, title: "Who to email", short: "Recipients" },
    { id: 2 as const, title: "What to say", short: "Message" },
    { id: 3 as const, title: "Review & send", short: "Send" },
];

function StepDots({
    current,
    onPick,
    canGoTo,
}: {
    current: 1 | 2 | 3;
    onPick: (s: 1 | 2 | 3) => void;
    canGoTo: (s: 1 | 2 | 3) => boolean;
}) {
    return (
        <nav aria-label="Bulk email steps" className="w-full">
            <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                {STEPS.map((s) => {
                    const active = current === s.id;
                    const done = current > s.id;
                    const clickable = canGoTo(s.id);
                    return (
                        <li key={s.id} className="relative flex flex-1 items-center gap-3 sm:flex-col sm:gap-2">
                            <button
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && onPick(s.id)}
                                className={cn(
                                    "relative z-[1] flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-colors sm:flex-col sm:items-center sm:px-2 sm:py-4 sm:text-center",
                                    active && "border-indigo-600 bg-indigo-50/80 shadow-sm",
                                    !active && done && "border-emerald-200 bg-emerald-50/50",
                                    !active && !done && "border-muted bg-muted/30",
                                    clickable && "cursor-pointer hover:border-indigo-300",
                                    !clickable && "cursor-not-allowed opacity-60",
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                        active && "bg-indigo-600 text-white",
                                        !active && done && "bg-emerald-600 text-white",
                                        !active && !done && "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {done ? <CheckIcon className="size-5" /> : s.id}
                                </span>
                                <span className="min-w-0 flex-1 sm:w-full">
                                    <span className="block text-sm font-semibold leading-tight">{s.title}</span>
                                    <span className="text-muted-foreground mt-0.5 block text-xs">{s.short}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export function BulkEmailView() {
    const fileRef = useRef<HTMLInputElement>(null);
    const templates = useQuery(api.private.bulkEmail.listTemplates);
    const connection = useQuery(api.private.googleIntegration.getConnection);
    const sendBulk = useAction(api.private.googleEmail.sendBulkEmails);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [templateId, setTemplateId] = useState<string>("followup");
    const [campaignName, setCampaignName] = useState("");
    const [subject, setSubject] = useState<string>(BULK_EMAIL_TEMPLATES.followup.subject);
    const [body, setBody] = useState<string>(BULK_EMAIL_TEMPLATES.followup.body);
    const [imageUrl, setImageUrl] = useState("");
    const [recipients, setRecipients] = useState<BulkRecipientInput[]>([]);
    const [fileLabel, setFileLabel] = useState<string>("");
    const [sending, setSending] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [newTemplateName, setNewTemplateName] = useState("");
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const createTemplate = useMutation((api as any).private.bulkEmail.createTemplate);

    const applyTemplate = (id: string) => {
        if (id in BULK_EMAIL_TEMPLATES) {
            const t = BULK_EMAIL_TEMPLATES[id as keyof typeof BULK_EMAIL_TEMPLATES];
            setSubject(t.subject);
            setBody(t.body);
            return;
        }
        const custom = (templates ?? []).find((t) => t && t.id === id);
        if (custom && "subject" in custom && "body" in custom && custom.subject && custom.body) {
            setSubject(custom.subject);
            setBody(custom.body);
        }
    };

    const preview = useMemo(() => {
        const sample = recipients[0] ?? {
            email: "recipient@example.com",
            firstName: "Pat",
            lastName: "Jones",
            name: "Pat Jones",
            company: "Example Co",
        };
        return mergeBulkEmailTemplate({ subject, body }, {
            email: sample.email,
            firstName: sample.firstName,
            lastName: sample.lastName,
            name: sample.name,
            company: sample.company,
        });
    }, [subject, body, recipients]);

    const ingestCsvText = useCallback((text: string, sourceLabel: string) => {
        setFileLabel(sourceLabel);
        const { recipients: next, error } = parseBulkEmailRecipientsFromCsv(text);
        if (error) {
            toast.error(error);
            setRecipients([]);
            return;
        }
        if (next.length > MAX_RECIPIENTS) {
            toast.error(
                `This file has ${next.length} rows. Maximum is ${MAX_RECIPIENTS} per send. Split into smaller files.`,
            );
            setRecipients([]);
            return;
        }
        if (next.length === 0) {
            toast.error("No valid rows with email addresses found.");
            setRecipients([]);
            return;
        }
        setRecipients(next);
        setListOpen(true);
        toast.success(`Loaded ${next.length} recipient${next.length === 1 ? "" : "s"}`);
    }, []);

    const onFile: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const text = await file.text();
        ingestCsvText(text, file.name);
    };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
            toast.error("Please drop a .csv file.");
            return;
        }
        const text = await file.text();
        ingestCsvText(text, file.name);
    };

    const downloadSample = () => {
        const blob = new Blob([SAMPLE_BULK_EMAIL_CSV], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bulk-email-sample.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSend = async () => {
        if (!connection) {
            toast.error("Connect Google first.");
            return;
        }
        if (recipients.length === 0) {
            toast.error("Upload a CSV with at least one recipient.");
            return;
        }
        const sub = subject.trim();
        const msg = body.trim();
        if (!sub) {
            toast.error("Add a subject.");
            return;
        }
        if (!msg) {
            toast.error("Add a message body.");
            return;
        }
        setSending(true);
        try {
            const result = await sendBulk({
                subject: sub,
                body: msg,
                imageUrl: imageUrl.trim() || undefined,
                recipients: recipients.map((r) => ({
                    email: r.email,
                    firstName: r.firstName,
                    lastName: r.lastName,
                    name: r.name,
                    company: r.company,
                })),
            });
            const campaignLabel = campaignName.trim() || "Bulk email";
            if (result.failed.length === 0) {
                toast.success(
                    `“${campaignLabel}”: sent ${result.sent} email${result.sent === 1 ? "" : "s"}.`,
                );
            } else {
                toast.warning(
                    `“${campaignLabel}”: sent ${result.sent}. ${result.failed.length} failed. First error: ${result.failed[0]?.error ?? ""}`,
                );
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Bulk send failed");
        } finally {
            setSending(false);
        }
    };

    const connected = Boolean(connection?.email);
    const filteredRecipients = useMemo(() => {
        const q = recipientSearch.trim().toLowerCase();
        if (!q) return recipients;
        return recipients.filter((r) =>
            [r.email, r.firstName, r.lastName, r.name, r.company]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [recipients, recipientSearch]);
    const previewRecipients = filteredRecipients.slice(0, 25);
    const removeRecipient = (email: string) => {
        setRecipients((prev) => prev.filter((r) => r.email !== email));
    };

    const recipientsReady = recipients.length > 0;
    const messageReady = subject.trim().length > 0 && body.trim().length > 0;
    const canSend = connected && recipientsReady && messageReady && !sending;

    const previewSample = recipients[0] ?? {
        email: "recipient@example.com",
        firstName: "Pat",
        lastName: "Jones",
        name: "Pat Jones",
        company: "Example Co",
    };

    const canGoToStep = (s: 1 | 2 | 3) => {
        if (s === 1) return true;
        if (s === 2) return recipientsReady;
        return recipientsReady && messageReady;
    };

    const sendBlockers: string[] = [];
    if (!connected) sendBlockers.push("Connect Google in Integrations");
    if (!recipientsReady) sendBlockers.push("Add at least one recipient (step 1)");
    if (!messageReady) sendBlockers.push("Add subject and message (step 2)");

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-background to-indigo-50/30">
            <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 md:space-y-8 md:px-6 md:py-10">
                <header className="space-y-2 text-center md:text-left">
                    <div className="flex flex-col items-center gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                                <MailsIcon className="size-6" aria-hidden />
                            </span>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bulk email</h1>
                                <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm md:mx-0">
                                    Three quick steps: recipient list, your message, then send from Gmail (
                                    {MAX_RECIPIENTS.toLocaleString()} max per send).
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
                            <Link href="/integrations">
                                <MailIcon className="size-4" />
                                Google setup
                            </Link>
                        </Button>
                    </div>
                </header>

                {!connected ? (
                    <Alert variant="destructive">
                        <AlertCircleIcon className="size-4" />
                        <AlertTitle>Gmail not connected</AlertTitle>
                        <AlertDescription className="mt-2 flex flex-col gap-2 text-sm">
                            <span>You can build your list and message now. To actually send, connect Google first.</span>
                            <Button className="w-fit" variant="outline" size="sm" asChild>
                                <Link href="/integrations">Connect in Integrations</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                ) : (
                    <p className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-center text-sm text-emerald-950 md:justify-start">
                        <CheckIcon className="size-4 shrink-0 text-emerald-700" />
                        <span>
                            Ready to send as <strong className="font-medium">{connection?.email}</strong>
                        </span>
                    </p>
                )}

                <StepDots
                    current={step}
                    onPick={setStep}
                    canGoTo={(s) => canGoToStep(s) || s === step}
                />

                {step === 1 ? (
                    <Card className="border-slate-200/90 shadow-lg shadow-slate-200/40">
                        <CardHeader>
                            <CardTitle className="text-xl">Step 1 — Your recipient list</CardTitle>
                            <CardDescription>
                                Upload a spreadsheet with one column <code className="rounded bg-muted px-1">email</code>{" "}
                                (required). Optional columns personalize the message: <code className="rounded bg-muted px-1">first_name</code>,{" "}
                                <code className="rounded bg-muted px-1">last_name</code>,{" "}
                                <code className="rounded bg-muted px-1">company</code>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="gap-2"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={sending}
                                >
                                    <UploadIcon className="size-4" />
                                    Choose CSV file
                                </Button>
                                <Button type="button" variant="outline" className="gap-2" onClick={downloadSample} disabled={sending}>
                                    <DownloadIcon className="size-4" />
                                    Download example CSV
                                </Button>
                            </div>
                            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />

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
                                    "cursor-pointer rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                                    dragActive
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-muted-foreground/30 bg-muted/20 hover:border-indigo-400/60 hover:bg-indigo-50/40",
                                    sending && "pointer-events-none opacity-50",
                                )}
                            >
                                <FileSpreadsheetIcon
                                    className={cn(
                                        "mx-auto size-14",
                                        dragActive ? "text-indigo-600" : "text-muted-foreground",
                                    )}
                                    strokeWidth={1}
                                />
                                <p className="mt-4 font-medium">
                                    {dragActive ? "Drop the file here" : "Or drag a CSV file into this box"}
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {fileLabel ? <>Using: {fileLabel}</> : "Supported: .csv"}
                                </p>
                            </div>

                            {recipientsReady ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm">
                                    <strong>{recipients.length}</strong> recipient{recipients.length === 1 ? "" : "s"} loaded.
                                    You can review or remove rows below, then continue.
                                </div>
                            ) : null}

                            <Collapsible open={listOpen} onOpenChange={setListOpen}>
                                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left text-sm font-medium transition-colors">
                                    <span>
                                        {recipients.length === 0
                                            ? "Recipient preview (after upload)"
                                            : `View & edit ${recipients.length} rows`}
                                    </span>
                                    <ChevronDownIcon
                                        className={cn("size-4 transition-transform", listOpen && "rotate-180")}
                                    />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-3 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        <Input
                                            value={recipientSearch}
                                            onChange={(e) => setRecipientSearch(e.target.value)}
                                            placeholder="Search this list…"
                                            disabled={recipients.length === 0}
                                            className="min-w-[200px] flex-1"
                                        />
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
                                                            No rows yet. Upload a CSV above.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    previewRecipients.map((r) => (
                                                        <tr key={r.email} className="border-t">
                                                            <td className="px-3 py-2">{r.email}</td>
                                                            <td className="px-3 py-2">
                                                                {r.name ||
                                                                    [r.firstName, r.lastName].filter(Boolean).join(" ") ||
                                                                    "—"}
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
                                    {filteredRecipients.length > previewRecipients.length ? (
                                        <p className="text-muted-foreground text-xs">
                                            Showing {previewRecipients.length} of {filteredRecipients.length} matches.
                                        </p>
                                    ) : null}
                                </CollapsibleContent>
                            </Collapsible>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="button"
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-600/90"
                                    disabled={!recipientsReady}
                                    onClick={() => setStep(2)}
                                >
                                    Continue to message
                                    <ArrowRightIcon className="size-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {step === 2 ? (
                    <Card className="border-slate-200/90 shadow-lg shadow-slate-200/40">
                        <CardHeader>
                            <CardTitle className="text-xl">Step 2 — Your message</CardTitle>
                            <CardDescription>
                                Choose a template or write from scratch. Tags like{" "}
                                <code className="rounded bg-muted px-1">{"{{first_name}}"}</code> are filled from each CSV row.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label>Start from template</Label>
                                <Select
                                    value={templateId}
                                    onValueChange={(v) => {
                                        setTemplateId(v);
                                        applyTemplate(v);
                                    }}
                                >
                                    <SelectTrigger className="h-11 w-full">
                                        <SelectValue placeholder="Pick a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(templates ?? []).map((t) =>
                                            t ? (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.label}
                                                </SelectItem>
                                            ) : null,
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bulk-email-subject">Subject</Label>
                                <Input
                                    id="bulk-email-subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Hi {{first_name}} — quick follow-up"
                                    maxLength={500}
                                    disabled={sending}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bulk-email-body">Email body</Label>
                                <Textarea
                                    id="bulk-email-body"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Hi {{first_name}},&#10;&#10;Thanks for…"
                                    className="min-h-[200px] resize-y text-sm leading-relaxed"
                                    disabled={sending}
                                />
                            </div>

                            <Collapsible>
                                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-left text-sm font-medium">
                                    <span>More options (image, save template, campaign name)</span>
                                    <ChevronDownIcon className="size-4" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="campaign-name">Campaign name (optional)</Label>
                                        <Input
                                            id="campaign-name"
                                            value={campaignName}
                                            onChange={(e) => setCampaignName(e.target.value)}
                                            placeholder="Shows in success messages only"
                                            maxLength={120}
                                            disabled={sending}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bulk-email-image-url">Image URL (optional)</Label>
                                        <Input
                                            id="bulk-email-image-url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="https://…"
                                            disabled={sending}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-template-name">Save as reusable template</Label>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Input
                                                id="new-template-name"
                                                className="flex-1"
                                                value={newTemplateName}
                                                onChange={(e) => setNewTemplateName(e.target.value)}
                                                placeholder="Template name"
                                                disabled={savingTemplate || sending}
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                disabled={savingTemplate || sending}
                                                onClick={async () => {
                                                    const label = newTemplateName.trim();
                                                    if (!label) {
                                                        toast.error("Enter a template name");
                                                        return;
                                                    }
                                                    if (!subject.trim() || !body.trim()) {
                                                        toast.error("Need subject and body first");
                                                        return;
                                                    }
                                                    setSavingTemplate(true);
                                                    try {
                                                        await createTemplate({
                                                            label,
                                                            subject: subject.trim(),
                                                            body: body.trim(),
                                                        });
                                                        setNewTemplateName("");
                                                        toast.success("Template saved");
                                                    } catch (err) {
                                                        toast.error(
                                                            err instanceof Error ? err.message : "Save failed",
                                                        );
                                                    } finally {
                                                        setSavingTemplate(false);
                                                    }
                                                }}
                                            >
                                                {savingTemplate ? "Saving…" : "Save"}
                                            </Button>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                                <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(1)}>
                                    <ArrowLeftIcon className="size-4" />
                                    Back to recipients
                                </Button>
                                <Button
                                    type="button"
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-600/90"
                                    disabled={!messageReady}
                                    onClick={() => setStep(3)}
                                >
                                    Review & send
                                    <ArrowRightIcon className="size-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {step === 3 ? (
                    <Card className="border-slate-200/90 shadow-lg shadow-slate-200/40">
                        <CardHeader>
                            <CardTitle className="text-xl">Step 3 — Review & send</CardTitle>
                            <CardDescription>Check the preview, then send. Sending cannot be undone.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border bg-card p-4 text-center">
                                    <p className="text-muted-foreground text-xs font-medium uppercase">Recipients</p>
                                    <p className="mt-1 text-2xl font-bold tabular-nums">{recipients.length}</p>
                                </div>
                                <div className="rounded-xl border bg-card p-4 text-center">
                                    <p className="text-muted-foreground text-xs font-medium uppercase">From</p>
                                    <p className="mt-1 truncate text-sm font-medium">{connection?.email ?? "—"}</p>
                                </div>
                                <div className="rounded-xl border bg-card p-4 text-center">
                                    <p className="text-muted-foreground text-xs font-medium uppercase">Merged for</p>
                                    <p className="mt-1 truncate text-sm font-medium">{previewSample.email}</p>
                                </div>
                            </div>

                            {!canSend && sendBlockers.length > 0 ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                    <p className="font-medium">Complete these before sending:</p>
                                    <ul className="mt-2 list-inside list-disc space-y-0.5">
                                        {sendBlockers.map((b) => (
                                            <li key={b}>{b}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            <div>
                                <p className="mb-2 text-sm font-medium">Preview</p>
                                <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-inner">
                                    <p className="text-muted-foreground text-xs font-medium uppercase">Subject</p>
                                    <p className="mt-1 font-semibold">{preview.subject}</p>
                                    <Separator className="my-4" />
                                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                        {preview.body}
                                    </pre>
                                    {imageUrl.trim() ? (
                                        <>
                                            <Separator className="my-4" />
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={imageUrl}
                                                alt=""
                                                className="max-h-40 w-auto max-w-full rounded-lg border"
                                            />
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            <Button
                                type="button"
                                size="lg"
                                className="h-14 w-full gap-2 text-base font-semibold shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-600/90"
                                disabled={!canSend}
                                onClick={() => void handleSend()}
                            >
                                <SendIcon className="size-5" />
                                {sending
                                    ? "Sending…"
                                    : `Send ${recipients.length.toLocaleString()} email${recipients.length === 1 ? "" : "s"}`}
                            </Button>

                            <p className="text-muted-foreground text-center text-xs">
                                Emails go out one by one for Gmail limits. Large sends may take a few minutes.
                            </p>

                            <div className="flex justify-start pt-2">
                                <Button type="button" variant="ghost" className="gap-2" onClick={() => setStep(2)}>
                                    <ArrowLeftIcon className="size-4" />
                                    Edit message
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </div>
    );
}
