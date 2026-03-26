"use client";

import { AlertCircleIcon } from "lucide-react";

export const UnderConstructionView = ({ title }: { title: string }) => {
    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/30 p-8">
            <div className="mx-auto w-full max-w-screen-md space-y-2">
                <h1 className="text-2xl md:text-4xl">{title}</h1>
                <p className="text-muted-foreground">
                    This Zoho-like CRM module is part of the CRM suite, but isn&apos;t implemented yet.
                </p>
                <div className="mt-8 rounded-xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertCircleIcon className="size-5 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                            Add data models and UI flows here when you want full functionality.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

