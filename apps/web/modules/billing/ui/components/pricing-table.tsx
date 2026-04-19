"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";
import { Check } from "lucide-react";
import Link from "next/link";

function buildCheckoutHref(orgId: string, email?: string | null): string | null {
    const productId = process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID;
    if (!productId) {
        return null;
    }
    // Use raw JSON here — URLSearchParams encodes once. Do not pre-encode or metadata
    // becomes double-encoded (%257B…) and Polar's JSON.parse(metadata) fails → HTTP 500.
    const params = new URLSearchParams();
    params.set("products", productId);
    params.set("customerExternalId", orgId);
    params.set("metadata", JSON.stringify({ clerk_organization_id: orgId }));
    if (email) {
        params.set("customerEmail", email);
    }
    return `/api/polar/checkout?${params.toString()}`;
}

export const PricingTable = () => {
    const { organization, isLoaded } = useOrganization();
    const { user } = useUser();
    const checkoutHref =
        organization?.id != null
            ? buildCheckoutHref(organization.id, user?.primaryEmailAddress?.emailAddress)
            : null;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-none border rounded-lg">
                <CardHeader className="bg-background">
                    <CardTitle>Starter</CardTitle>
                    <CardDescription>For individuals and small projects</CardDescription>
                </CardHeader>
                <CardContent className="bg-background space-y-4">
                    <div>
                        <span className="text-4xl font-bold">Free</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                        {[
                            "Dashboard live chat with website visitors",
                            "Human to human chat only",
                        ].map((text) => (
                            <li key={text} className="flex gap-2">
                                <Check className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <CardFooter className="bg-background">
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/dashboard">Back to dashboard</Link>
                    </Button>
                </CardFooter>
            </Card>

            <Card className="shadow-none border rounded-lg border-primary/50">
                <CardHeader className="bg-background">
                    <CardTitle>Pro</CardTitle>
                    <CardDescription>For growing teams — billed via Polar</CardDescription>
                </CardHeader>
                <CardContent className="bg-background space-y-4">
                    <div>
                        <span className="text-4xl font-bold">Paid</span>
                        <span className="text-muted-foreground ml-2">see Polar checkout</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                        {[
                            "AI responses and voice",
                            "CRM & bulk email",
                            "Knowledge base & team seats (up to 5)",
                        ].map((text) => (
                            <li key={text} className="flex gap-2">
                                <Check className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <CardFooter className="bg-background flex flex-col gap-2">
                    {!isLoaded ? (
                        <Button className="w-full" disabled size="lg">
                            Loading…
                        </Button>
                    ) : !organization?.id ? (
                        <Button className="w-full" asChild size="lg">
                            <Link href="/org-selection">Choose an organization</Link>
                        </Button>
                    ) : !checkoutHref ? (
                        <p className="text-sm text-muted-foreground text-center">
                            Set <span className="font-mono">NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID</span>{" "}
                            to your Polar product UUID to enable checkout.
                        </p>
                    ) : (
                        <Button className="w-full" asChild size="lg">
                            <Link href={checkoutHref}>Upgrade with Polar</Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};
