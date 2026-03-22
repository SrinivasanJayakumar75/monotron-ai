"use client";

import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { useMutation, useQuery } from "convex/react";
import { CopyIcon, GlobeIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function convexCollectBaseUrl(convexCloudUrl: string): string {
    const trimmed = convexCloudUrl.trim();
    if (!trimmed) {
        return "";
    }
    return trimmed.replace(/\.convex\.cloud(\/?|$)/i, ".convex.site$1");
}

function formatDuration(ms: number): string {
    if (ms <= 0) {
        return "0s";
    }
    const sec = Math.round(ms / 1000);
    if (sec < 60) {
        return `${sec}s`;
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) {
        return s ? `${m}m ${s}s` : `${m}m`;
    }
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h}h ${rm}m` : `${h}h`;
}

function regionLabel(code: string): string {
    if (code === "Unknown") {
        return "Unknown";
    }
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
    } catch {
        return code;
    }
}

export const WebsiteAnalyticsView = () => {
    const sites = useQuery(api.private.analyticsSites.list);
    const addSite = useMutation(api.private.analyticsSites.add);
    const removeSite = useMutation(api.private.analyticsSites.remove);

    const [domainInput, setDomainInput] = useState("");
    const [selectedId, setSelectedId] = useState<Id<"analyticsSites"> | null>(null);
    const [appOrigin, setAppOrigin] = useState("");

    useEffect(() => {
        setAppOrigin(window.location.origin);
    }, []);

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
    const collectBase = useMemo(() => convexCollectBaseUrl(convexUrl), [convexUrl]);
    const collectEndpoint = collectBase ? `${collectBase.replace(/\/$/, "")}/analytics/collect` : "";

    useEffect(() => {
        if (!sites) {
            return;
        }
        if (sites.length === 0) {
            setSelectedId(null);
            return;
        }
        const first = sites[0]!;
        if (!selectedId) {
            setSelectedId(first._id);
            return;
        }
        if (!sites.some((s) => s._id === selectedId)) {
            setSelectedId(first._id);
        }
    }, [sites, selectedId]);

    const stats = useQuery(
        api.private.analyticsSites.stats,
        selectedId ? { siteId: selectedId } : "skip"
    );

    const selectedSite = sites?.find((s) => s._id === selectedId);

    const embedSnippet =
        selectedSite && appOrigin && collectEndpoint
            ? `<script src="${appOrigin}/monotron-analytics.js" data-ingest-key="${selectedSite.ingestKey}" data-endpoint="${collectEndpoint}" async><\/script>`
            : "";

    const handleAdd = async () => {
        const value = domainInput.trim();
        if (!value) {
            toast.error("Enter your website URL or domain");
            return;
        }
        try {
            const id = await addSite({ domainInput: value });
            setDomainInput("");
            setSelectedId(id);
            toast.success("Website added");
        } catch (e) {
            const message = e instanceof Error ? e.message : "Could not add website";
            toast.error(message);
        }
    };

    const handleRemove = async (id: Id<"analyticsSites">) => {
        try {
            await removeSite({ siteId: id });
            toast.success("Website removed");
            if (selectedId === id) {
                setSelectedId(null);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : "Could not remove";
            toast.error(message);
        }
    };

    const copySnippet = async () => {
        if (!embedSnippet) {
            toast.error("Select a site and ensure Convex URL is configured");
            return;
        }
        try {
            await navigator.clipboard.writeText(embedSnippet);
            toast.success("Embed code copied");
        } catch {
            toast.error("Copy failed");
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-muted p-8">
            <div className="mx-auto w-full max-w-screen-lg">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">Website analytics</h1>
                    <p className="text-muted-foreground">
                        Track visits, time on site, and visitor countries for domains you own.
                    </p>
                </div>

                <div className="mt-8 space-y-4 rounded-lg border bg-background p-6">
                    <div className="space-y-2">
                        <Label htmlFor="domain-input">Add website</Label>
                        <p className="text-muted-foreground text-sm">
                            Enter your site URL or domain (for example{" "}
                            <span className="font-mono text-xs">https://example.com</span>).
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <Input
                                id="domain-input"
                                value={domainInput}
                                onChange={(e) => setDomainInput(e.target.value)}
                                placeholder="https://yourdomain.com"
                                className="flex-1 bg-muted/30"
                            />
                            <Button type="button" onClick={handleAdd} className="gap-2 shrink-0">
                                <PlusIcon className="size-4" />
                                Add website
                            </Button>
                        </div>
                    </div>
                </div>

                {!collectEndpoint && (
                    <p className="text-destructive mt-4 text-sm">
                        Set <span className="font-mono">NEXT_PUBLIC_CONVEX_URL</span> so the embed
                        can reach your Convex HTTP endpoint (collect URL uses{" "}
                        <span className="font-mono">.convex.site</span>).
                    </p>
                )}

                <Separator className="my-8" />

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Your websites</h2>
                    {sites === undefined ? (
                        <p className="text-muted-foreground text-sm">Loading…</p>
                    ) : sites.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No websites yet. Add a domain above, then install the snippet on that
                            site.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-4">Domain</TableHead>
                                        <TableHead className="px-4 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sites.map((s) => (
                                        <TableRow
                                            key={s._id}
                                            className={
                                                selectedId === s._id ? "bg-muted/40" : undefined
                                            }
                                            onClick={() => setSelectedId(s._id)}
                                        >
                                            <TableCell className="px-4">
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-2 text-left font-medium hover:underline"
                                                    onClick={() => setSelectedId(s._id)}
                                                >
                                                    <GlobeIcon className="text-muted-foreground size-4" />
                                                    {s.domain}
                                                </button>
                                            </TableCell>
                                            <TableCell className="px-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    type="button"
                                                    aria-label={`Remove ${s.domain}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemove(s._id);
                                                    }}
                                                >
                                                    <Trash2Icon className="size-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {selectedSite && (
                    <>
                        <Separator className="my-8" />
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Stats for {selectedSite.domain}</h2>
                            {stats === undefined ? (
                                <p className="text-muted-foreground text-sm">Loading stats…</p>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-lg border bg-background p-6">
                                        <p className="text-muted-foreground text-sm">Visitors</p>
                                        <p className="mt-1 text-3xl font-semibold tabular-nums">
                                            {stats.visitors}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            Unique sessions (per browser tab)
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-background p-6">
                                        <p className="text-muted-foreground text-sm">
                                            Avg. time on site
                                        </p>
                                        <p className="mt-1 text-3xl font-semibold tabular-nums">
                                            {formatDuration(stats.avgDurationMs)}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            Average session length across all visits
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-lg border bg-background p-6">
                                <p className="font-medium">Visitors by country</p>
                                {stats === undefined ? (
                                    <p className="text-muted-foreground mt-2 text-sm">Loading…</p>
                                ) : stats.byCountry.length === 0 ? (
                                    <p className="text-muted-foreground mt-2 text-sm">
                                        No geographic data yet. Country is detected from the visitor
                                        IP on the first page load.
                                    </p>
                                ) : (
                                    <ul className="mt-4 space-y-2">
                                        {stats.byCountry.map((row) => (
                                            <li
                                                key={row.country}
                                                className="flex items-center justify-between text-sm"
                                            >
                                                <span>{regionLabel(row.country)}</span>
                                                <span className="text-muted-foreground tabular-nums">
                                                    {row.count}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="space-y-2 rounded-lg border bg-background p-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-medium">Install tracking snippet</p>
                                        <p className="text-muted-foreground text-sm">
                                            Paste this before the closing{" "}
                                            <span className="font-mono text-xs">&lt;/body&gt;</span>{" "}
                                            tag on <strong>{selectedSite.domain}</strong>.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 shrink-0"
                                        onClick={copySnippet}
                                        disabled={!embedSnippet}
                                    >
                                        <CopyIcon className="size-4" />
                                        Copy code
                                    </Button>
                                </div>
                                <pre className="bg-muted mt-3 max-h-40 overflow-auto rounded-md p-4 font-mono text-xs break-all whitespace-pre-wrap">
                                    {embedSnippet || "Configure Convex URL and reload to generate the snippet."}
                                </pre>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
