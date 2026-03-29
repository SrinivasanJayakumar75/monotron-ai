"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { UseInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import type { PublicFile } from "@workspace/backend/private/files";
import { Button } from "@workspace/ui/components/button";
import {
    BookOpenIcon,
    ExternalLinkIcon,
    FileIcon,
    FileSpreadsheetIcon,
    FileTextIcon,
    Loader2Icon,
    MoreHorizontalIcon,
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { useMemo, useState } from "react";
import { UploadDialog } from "../components/upload-dialog";
import { DeleteFileDialog } from "../components/delete-file-dialog";
import { cn } from "@workspace/ui/lib/utils";

function FileTypeGlyph({ extension }: { extension: string }) {
    const e = extension.toLowerCase();
    if (e === "pdf") {
        return <FileTextIcon className="size-5 text-red-600/90" aria-hidden />;
    }
    if (e === "csv") {
        return <FileSpreadsheetIcon className="size-5 text-emerald-600/90" aria-hidden />;
    }
    if (e === "txt" || e === "text") {
        return <FileTextIcon className="size-5 text-slate-600" aria-hidden />;
    }
    return <FileIcon className="text-muted-foreground size-5" aria-hidden />;
}

function StatusBadge({ status }: { status: PublicFile["status"] }) {
    const map = {
        ready: { label: "Ready", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
        processing: { label: "Processing", className: "border-amber-200 bg-amber-50 text-amber-900" },
        error: { label: "Error", className: "border-red-200 bg-red-50 text-red-800" },
    } as const;
    const cfg = map[status];
    return (
        <Badge variant="outline" className={cn("font-normal", cfg.className)}>
            {status === "processing" ? (
                <Loader2Icon className="mr-1 size-3 animate-spin" aria-hidden />
            ) : null}
            {cfg.label}
        </Badge>
    );
}

export const FilesView = () => {
    const files = usePaginatedQuery(api.private.files.list, {}, { initialNumItems: 10 });

    const {
        topElementRef,
        handleLoadMore,
        canLoadMore,
        isLoadingFirstPage,
        isLoadingMore,
    } = UseInfiniteScroll({
        status: files.status,
        loadMore: files.loadMore,
        loadSize: 10,
    });

    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null);
    const [search, setSearch] = useState("");

    const handleDeleteClick = (file: PublicFile) => {
        setSelectedFile(file);
        setDeleteDialogOpen(true);
    };

    const handleFileDeleted = () => {
        setSelectedFile(null);
    };

    const filteredFiles = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = files.results;
        if (!q) return rows;
        return rows.filter((f) => {
            const cat = (f.category ?? "").toLowerCase();
            return (
                f.name.toLowerCase().includes(q) ||
                f.type.toLowerCase().includes(q) ||
                cat.includes(q)
            );
        });
    }, [files.results, search]);

    const totalLoaded = files.results.length;

    return (
        <>
            <DeleteFileDialog
                onOpenChange={setDeleteDialogOpen}
                open={deleteDialogOpen}
                file={selectedFile}
                onDeleted={handleFileDeleted}
            />
            <UploadDialog onOpenChange={setUploadDialogOpen} open={uploadDialogOpen} />

            <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-background to-indigo-50/25">
                <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-10">
                    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                                <BookOpenIcon className="size-7" aria-hidden />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Knowledge base</h1>
                                <p className="text-muted-foreground max-w-xl text-sm leading-relaxed md:text-base">
                                    Documents you upload are indexed so your assistant can search them and answer with
                                    your company&apos;s facts — ideal for FAQs, policies, and product docs.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="lg"
                            className="h-11 gap-2 bg-indigo-600 shadow-md shadow-indigo-600/20 hover:bg-indigo-600/90"
                            onClick={() => setUploadDialogOpen(true)}
                        >
                            <PlusIcon className="size-5" />
                            Add document
                        </Button>
                    </header>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="border-slate-200/90 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                                    In chat
                                </div>
                                <CardTitle className="text-base">Used by the AI</CardTitle>
                                <CardDescription className="text-xs leading-snug">
                                    The assistant retrieves relevant snippets when users ask questions.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="border-slate-200/90 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                                    This list
                                </div>
                                <CardTitle className="text-base tabular-nums">
                                    {isLoadingFirstPage ? "…" : `${totalLoaded} loaded`}
                                </CardTitle>
                                <CardDescription className="text-xs leading-snug">
                                    {totalLoaded > 0 && canLoadMore
                                        ? "Scroll to the bottom to load more."
                                        : "Upload to grow your library."}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    <Card className="overflow-hidden border-slate-200/90 shadow-md shadow-slate-200/30">
                        <CardHeader className="border-b bg-slate-50/80 pb-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle className="text-lg">Documents</CardTitle>
                                    <CardDescription className="mt-1">
                                        Search applies to files already loaded below{canLoadMore ? " (load more to include older uploads)" : ""}.
                                    </CardDescription>
                                </div>
                                <div className="relative w-full sm:max-w-xs">
                                    <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name, type, category…"
                                        className="h-10 pl-9"
                                        disabled={isLoadingFirstPage || totalLoaded === 0}
                                    />
                                </div>
                            </div>
                        </CardHeader>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="px-4 py-3 font-semibold md:px-6">Document</TableHead>
                                        <TableHead className="hidden py-3 font-semibold sm:table-cell">Category</TableHead>
                                        <TableHead className="hidden py-3 font-semibold md:table-cell">Status</TableHead>
                                        <TableHead className="py-3 font-semibold">Size</TableHead>
                                        <TableHead className="w-[100px] py-3 text-right font-semibold"> </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingFirstPage ? (
                                        <TableRow>
                                            <TableCell className="h-32 text-center" colSpan={5}>
                                                <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 text-sm">
                                                    <Loader2Icon className="size-6 animate-spin text-indigo-600" />
                                                    Loading documents…
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : files.results.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="h-56" colSpan={5}>
                                                <div className="flex flex-col items-center justify-center gap-4 px-4 py-6 text-center">
                                                    <div className="bg-muted/50 flex size-16 items-center justify-center rounded-2xl">
                                                        <BookOpenIcon className="text-muted-foreground size-8" />
                                                    </div>
                                                    <div className="max-w-sm space-y-1">
                                                        <p className="font-medium">No documents yet</p>
                                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                                            Add PDFs, CSVs, or text files so your assistant can answer from
                                                            your content.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        className="gap-2 bg-indigo-600 hover:bg-indigo-600/90"
                                                        onClick={() => setUploadDialogOpen(true)}
                                                    >
                                                        <PlusIcon className="size-4" />
                                                        Upload your first file
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredFiles.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="text-muted-foreground h-24 text-center text-sm" colSpan={5}>
                                                No documents match &quot;{search.trim()}&quot;. Try another search or clear the
                                                filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredFiles.map((file) => (
                                            <TableRow
                                                key={file.id}
                                                className="hover:bg-indigo-50/40 border-border/60"
                                            >
                                                <TableCell className="px-4 py-3 md:px-6">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <FileTypeGlyph extension={file.type} />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                <span className="truncate font-medium">{file.name}</span>
                                                                {file.url ? (
                                                                    <a
                                                                        href={file.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-indigo-600 hover:text-indigo-700 inline-flex shrink-0 items-center gap-0.5 text-xs font-medium"
                                                                    >
                                                                        Open
                                                                        <ExternalLinkIcon className="size-3" />
                                                                    </a>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-muted-foreground mt-0.5 text-xs uppercase sm:hidden">
                                                                {file.type} ·{" "}
                                                                <StatusBadge status={file.status} />
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden py-3 sm:table-cell">
                                                    {file.category ? (
                                                        <Badge variant="secondary" className="font-normal">
                                                            {file.category}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden py-3 md:table-cell">
                                                    <StatusBadge status={file.status} />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground py-3 text-sm tabular-nums">
                                                    {file.size}
                                                </TableCell>
                                                <TableCell className="py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button className="size-9 p-0" variant="ghost" aria-label="Actions">
                                                                <MoreHorizontalIcon className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDeleteClick(file)}
                                                            >
                                                                <TrashIcon className="mr-2 size-4" />
                                                                Remove from knowledge base
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {!isLoadingFirstPage && files.results.length > 0 && (
                            <div className="border-border/60 border-t bg-muted/20">
                                <InfiniteScrollTrigger
                                    canLoadMore={canLoadMore}
                                    isLoadingMore={isLoadingMore}
                                    onLoadMore={handleLoadMore}
                                    ref={topElementRef}
                                />
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
};
