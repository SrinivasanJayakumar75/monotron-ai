"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";

import { api } from "@workspace/backend/_generated/api";
import type { PublicFile } from "@workspace/backend/private/files";

interface DeleteFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    file: PublicFile | null;
    onDeleted?: () => void;
}

export const DeleteFileDialog = ({
    open,
    onOpenChange,
    file,
    onDeleted,

}: DeleteFileDialogProps) => {
    const deleteFile = useMutation(api.private.files.deleteFile);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async ()=> {
        if(!file) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteFile({ entryId: file.id });
            toast.success("Document removed from the knowledge base.");
            onDeleted?.();
            onOpenChange(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete file.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Remove from knowledge base?</DialogTitle>
                    <DialogDescription>
                        The file will be deleted and will no longer be used when the assistant searches your content.
                        This cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                {file && (
                    <div className="py-4">
                        <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-muted-foreground text-sm">
                            Type: {file.type.toUpperCase()} | Size: {file.size}
                        </p>
                        </div>

                    </div>
                )}
                <DialogFooter>
                    <Button disabled={isDeleting} 
                    onClick={()=>onOpenChange(false)}
                    variant="outline">
                        Cancel
                    </Button>
                    <Button
                        disabled={isDeleting || !file}
                        onClick={() => void handleDelete()}
                        variant="destructive"
                    >
                        {isDeleting ? "Removing…" : "Remove"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}