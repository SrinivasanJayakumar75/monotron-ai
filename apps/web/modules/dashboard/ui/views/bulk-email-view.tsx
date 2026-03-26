"use client";

import { api } from "@workspace/backend/_generated/api";
import {
    BULK_EMAIL_TEMPLATES,
    mergeBulkEmailTemplate,
} from "@workspace/backend/lib/bulkEmailTemplates";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { type ChangeEventHandler, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
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
import { MailsIcon, UploadIcon, DownloadIcon, AlertCircleIcon } from "lucide-react";
import {
    parseBulkEmailRecipientsFromCsv,
    SAMPLE_BULK_EMAIL_CSV,
    type BulkRecipientInput,
} from "../lib/parse-bulk-email-csv";

const MAX_RECIPIENTS = 1000;

export function BulkEmailView() {
    const fileRef = useRef<HTMLInputElement>(null);
    const templates = useQuery(api.private.bulkEmail.listTemplates);
    const connection = useQuery(api.private.googleIntegration.getConnection);
    const sendBulk = useAction(api.private.googleEmail.sendBulkEmails);

    const [templateId, setTemplateId] = useState<string>("followup");
    const [campaignName, setCampaignName] = useState("Q2 Outreach Campaign");
    const [subject, setSubject] = useState<string>(BULK_EMAIL_TEMPLATES.followup.subject);
    const [body, setBody] = useState<string>(BULK_EMAIL_TEMPLATES.followup.body);
    const [imageUrl, setImageUrl] = useState("");
    const [recipients, setRecipients] = useState<BulkRecipientInput[]>([]);
    const [fileLabel, setFileLabel] = useState<string>("");
    const [sending, setSending] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [newTemplateName, setNewTemplateName] = useState("");
    const [savingTemplate, setSavingTemplate] = useState(false);
    const createTemplate = useMutation((api as any).private.bulkEmail.createTemplate);

    const applyTemplate = (id: string) => {
        if (id in BULK_EMAIL_TEMPLATES) {
            const t = BULK_EMAIL_TEMPLATES[id as keyof typeof BULK_EMAIL_TEMPLATES];
            setSubject(t.subject);
            setBody(t.body);
            return;
        }
        const custom = (templates ?? []).find((t: any) => t.id === id);
        if (custom?.subject && custom?.body) {
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

    const onFile: ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setFileLabel(file.name);
        const text = await file.text();
        const { recipients: next, error } = parseBulkEmailRecipientsFromCsv(text);
        if (error) {
            toast.error(error);
            setRecipients([]);
            return;
        }
        if (next.length > MAX_RECIPIENTS) {
            toast.error(`This file has ${next.length} rows. Maximum is ${MAX_RECIPIENTS} per send. Split into smaller files.`);
            setRecipients([]);
            return;
        }
        if (next.length === 0) {
            toast.error("No valid rows with email addresses found.");
            setRecipients([]);
            return;
        }
        setRecipients(next);
        toast.success(`Loaded ${next.length} recipient${next.length === 1 ? "" : "s"}`);
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
            if (result.failed.length === 0) {
                toast.success(
                    `Campaign "${campaignName.trim() || "Bulk email"}": sent ${result.sent} email${result.sent === 1 ? "" : "s"}.`,
                );
            } else {
                toast.warning(
                    `Campaign "${campaignName.trim() || "Bulk email"}": sent ${result.sent}. ${result.failed.length} failed. First error: ${result.failed[0]?.error ?? ""}`,
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
    const previewRecipients = filteredRecipients.slice(0, 15);
    const removeRecipient = (email: string) => {
        setRecipients((prev) => prev.filter((r) => r.email !== email));
    };

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 md:p-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <div className="space-y-1">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold md:text-3xl">
                        <MailsIcon className="size-8 text-indigo-600" aria-hidden />
                        Bulk email
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Upload a CSV (up to {MAX_RECIPIENTS} addresses), pick a template, and send via your connected
                        Google workspace account.
                    </p>
                </div>

                {!connected && (
                    <Alert variant="destructive">
                        <AlertCircleIcon className="size-4" />
                        <AlertTitle>Google not connected</AlertTitle>
                        <AlertDescription className="mt-1 text-sm">
                            Open Integrations and use &quot;Connect with Google&quot; to authorize Gmail send access,
                            then return here.
                            <Button className="ml-2 h-8" asChild variant="outline" size="sm">
                                <Link href="/integrations">Integrations</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 rounded-xl border bg-white/95 p-6 shadow-sm">
                    <div className="grid gap-3 rounded-lg border bg-slate-50/70 p-3 md:grid-cols-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Step 1</p>
                            <p className="text-sm font-medium">Configure campaign</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Step 2</p>
                            <p className="text-sm font-medium">Upload and validate recipients</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Step 3</p>
                            <p className="text-sm font-medium">Preview and send</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="campaign-name">Campaign name</Label>
                        <Input
                            id="campaign-name"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="Campaign title for tracking"
                            maxLength={120}
                            disabled={sending}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Template</Label>
                        <Select
                            value={templateId}
                            onValueChange={(v) => {
                                setTemplateId(v);
                                applyTemplate(v);
                            }}
                        >
                            <SelectTrigger className="max-w-md">
                                <SelectValue placeholder="Choose template" />
                            </SelectTrigger>
                            <SelectContent>
                                {(templates ?? []).map((t: any) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">
                            Choosing a template replaces the subject and message below. You can edit freely. Per-recipient
                            placeholders:{" "}
                            <code className="rounded bg-muted px-1">{"{{first_name}}"}</code>,{" "}
                            <code className="rounded bg-muted px-1">{"{{name}}"}</code>,{" "}
                            <code className="rounded bg-muted px-1">{"{{email}}"}</code>,{" "}
                            <code className="rounded bg-muted px-1">{"{{company}}"}</code>, etc.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Input
                                className="max-w-xs"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="New template name"
                                disabled={savingTemplate || sending}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={savingTemplate || sending}
                                onClick={async () => {
                                    const label = newTemplateName.trim();
                                    if (!label) {
                                        toast.error("Template name is required");
                                        return;
                                    }
                                    if (!subject.trim() || !body.trim()) {
                                        toast.error("Subject and message are required to save template");
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
                                        toast.success("Custom template saved");
                                    } catch (err) {
                                        toast.error(err instanceof Error ? err.message : "Failed to save template");
                                    } finally {
                                        setSavingTemplate(false);
                                    }
                                }}
                            >
                                {savingTemplate ? "Saving..." : "Save as custom template"}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bulk-email-subject">Subject</Label>
                        <Input
                            id="bulk-email-subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Subject line (placeholders allowed)"
                            maxLength={500}
                            disabled={sending}
                        />
                        <p className="text-muted-foreground text-xs">{subject.length}/500 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bulk-email-body">Message</Label>
                        <Textarea
                            id="bulk-email-body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Email body…"
                            className="min-h-[200px] resize-y font-sans text-sm"
                            disabled={sending}
                        />
                        <p className="text-muted-foreground text-xs">{body.length}/100000 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bulk-email-image-url">Image URL (optional)</Label>
                        <Input
                            id="bulk-email-image-url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://yourcdn.com/banner.png"
                            disabled={sending}
                        />
                        <p className="text-muted-foreground text-xs">
                            Add a public image URL to include an image in every email.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Recipients (CSV)</Label>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                                <UploadIcon className="mr-2 size-4" />
                                Choose file
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={downloadSample}>
                                <DownloadIcon className="mr-2 size-4" />
                                Sample CSV
                            </Button>
                            {fileLabel ? (
                                <span className="text-muted-foreground text-sm">{fileLabel}</span>
                            ) : null}
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={onFile}
                        />
                        <p className="text-muted-foreground text-xs">
                            Required column: <code className="rounded bg-muted px-1">email</code>. Optional:{" "}
                            <code className="rounded bg-muted px-1">first_name</code>,{" "}
                            <code className="rounded bg-muted px-1">last_name</code>,{" "}
                            <code className="rounded bg-muted px-1">name</code>,{" "}
                            <code className="rounded bg-muted px-1">company</code>. Duplicate emails are skipped.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-md border bg-slate-50/60 p-3">
                            <p className="text-xs text-muted-foreground">Total recipients</p>
                            <p className="text-xl font-semibold">{recipients.length}</p>
                        </div>
                        <div className="rounded-md border bg-slate-50/60 p-3">
                            <p className="text-xs text-muted-foreground">Filtered recipients</p>
                            <p className="text-xl font-semibold">{filteredRecipients.length}</p>
                        </div>
                        <div className="rounded-md border bg-slate-50/60 p-3">
                            <p className="text-xs text-muted-foreground">Connected sender</p>
                            <p className="truncate text-sm font-medium">{connection?.email ?? "Not connected"}</p>
                        </div>
                    </div>

                    <div className="space-y-2 rounded-lg border bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                className="max-w-xs"
                                value={recipientSearch}
                                onChange={(e) => setRecipientSearch(e.target.value)}
                                placeholder="Search recipient list"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setRecipients([])}
                                disabled={recipients.length === 0 || sending}
                            >
                                Clear recipients
                            </Button>
                        </div>
                        <div className="max-h-52 overflow-auto rounded-md border">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-2 py-2 font-medium">Email</th>
                                        <th className="px-2 py-2 font-medium">Name</th>
                                        <th className="px-2 py-2 font-medium">Company</th>
                                        <th className="px-2 py-2 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewRecipients.length === 0 ? (
                                        <tr>
                                            <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                                                No recipients to show
                                            </td>
                                        </tr>
                                    ) : (
                                        previewRecipients.map((r) => (
                                            <tr key={r.email} className="border-t">
                                                <td className="px-2 py-2">{r.email}</td>
                                                <td className="px-2 py-2">{r.name || [r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                                                <td className="px-2 py-2">{r.company || "—"}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
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
                            <p className="text-xs text-muted-foreground">
                                Showing first {previewRecipients.length} of {filteredRecipients.length} filtered recipients.
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-4">
                        <p className="text-sm font-medium">Preview (first CSV row or sample)</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {recipients.length} recipient{recipients.length === 1 ? "" : "s"} loaded
                            {recipients.length >= MAX_RECIPIENTS ? ` (max ${MAX_RECIPIENTS})` : ""}
                        </p>
                        <p className="mt-3 text-sm">
                            <span className="font-medium">Resolved subject:</span> {preview.subject}
                        </p>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs">
                            {preview.body}
                        </pre>
                        {imageUrl.trim() ? (
                            <div className="mt-3 rounded-md border bg-background p-2">
                                <p className="mb-1 text-xs text-muted-foreground">Image preview</p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imageUrl}
                                    alt="Bulk email preview"
                                    className="max-h-44 w-auto max-w-full rounded"
                                />
                            </div>
                        ) : null}
                    </div>

                    <Button
                        className="w-full sm:w-auto"
                        size="lg"
                        disabled={!connected || recipients.length === 0 || sending || !campaignName.trim()}
                        onClick={() => void handleSend()}
                    >
                        {sending ? "Sending…" : `Send ${recipients.length || 0} email${recipients.length === 1 ? "" : "s"}`}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                        Messages are sent one after another to respect Gmail rate limits; large batches may take a few
                        minutes. Sending is logged as CRM email activities.
                    </p>
                </div>
            </div>
        </div>
    );
}
