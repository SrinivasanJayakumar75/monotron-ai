"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { type ReactNode } from "react";
import { PremiumFeatureOverlay } from "./premium-feature-overlay";

export const ProGate = ({ children }: { children: ReactNode }) => {
    const { organization, isLoaded: orgLoaded } = useOrganization();
    const pro = useQuery(
        api.public.subscriptions.proStatus,
        orgLoaded && organization?.id
            ? { organizationId: organization.id }
            : "skip",
    );

    if (!orgLoaded || pro === undefined) {
        return <div className="min-h-screen bg-muted" />;
    }

    if (!pro.isPro) {
        return <PremiumFeatureOverlay>{children}</PremiumFeatureOverlay>;
    }

    return <>{children}</>;
};
