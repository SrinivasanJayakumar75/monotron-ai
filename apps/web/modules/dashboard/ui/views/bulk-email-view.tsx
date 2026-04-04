"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import {
    BULK_EMAIL_TEMPLATES,
    mergeBulkEmailTemplate,
} from "@workspace/backend/lib/bulkEmailTemplates";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { type ChangeEventHandler, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    CheckIcon,
    ChevronDownIcon,
    Columns2Icon,
    ImageIcon,
    MailIcon,
    MailsIcon,
    MinusIcon,
    MousePointerClickIcon,
    SendIcon,
    TypeIcon,
} from "lucide-react";
import {
    mergeBulkRecipientLists,
    parseBulkEmailRecipientsFromCsv,
    SAMPLE_BULK_EMAIL_CSV,
    type BulkRecipientInput,
} from "../lib/parse-bulk-email-csv";
import { BulkEmailRecipientsPickerCard } from "./bulk-email-recipients-picker-card";
import { BulkEmailTemplateGallery } from "./bulk-email-template-gallery";

const MAX_RECIPIENTS = 2000;
const PREVIEW_TEXT_SOFT = 140;
const PREVIEW_TEXT_HARD = 200;

function toDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MERGE_SNIPPETS: { label: string; value: string }[] = [
    { label: "First name", value: "{{first_name}}" },
    { label: "Last name", value: "{{last_name}}" },
    { label: "Full name", value: "{{name}}" },
    { label: "Email", value: "{{email}}" },
    { label: "Company", value: "{{company}}" },
    { label: "Company line", value: "{{company_line}}" },
    { label: "Company comma", value: "{{company_comma}}" },
];

const DEFAULT_SAMPLE: BulkRecipientInput = {
    email: "recipient@example.com",
    firstName: "Pat",
    lastName: "Jones",
    name: "Pat Jones",
    company: "Example Co",
};

function insertAtCursor(
    el: HTMLTextAreaElement | HTMLInputElement | null,
    snippet: string,
    value: string,
    onChange: (next: string) => void,
) {
    if (!el) {
        onChange(value + snippet);
        return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
        el.focus();
        const pos = start + snippet.length;
        el.setSelectionRange(pos, pos);
    });
}

type EditorTab = "edit" | "settings" | "send";

export function BulkEmailView() {
    const fileRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const previewTextRef = useRef<HTMLTextAreaElement>(null);

    const templates = useQuery(api.private.bulkEmail.listTemplates);
    const crmRecipientsRaw = useQuery(api.private.bulkEmail.listCrmRecipientsForBulkEmail);
    const connection = useQuery(api.private.googleIntegration.getConnection);
    const upcomingScheduled = useQuery(api.private.scheduledBulkEmail.listMyUpcoming);
    const sendBulk = useAction(api.private.googleEmail.sendBulkEmails);
    const scheduleBulkSend = useMutation(api.private.scheduledBulkEmail.scheduleSend);
    const cancelScheduledSend = useMutation(api.private.scheduledBulkEmail.cancelSend);

    const [composePhase, setComposePhase] = useState<"gallery" | "recipients" | "editor">("gallery");
    const [editorTab, setEditorTab] = useState<EditorTab>("edit");
    /** When leaving the editor for Recipients, restore this tab on Continue. */
    const [editorTabBeforeRecipients, setEditorTabBeforeRecipients] = useState<EditorTab>("edit");
    const [templateId, setTemplateId] = useState<string>("");
    const [internalTitle, setInternalTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [previewText, setPreviewText] = useState("");
    const [body, setBody] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [recipients, setRecipients] = useState<BulkRecipientInput[]>([]);
    const [fileLabel, setFileLabel] = useState("");
    const [sending, setSending] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [newTemplateName, setNewTemplateName] = useState("");
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [language, setLanguage] = useState("en");
    const [subscriptionType, setSubscriptionType] = useState("marketing");
    const [sendMode, setSendMode] = useState<"now" | "later">("now");
    const [scheduling, setScheduling] = useState(false);
    const [scheduleAtLocal, setScheduleAtLocal] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 15);
        return toDatetimeLocalValue(d);
    });
    const [plainTextNotes, setPlainTextNotes] = useState("");
    const [crmTab, setCrmTab] = useState<"all" | "leads" | "contacts">("all");
    const [crmPickerSearch, setCrmPickerSearch] = useState("");
    const [crmPickerSelected, setCrmPickerSelected] = useState<string[]>([]);
    const createTemplate = useMutation((api as any).private.bulkEmail.createTemplate);

    const applyTemplate = useCallback((id: string) => {
        if (id in BULK_EMAIL_TEMPLATES) {
            const t = BULK_EMAIL_TEMPLATES[id as keyof typeof BULK_EMAIL_TEMPLATES];
            setSubject(t.subject);
            setBody(t.body);
            return;
        }
        const custom = (templates ?? []).find((t) => t && t.id === id) as
            | { subject?: string; body?: string }
            | undefined;
        if (custom && "subject" in custom && "body" in custom && custom.subject && custom.body) {
            setSubject(custom.subject);
            setBody(custom.body);
        }
    }, [templates]);

    const onGallerySelect = (id: string) => {
        setTemplateId(id);
        applyTemplate(id);
        setEditorTabBeforeRecipients("edit");
        setComposePhase("recipients");
        toast.success("Layout applied — pick recipients from CRM or CSV next.");
    };

    const galleryItems = useMemo(() => {
        if (!templates) return undefined;
        return templates
            .filter(Boolean)
            .map((t) => ({
                id: t!.id,
                label: t!.label,
                description: (t as { description?: string }).description,
                category: (t as { category?: string }).category,
                badge: (t as { badge?: string }).badge,
            }));
    }, [templates]);

    const templateLabel =
        templates?.find((t) => t?.id === templateId)?.label ??
        (templateId.startsWith("custom:") ? "Custom template" : "Template");

    const previewSample = recipients[0] ?? DEFAULT_SAMPLE;

    const preview = useMemo(() => {
        return mergeBulkEmailTemplate({ subject, body }, {
            email: previewSample.email,
            firstName: previewSample.firstName,
            lastName: previewSample.lastName,
            name: previewSample.name,
            company: previewSample.company,
        });
    }, [subject, body, previewSample]);

    const previewSnippetMerged = useMemo(() => {
        const t = previewText.trim();
        if (!t) return "";
        return mergeBulkEmailTemplate({ subject: t, body: "" }, {
            email: previewSample.email,
            firstName: previewSample.firstName,
            lastName: previewSample.lastName,
            name: previewSample.name,
            company: previewSample.company,
        }).subject;
    }, [previewText, previewSample]);

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

    const recipientPayload = useMemo(
        () =>
            recipients.map((r) => ({
                email: r.email,
                firstName: r.firstName,
                lastName: r.lastName,
                name: r.name,
                company: r.company,
            })),
        [recipients],
    );

    const handleSend = async () => {
        if (!connection) {
            toast.error("Connect Google first.");
            return;
        }
        if (recipients.length === 0) {
            toast.error("Add at least one recipient (Send or schedule tab).");
            return;
        }
        const sub = subject.trim();
        const msg = body.trim();
        if (!sub) {
            toast.error("Add a subject in Details.");
            setEditorTab("settings");
            return;
        }
        if (!msg) {
            toast.error("Add a message body in Edit.");
            setEditorTab("edit");
            return;
        }
        const pre = previewText.trim();
        if (pre.length > PREVIEW_TEXT_HARD) {
            toast.error(`Preview text must be at most ${PREVIEW_TEXT_HARD} characters.`);
            setEditorTab("settings");
            return;
        }

        if (sendMode === "later") {
            const scheduledAt = new Date(scheduleAtLocal).getTime();
            if (Number.isNaN(scheduledAt) || scheduledAt < Date.now() + 60_000) {
                toast.error("Pick a date and time at least 1 minute from now.");
                return;
            }
            setScheduling(true);
            try {
                await scheduleBulkSend({
                    subject: sub,
                    body: msg,
                    previewText: pre || undefined,
                    imageUrl: imageUrl.trim() || undefined,
                    internalTitle: internalTitle.trim() || undefined,
                    scheduledAt,
                    recipients: recipientPayload,
                });
                const when = new Date(scheduledAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                });
                toast.success(
                    `Scheduled ${recipients.length.toLocaleString()} email${recipients.length === 1 ? "" : "s"} for ${when} (this device’s local time).`,
                );
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not schedule send");
            } finally {
                setScheduling(false);
            }
            return;
        }

        setSending(true);
        try {
            const result = await sendBulk({
                subject: sub,
                body: msg,
                previewText: pre || undefined,
                imageUrl: imageUrl.trim() || undefined,
                recipients: recipientPayload,
            });
            const campaignLabel = internalTitle.trim() || templateLabel || "Bulk email";
            if (result.failed.length === 0) {
                toast.success(`“${campaignLabel}”: sent ${result.sent} email${result.sent === 1 ? "" : "s"}.`);
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
    const chipRecipients = filteredRecipients.slice(0, 16);

    const removeRecipient = (email: string) => {
        setRecipients((prev) => prev.filter((r) => r.email !== email));
    };

    const crmPickerRows = useMemo(() => {
        if (!crmRecipientsRaw) return [];
        const q = crmPickerSearch.trim().toLowerCase();
        return crmRecipientsRaw.filter((r) => {
            if (crmTab === "leads" && r.source !== "lead") return false;
            if (crmTab === "contacts" && r.source !== "contact") return false;
            if (!q) return true;
            return [r.email, r.name, r.firstName, r.lastName, r.company]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q);
        });
    }, [crmRecipientsRaw, crmPickerSearch, crmTab]);

    const toggleCrmPick = (email: string) => {
        setCrmPickerSelected((prev) =>
            prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
        );
    };

    const selectAllCrmVisible = () => {
        setCrmPickerSelected((prev) => {
            const next = new Set(prev);
            for (const r of crmPickerRows) next.add(r.email);
            return [...next];
        });
    };

    const clearCrmPickSelection = () => setCrmPickerSelected([]);

    const addCrmPickedToRecipients = () => {
        if (!crmRecipientsRaw) return;
        const byEmail = new Map(crmRecipientsRaw.map((r) => [r.email, r]));
        const incoming: BulkRecipientInput[] = [];
        for (const email of crmPickerSelected) {
            const r = byEmail.get(email);
            if (!r) continue;
            incoming.push({
                email: r.email,
                firstName: r.firstName,
                lastName: r.lastName,
                name: r.name,
                company: r.company,
            });
        }
        if (incoming.length === 0) {
            toast.error("Select at least one person.");
            return;
        }
        const { merged, skippedDuplicates } = mergeBulkRecipientLists(recipients, incoming);
        if (merged.length > MAX_RECIPIENTS) {
            toast.error(`Recipient list cannot exceed ${MAX_RECIPIENTS.toLocaleString()}.`);
            return;
        }
        const added = incoming.length - skippedDuplicates;
        setRecipients(merged);
        setCrmPickerSelected([]);
        setListOpen(true);
        if (skippedDuplicates > 0) {
            toast.success(
                `Added ${added} from CRM. ${skippedDuplicates} ${skippedDuplicates === 1 ? "was" : "were"} already on the list.`,
            );
        } else {
            toast.success(`Added ${added} recipient${added === 1 ? "" : "s"} from CRM.`);
        }
    };

    const recipientsReady = recipients.length > 0;
    const messageReady = subject.trim().length > 0 && body.trim().length > 0;
    const previewTextOk = previewText.trim().length <= PREVIEW_TEXT_HARD;
    const scheduleTs = new Date(scheduleAtLocal).getTime();
    const scheduleTimeOk =
        sendMode === "now" ||
        (!Number.isNaN(scheduleTs) && scheduleTs >= Date.now() + 60_000);
    const baseSendReady = connected && recipientsReady && messageReady && previewTextOk;
    const canSendNow = baseSendReady && !sending && sendMode === "now";
    const canScheduleSend = baseSendReady && !scheduling && sendMode === "later" && scheduleTimeOk;
    const canPrimarySendAction = sendMode === "now" ? canSendNow : canScheduleSend;

    const sendBlockers: string[] = [];
    if (!connected) sendBlockers.push("Connect Google in Integrations");
    if (!recipientsReady) sendBlockers.push("Add recipients (Recipients step or Deliver tab)");
    if (!messageReady) sendBlockers.push("Add subject (Details) and body (Compose)");
    if (!previewTextOk) {
        sendBlockers.push(`Preview text over ${PREVIEW_TEXT_HARD} characters`);
    }
    if (sendMode === "later" && !scheduleTimeOk) {
        sendBlockers.push("Pick a send time at least 1 minute from now (your device’s local time).");
    }

    const previewRemaining = PREVIEW_TEXT_SOFT - previewText.trim().length;

    const goReviewAndSend = () => {
        if (!messageReady) {
            toast.error("Add a subject and message first.");
            if (!subject.trim()) setEditorTab("settings");
            else setEditorTab("edit");
            return;
        }
        setEditorTab("send");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const mergePopover = (target: "body" | "subject" | "preview") => (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <TypeIcon className="size-3.5" />
                    Personalize
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
                <p className="text-muted-foreground mb-2 text-xs font-medium">Insert merge field</p>
                <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                    {MERGE_SNIPPETS.map((s) => (
                        <Button
                            key={s.value}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 justify-start text-xs"
                            onClick={() => {
                                if (target === "body") {
                                    insertAtCursor(bodyRef.current, s.value, body, setBody);
                                } else if (target === "subject") {
                                    insertAtCursor(subjectRef.current, s.value, subject, setSubject);
                                } else {
                                    insertAtCursor(previewTextRef.current, s.value, previewText, setPreviewText);
                                }
                            }}
                        >
                            {s.label}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );

    if (composePhase === "gallery") {
        return (
            <div className="min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-slate-100/80">
                <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-6 md:py-10">
                    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <Button variant="outline" size="sm" className="gap-2 bg-white" asChild>
                            <Link href="/integrations">
                                <MailIcon className="size-4" />
                                Google &amp; integrations
                            </Link>
                        </Button>
                        {connected ? (
                            <p className="flex items-center gap-2 text-sm text-emerald-800">
                                <CheckIcon className="size-4 shrink-0" />
                                Sending as <strong className="font-medium">{connection?.email}</strong>
                            </p>
                        ) : (
                            <Alert className="max-w-md border-amber-200 bg-amber-50 py-2">
                                <AlertCircleIcon className="size-4 text-amber-700" />
                                <AlertTitle className="text-amber-950">Gmail not connected</AlertTitle>
                                <AlertDescription className="text-amber-900">
                                    Connect Google to send. You can still pick a layout and draft.
                                    <Button className="mt-2 h-8 w-fit" variant="outline" size="sm" asChild>
                                        <Link href="/integrations">Connect</Link>
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <BulkEmailTemplateGallery templates={galleryItems} onSelect={onGallerySelect} />
                </div>
            </div>
        );
    }

    if (composePhase === "recipients") {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 via-violet-50/25 to-slate-100/90">
                <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
                    <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400" aria-hidden />
                    <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <Button
                            type="button"
                            variant="ghost"
                            className="gap-2 text-slate-600 hover:text-violet-800"
                            onClick={() => setComposePhase("gallery")}
                        >
                            <ArrowLeftIcon className="size-4" />
                            Layouts
                        </Button>
                        <Button
                            type="button"
                            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 font-medium shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500"
                            disabled={!recipientsReady}
                            onClick={() => {
                                setComposePhase("editor");
                                setEditorTab(editorTabBeforeRecipients);
                                toast.success("Customize subject and message in the composer tabs.");
                            }}
                        >
                            Continue to composer
                        </Button>
                    </div>
                </header>
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <BulkEmailRecipientsPickerCard
                        sending={sending}
                        fileRef={fileRef}
                        fileLabel={fileLabel}
                        dragActive={dragActive}
                        setDragActive={setDragActive}
                        onFile={onFile}
                        onDrop={onDrop}
                        downloadSample={downloadSample}
                        crmRecipientsRaw={crmRecipientsRaw}
                        crmTab={crmTab}
                        setCrmTab={setCrmTab}
                        crmPickerSearch={crmPickerSearch}
                        setCrmPickerSearch={setCrmPickerSearch}
                        crmPickerRows={crmPickerRows}
                        crmPickerSelected={crmPickerSelected}
                        toggleCrmPick={toggleCrmPick}
                        selectAllCrmVisible={selectAllCrmVisible}
                        clearCrmPickSelection={clearCrmPickSelection}
                        addCrmPickedToRecipients={addCrmPickedToRecipients}
                        recipients={recipients}
                        recipientsReady={recipientsReady}
                        recipientSearch={recipientSearch}
                        setRecipientSearch={setRecipientSearch}
                        chipRecipients={chipRecipients}
                        filteredRecipients={filteredRecipients}
                        previewRecipients={previewRecipients}
                        removeRecipient={removeRecipient}
                        listOpen={listOpen}
                        setListOpen={setListOpen}
                        setRecipients={setRecipients}
                        setFileLabel={setFileLabel}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-violet-50/35">
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
                <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400" aria-hidden />
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 md:gap-4">
                    <button
                        type="button"
                        onClick={() => setComposePhase("gallery")}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-violet-800"
                    >
                        <ArrowLeftIcon className="size-4" />
                        Layouts
                    </button>
                    <div className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
                    <button
                        type="button"
                        onClick={() => {
                            setEditorTabBeforeRecipients(editorTab);
                            setComposePhase("recipients");
                        }}
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-violet-800"
                    >
                        Recipients
                    </button>
                    <div className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
                    <Button
                        type="button"
                        className="ml-auto gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold shadow-md shadow-violet-500/15 hover:from-violet-500 hover:to-indigo-500"
                        onClick={goReviewAndSend}
                    >
                        Review &amp; deliver
                    </Button>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2">
                    <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                            Layout: <span className="font-medium text-slate-800">{templateLabel}</span>
                        </span>
                        <span className="max-w-md truncate">
                            Up to {MAX_RECIPIENTS.toLocaleString()} recipients · Gmail sends are throttled per message
                        </span>
                    </div>
                </div>
            </header>

            <nav className="border-b border-slate-200/80 bg-white/70 backdrop-blur-sm">
                <div className="mx-auto max-w-[1600px] px-4 py-3 md:px-6">
                    <div
                        className="inline-flex flex-wrap rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/60"
                        role="tablist"
                        aria-label="Composer sections"
                    >
                        {(
                            [
                                { id: "edit" as const, label: "Compose" },
                                { id: "settings" as const, label: "Details" },
                                { id: "send" as const, label: "Deliver" },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={editorTab === tab.id}
                                onClick={() => setEditorTab(tab.id)}
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm font-medium transition-all md:px-5",
                                    editorTab === tab.id
                                        ? "bg-white text-violet-900 shadow-sm ring-1 ring-slate-200/80"
                                        : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <div className="flex-1 px-4 py-6 md:px-6 md:py-8">
                <div className="mx-auto max-w-[1600px]">
                    {!connected ? (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircleIcon className="size-4" />
                            <AlertTitle>Gmail not connected</AlertTitle>
                            <AlertDescription className="mt-2 flex flex-col gap-2">
                                <span>Connect Google to send campaigns.</span>
                                <Button variant="outline" size="sm" className="w-fit text-destructive" asChild>
                                    <Link href="/integrations">Open Integrations</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    {editorTab === "edit" ? (
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                            <aside className="w-full shrink-0 space-y-5 rounded-xl border border-violet-200/40 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100 lg:w-60">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-violet-800/70">Content</p>
                                    <p className="text-muted-foreground mt-1 text-xs">Add blocks to your message (plain text + optional image).</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 py-2 text-xs"
                                        onClick={() =>
                                            insertAtCursor(bodyRef.current, "\n\n—\n\n", body, setBody)
                                        }
                                    >
                                        <MinusIcon className="size-4 text-slate-500" />
                                        Divider
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 py-2 text-xs"
                                        onClick={() =>
                                            insertAtCursor(
                                                bodyRef.current,
                                                "\n\n[Add your link text](https://)\n\n",
                                                body,
                                                setBody,
                                            )
                                        }
                                    >
                                        <MousePointerClickIcon className="size-4 text-slate-500" />
                                        Link line
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 py-2 text-xs"
                                        onClick={() =>
                                            insertAtCursor(bodyRef.current, "\n\nReply to this email to continue.\n\n", body, setBody)
                                        }
                                    >
                                        <MailIcon className="size-4 text-slate-500" />
                                        CTA line
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 py-2 text-xs"
                                        onClick={() =>
                                            insertAtCursor(bodyRef.current, "\n\n• Point one\n• Point two\n\n", body, setBody)
                                        }
                                    >
                                        <Columns2Icon className="size-4 text-slate-500" />
                                        Bullets
                                    </Button>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-600">Image URL (optional)</Label>
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="text-muted-foreground size-4 shrink-0" />
                                        <Input
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="https://…"
                                            disabled={sending}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wide text-violet-800/70">Personalize</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {MERGE_SNIPPETS.slice(0, 5).map((s) => (
                                            <Button
                                                key={s.value}
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-7 px-2 text-[10px]"
                                                onClick={() => insertAtCursor(bodyRef.current, s.value, body, setBody)}
                                            >
                                                {s.label}
                                            </Button>
                                        ))}
                                    </div>
                                    {mergePopover("body")}
                                </div>
                            </aside>

                            <div className="min-w-0 flex-1 space-y-4">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="border-b border-slate-100 py-4">
                                        <CardTitle className="text-lg">Message</CardTitle>
                                        <CardDescription>
                                            Merge tags like{" "}
                                            <code className="rounded bg-slate-100 px-1">{"{{first_name}}"}</code> fill from
                                            each recipient row.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30 p-4 md:p-6">
                                            <div className="mx-auto max-w-2xl rounded-xl border-2 border-dashed border-violet-200/70 bg-white p-4 shadow-inner ring-1 ring-violet-100/50 md:p-6">
                                                <Label htmlFor="bulk-email-body" className="text-slate-700">
                                                    Email body
                                                </Label>
                                                <Textarea
                                                    ref={bodyRef}
                                                    id="bulk-email-body"
                                                    value={body}
                                                    onChange={(e) => setBody(e.target.value)}
                                                    placeholder="Hi {{first_name}},&#10;&#10;…"
                                                    className="mt-2 min-h-[280px] resize-y border-slate-200 text-sm leading-relaxed"
                                                    disabled={sending}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-base">Preview</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Subject</p>
                                            <p className="mt-1 font-semibold text-slate-900">{preview.subject || "—"}</p>
                                            {previewSnippetMerged ? (
                                                <>
                                                    <p className="text-muted-foreground mt-3 text-[10px] font-bold uppercase">
                                                        Preview text
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-sm">{previewSnippetMerged}</p>
                                                </>
                                            ) : null}
                                            <Separator className="my-4" />
                                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
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
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : null}

                    {editorTab === "settings" ? (
                        <div className="mx-auto max-w-3xl space-y-6">
                            <Card className="border-slate-200/90 shadow-sm ring-1 ring-violet-100/40">
                                <CardHeader>
                                    <CardTitle className="text-xl">Campaign details</CardTitle>
                                    <CardDescription>
                                        Subject line, inbox preview (preheader), and labels your team sees in toasts and exports.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Label htmlFor="bulk-subject">Subject line</Label>
                                            {mergePopover("subject")}
                                        </div>
                                        <Input
                                            ref={subjectRef}
                                            id="bulk-subject"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Hi {{first_name}} — …"
                                            maxLength={500}
                                            disabled={sending}
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Label htmlFor="bulk-preview-text">Preview text</Label>
                                            {mergePopover("preview")}
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                            Shown after the subject in many inbox clients (hidden preheader).
                                        </p>
                                        <Textarea
                                            ref={previewTextRef}
                                            id="bulk-preview-text"
                                            value={previewText}
                                            onChange={(e) => setPreviewText(e.target.value)}
                                            placeholder="Summarize the email in one line…"
                                            maxLength={PREVIEW_TEXT_HARD}
                                            disabled={sending}
                                            className="min-h-[80px] text-sm"
                                        />
                                        <p
                                            className={cn(
                                                "text-xs",
                                                previewRemaining < 0 ? "font-medium text-amber-700" : "text-muted-foreground",
                                            )}
                                        >
                                            {previewRemaining >= 0
                                                ? `${previewRemaining} characters under the recommended ${PREVIEW_TEXT_SOFT} for inbox preview.`
                                                : `${Math.abs(previewRemaining)} characters over the recommended ${PREVIEW_TEXT_SOFT} — still allowed up to ${PREVIEW_TEXT_HARD}.`}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="internal-name-settings">Internal email name</Label>
                                        <Input
                                            id="internal-name-settings"
                                            value={internalTitle}
                                            onChange={(e) => setInternalTitle(e.target.value)}
                                            placeholder="Shown in success messages only"
                                            maxLength={120}
                                            disabled={sending}
                                            className="h-11"
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Language</Label>
                                            <Select value={language} onValueChange={setLanguage} disabled={sending}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">English</SelectItem>
                                                    <SelectItem value="es">Spanish</SelectItem>
                                                    <SelectItem value="fr">French</SelectItem>
                                                    <SelectItem value="de">German</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-muted-foreground text-xs">For your records; sends use your written copy as-is.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Subscription type</Label>
                                            <Select value={subscriptionType} onValueChange={setSubscriptionType} disabled={sending}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="marketing">Marketing information</SelectItem>
                                                    <SelectItem value="transactional">Transactional</SelectItem>
                                                    <SelectItem value="one_to_one">One-to-one</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-muted-foreground text-xs">Tag campaigns for your team; always honor opt-outs and local law.</p>
                                        </div>
                                    </div>

                                    <Alert>
                                        <MailsIcon className="size-4" />
                                        <AlertTitle>Footer &amp; compliance</AlertTitle>
                                        <AlertDescription className="text-sm">
                                            Include your physical address and unsubscribe instructions in the message body when required (e.g. CAN-SPAM). Workspace-wide footer settings can be added later.
                                        </AlertDescription>
                                    </Alert>

                                    <Collapsible>
                                        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-lg border border-dashed bg-slate-50 px-4 py-3 text-left text-sm font-medium">
                                            <span>Plain text notes (optional)</span>
                                            <ChevronDownIcon className="size-4" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-3">
                                            <p className="text-muted-foreground mb-2 text-xs">
                                                Gmail sends HTML for this campaign. Use this area for notes or a rough plain-text draft.
                                            </p>
                                            <Textarea
                                                value={plainTextNotes}
                                                onChange={(e) => setPlainTextNotes(e.target.value)}
                                                className="min-h-[120px] text-sm"
                                                placeholder="Plain-text version notes…"
                                            />
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <Separator />

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
                                                        toast.success("Template saved to My templates");
                                                    } catch (err) {
                                                        toast.error(err instanceof Error ? err.message : "Save failed");
                                                    } finally {
                                                        setSavingTemplate(false);
                                                    }
                                                }}
                                            >
                                                {savingTemplate ? "Saving…" : "Save"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}

                    {editorTab === "send" ? (
                        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                            <div className="space-y-6 lg:col-span-2">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl">Recipients</CardTitle>
                                        <CardDescription>
                                            {recipientsReady
                                                ? `${recipients.length.toLocaleString()} recipient${recipients.length === 1 ? "" : "s"} on this send. Use Recipients in the top bar or Edit below to change CRM selection or CSV.`
                                                : "No recipients yet. Use Recipients in the top bar to pick leads or contacts, or upload a CSV."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {recipientsReady ? (
                                            <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                                                {chipRecipients.map((r) => (
                                                    <Badge key={r.email} variant="secondary" className="h-7 font-normal">
                                                        <span className="max-w-[200px] truncate">
                                                            {r.name ||
                                                                [r.firstName, r.lastName].filter(Boolean).join(" ") ||
                                                                r.email}
                                                        </span>
                                                    </Badge>
                                                ))}
                                                {filteredRecipients.length > chipRecipients.length ? (
                                                    <span className="text-muted-foreground self-center text-xs">
                                                        +{filteredRecipients.length - chipRecipients.length} more
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => {
                                                setEditorTabBeforeRecipients("send");
                                                setComposePhase("recipients");
                                            }}
                                        >
                                            <ArrowLeftIcon className="size-4" />
                                            Edit recipients
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-base">Final preview</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Subject</p>
                                            <p className="mt-1 font-semibold">{preview.subject}</p>
                                            {previewSnippetMerged ? (
                                                <>
                                                    <p className="text-muted-foreground mt-3 text-[10px] font-bold uppercase">
                                                        Preview text
                                                    </p>
                                                    <p className="text-muted-foreground text-sm">{previewSnippetMerged}</p>
                                                </>
                                            ) : null}
                                            <Separator className="my-4" />
                                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-sans text-sm">{preview.body}</pre>
                                        </div>
                                    </CardContent>
                                </Card>

                                {!canPrimarySendAction && sendBlockers.length > 0 ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                        <p className="font-medium">Before sending:</p>
                                        <ul className="mt-2 list-inside list-disc space-y-0.5">
                                            {sendBlockers.map((b) => (
                                                <li key={b}>{b}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setComposePhase("gallery")}
                                    >
                                        Change template
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setEditorTab("edit")}>
                                        <ArrowLeftIcon className="size-4" />
                                        Edit message
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditorTab("settings")}>
                                        Details
                                    </Button>
                                </div>
                            </div>

                            <aside className="space-y-6">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Sending options</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <RadioGroup
                                            value={sendMode}
                                            onValueChange={(v) => setSendMode(v as "now" | "later")}
                                            className="gap-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="now" id="mode-now" disabled={scheduling} />
                                                <Label htmlFor="mode-now" className="font-normal">
                                                    Send now
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="later" id="mode-later" disabled={sending} />
                                                <Label htmlFor="mode-later" className="font-normal">
                                                    Schedule for later
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                        {sendMode === "later" ? (
                                            <div className="space-y-2 pt-2">
                                                <Label htmlFor="bulk-schedule-at" className="text-xs text-slate-600">
                                                    Send date &amp; time
                                                </Label>
                                                <Input
                                                    id="bulk-schedule-at"
                                                    type="datetime-local"
                                                    value={scheduleAtLocal}
                                                    onChange={(e) => setScheduleAtLocal(e.target.value)}
                                                    disabled={scheduling || sending}
                                                    className="h-10 max-w-sm"
                                                />
                                                <p className="text-muted-foreground text-xs">
                                                    Uses your browser&apos;s local timezone. Must be at least 1 minute from
                                                    now and within 90 days (server enforced).
                                                </p>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>

                                {upcomingScheduled && upcomingScheduled.length > 0 ? (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Upcoming scheduled</CardTitle>
                                            <CardDescription>Pending sends from this account.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <ul className="space-y-2">
                                                {upcomingScheduled.map(
                                                    (row: {
                                                        _id: string;
                                                        scheduledAt: number;
                                                        subject: string;
                                                        recipientCount: number;
                                                        internalTitle?: string;
                                                    }) => (
                                                        <li
                                                            key={row._id}
                                                            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-slate-900">
                                                                    {new Date(row.scheduledAt).toLocaleString(undefined, {
                                                                        dateStyle: "medium",
                                                                        timeStyle: "short",
                                                                    })}
                                                                </p>
                                                                <p className="text-muted-foreground truncate text-xs">
                                                                    {row.internalTitle ? `${row.internalTitle} · ` : ""}
                                                                    {row.recipientCount} recipient
                                                                    {row.recipientCount === 1 ? "" : "s"} · {row.subject}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="shrink-0"
                                                                disabled={scheduling || sending}
                                                                onClick={() => {
                                                                    void cancelScheduledSend({
                                                                        scheduledBulkEmailId: row._id as Id<"scheduledBulkEmails">,
                                                                    }).then(
                                                                        () => toast.success("Scheduled send cancelled"),
                                                                        (err) =>
                                                                            toast.error(
                                                                                err instanceof Error
                                                                                    ? err.message
                                                                                    : "Cancel failed",
                                                                            ),
                                                                    );
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ) : null}

                                <Button
                                    type="button"
                                    size="lg"
                                    className="h-14 w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-base font-semibold shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500"
                                    disabled={!canPrimarySendAction}
                                    onClick={() => void handleSend()}
                                >
                                    <SendIcon className="size-5" />
                                    {sending
                                        ? "Sending…"
                                        : scheduling
                                          ? "Scheduling…"
                                          : sendMode === "later"
                                            ? `Schedule ${recipients.length.toLocaleString()} email${recipients.length === 1 ? "" : "s"}`
                                            : `Send ${recipients.length.toLocaleString()} email${recipients.length === 1 ? "" : "s"}`}
                                </Button>
                            </aside>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
