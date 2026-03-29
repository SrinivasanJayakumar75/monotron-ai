"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";

import {
    Dropzone,
    DropzoneContent,
    DropzoneEmptyState,
} from "@workspace/ui/components/dropzone";
import { api } from "@workspace/backend/_generated/api";
import { Separator } from "@workspace/ui/components/separator";
import { CloudUploadIcon, InfoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

interface UploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFileUpload?: () => void;
}

export const UploadDialog = ({ open, onOpenChange, onFileUpload }: UploadDialogProps) => {
    const addFile = useAction(api.private.files.addFile);

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        category: "",
        filename: "",
    });

    const handleFileDrop = (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];

        if (file) {
            setUploadedFiles([file]);
            if (!uploadForm.filename) {
                setUploadForm((prev) => ({ ...prev, filename: file.name }));
            }
        }
    };

    const handleUpload = async () => {
        const blob = uploadedFiles[0];

        if (!blob) {
            toast.error("Choose a file first.");
            return;
        }

        setIsUploading(true);
        try {
            const filename = (uploadForm.filename.trim() || blob.name).trim();
            const category = uploadForm.category.trim() || undefined;

            await addFile({
                bytes: await blob.arrayBuffer(),
                filename,
                mimeType: blob.type || "text/plain",
                category,
            });

            toast.success(`“${filename}” was added to your knowledge base.`);
            onFileUpload?.();
            handleCancel();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed. Try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        setUploadedFiles([]);
        setUploadForm({
            category: "",
            filename: "",
        });
    };

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-lg">
                <DialogHeader className="space-y-3 pb-2">
                    <div className="bg-muted/60 mx-auto flex size-12 items-center justify-center rounded-xl">
                        <CloudUploadIcon className="size-6 text-indigo-600" aria-hidden />
                    </div>
                    <DialogTitle className="text-center text-xl">Add a document</DialogTitle>
                    <DialogDescription className="text-center text-sm leading-relaxed">
                        Upload one file at a time. Text is extracted and indexed for the AI assistant to search.
                    </DialogDescription>
                </DialogHeader>

                <Alert className="border-indigo-200/80 bg-indigo-50/50">
                    <InfoIcon className="size-4 text-indigo-600" />
                    <AlertDescription className="text-indigo-950 text-xs leading-relaxed">
                        Accepted: <strong>PDF</strong>, <strong>CSV</strong>, and <strong>plain text</strong> (.txt). Large PDFs may take a moment to process.
                    </AlertDescription>
                </Alert>

                <div className="space-y-5 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="kb-category">Category (optional)</Label>
                        <Input
                            className="h-10 w-full"
                            id="kb-category"
                            onChange={(e) =>
                                setUploadForm((prev) => ({
                                    ...prev,
                                    category: e.target.value,
                                }))
                            }
                            placeholder="e.g. Product FAQs, Legal, Onboarding"
                            type="text"
                            value={uploadForm.category}
                            disabled={isUploading}
                        />
                        <p className="text-muted-foreground text-xs">
                            Helps you filter and recognize groups of documents in the list.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="kb-filename">
                            Display name <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                            className="h-10 w-full"
                            id="kb-filename"
                            onChange={(e) =>
                                setUploadForm((prev) => ({
                                    ...prev,
                                    filename: e.target.value,
                                }))
                            }
                            placeholder="Override the filename shown in the library"
                            type="text"
                            value={uploadForm.filename}
                            disabled={isUploading}
                        />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>File</Label>
                        <Dropzone
                            accept={{
                                "application/pdf": [".pdf"],
                                "text/csv": [".csv"],
                                "text/plain": [".txt"],
                            }}
                            disabled={isUploading}
                            maxFiles={1}
                            onDrop={handleFileDrop}
                            src={uploadedFiles}
                        >
                            <DropzoneEmptyState />
                            <DropzoneContent />
                        </Dropzone>
                    </div>
                </div>

                <DialogFooter className="flex-col gap-2 border-t pt-4 sm:flex-row">
                    <Button disabled={isUploading} onClick={handleCancel} variant="outline" className="w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => void handleUpload()}
                        disabled={uploadedFiles.length === 0 || isUploading}
                        className="w-full gap-2 bg-indigo-600 hover:bg-indigo-600/90 sm:w-auto"
                    >
                        {isUploading ? "Uploading…" : "Upload & index"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
