"use client";

import { useOrganization } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Check } from "lucide-react";

export const PricingTable = () => {
    const { organization } = useOrganization();

    const handleCheckout = async (productId: string) => {
        // Redirect to Polar checkout with organization metadata
        const checkoutUrl = `/api/polar/checkout?product_id=${productId}&metadata[organizationId]=${organization?.id}`;
        window.location.href = checkoutUrl;
    };

    const handleManageSubscription = () => {
        window.location.href = "/api/polar/portal";
    };

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Free Plan */}
            <Card>
                <CardHeader>
                    <CardTitle>Free</CardTitle>
                    <CardDescription>Perfect for getting started</CardDescription>
                    <div className="mt-4">
                        <span className="text-4xl font-bold">$0</span>
                        <span className="text-muted-foreground">/month</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Dashboard Chat</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Send Email</span>
                        </li>
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" variant="outline" disabled>
                        Current Plan
                    </Button>
                </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className="border-primary">
                <CardHeader>
                    <CardTitle>Pro</CardTitle>
                    <CardDescription>For growing teams</CardDescription>
                    <div className="mt-4">
                        <span className="text-4xl font-bold">$4</span>
                        <span className="text-muted-foreground">/month</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">

                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>AI Response</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>AI Voice Calling</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Knowledge Base</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Dashboard Chat</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Know Customer Details</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            <span>Send Email</span>
                        </li>
                        
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full" 
                        onClick={() => handleCheckout("your_polar_product_id")}
                    >
                        Upgrade to Pro
                    </Button>
                </CardFooter>
            </Card>

            
        </div>
    );
};