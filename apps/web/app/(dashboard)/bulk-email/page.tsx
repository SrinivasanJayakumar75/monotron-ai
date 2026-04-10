import { PremiumFeatureOverlay } from "@/modules/billing/ui/components/premium-feature-overlay";
import { BulkEmailView } from "@/modules/dashboard/ui/views/bulk-email-view";
import { Protect } from "@clerk/nextjs";

const Page = () => {
    return (
        <Protect
            condition={(has) => has({ plan: "pro" })}
            fallback={
                <PremiumFeatureOverlay>
                    <BulkEmailView />
                </PremiumFeatureOverlay>
            }
        >
            <BulkEmailView />
        </Protect>
    );
};

export default Page;
