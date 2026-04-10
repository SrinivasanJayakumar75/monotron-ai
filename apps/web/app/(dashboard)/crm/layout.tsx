import { PremiumFeatureOverlay } from "@/modules/billing/ui/components/premium-feature-overlay";
import { Protect } from "@clerk/nextjs";

export default function CrmLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Protect
            condition={(has) => has({ plan: "pro" })}
            fallback={<PremiumFeatureOverlay>{children}</PremiumFeatureOverlay>}
        >
            {children}
        </Protect>
    );
}
