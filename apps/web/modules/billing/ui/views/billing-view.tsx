"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import Link from "next/link";
import { PricingTable } from "../components/pricing-table";
import { Button } from "@workspace/ui/components/button";

export const BillingView = () => {
    const { organization } = useOrganization();
    const pro = useQuery(
        api.public.subscriptions.proStatus,
        organization?.id ? { organizationId: organization.id } : "skip",
    );

    return (
        <div className="flex min-h-screen flex-col bg-muted p-8">
            <div className="mx-auto w-full max-w-screen-md">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-4xl">Plans & Billing</h1>
                    <p>Choose the plan that&apos;s right for your organization. Pro is billed through Polar.</p>
                </div>

                {pro?.isPro ? (
                    <div className="mt-6 rounded-lg border bg-card p-4 text-card-foreground">
                        <p className="font-medium">Your organization has an active Pro subscription.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage payment method and invoices in the Polar customer portal.
                        </p>
                        <Button className="mt-4" asChild variant="outline">
                            <Link href="/api/polar/portal">Open billing portal</Link>
                        </Button>
                    </div>
                ) : null}

                <div className="mt-8">
                    <PricingTable />
                </div>
            </div>
        </div>
    );
};
