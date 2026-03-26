"use client";

import { api } from "@workspace/backend/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { MailIcon, LogOutIcon } from "lucide-react";

export function GoogleIntegrationCard() {
    const connection = useQuery(api.private.googleIntegration.getConnection);
    const disconnect = useMutation(api.private.googleIntegration.disconnectGoogle);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const q = new URLSearchParams(window.location.search);
        if (q.get("google_connected")) {
            toast.success("Google connected. Bulk email will send from this mailbox.");
            window.history.replaceState({}, "", "/integrations");
        }
        const err = q.get("google_error");
        if (err) {
            try {
                toast.error(decodeURIComponent(err));
            } catch {
                toast.error(err);
            }
            window.history.replaceState({}, "", "/integrations");
        }
    }, []);

    const isLoading = connection === undefined;

    return (
        <div className="rounded-lg border bg-background p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                    <div className="bg-muted flex size-10 items-center justify-center rounded-md">
                        <MailIcon className="text-muted-foreground size-5" aria-hidden />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-base font-medium">Google (Gmail)</Label>
                        <p className="text-muted-foreground text-sm">
                            Connect your Google account to send bulk email from the dashboard. Tokens are stored
                            securely; you can disconnect anytime.
                        </p>
                        {connection ? (
                            <p className="text-sm">
                                Connected as{" "}
                                <span className="font-medium">{connection.email ?? connection.secretName}</span>
                            </p>
                        ) : isLoading ? (
                            <p className="text-muted-foreground text-sm">Checking connection…</p>
                        ) : (
                            <p className="text-muted-foreground text-sm">Not connected</p>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {connection ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={isLoading}
                            onClick={() =>
                                void (async () => {
                                    try {
                                        await disconnect();
                                        toast.success("Google disconnected");
                                    } catch (e) {
                                        toast.error(e instanceof Error ? e.message : "Disconnect failed");
                                    }
                                })()
                            }
                        >
                            <LogOutIcon className="size-4" />
                            Disconnect
                        </Button>
                    ) : (
                        <Button type="button" size="sm" asChild disabled={isLoading}>
                            <a href="/api/integrations/google/start">Connect with Google</a>
                        </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" asChild>
                        <Link href="/bulk-email">Bulk email</Link>
                    </Button>
                </div>
            </div>
            {!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ? (
                <p className="text-destructive mt-3 text-xs">
                    Set NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID in the web app environment for the connect button to work.
                </p>
            ) : null}
        </div>
    );
}
