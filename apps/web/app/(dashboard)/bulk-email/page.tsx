import { ProGate } from "@/modules/billing/ui/components/pro-gate";
import { BulkEmailView } from "@/modules/dashboard/ui/views/bulk-email-view";

const Page = () => {
    return (
        <ProGate>
            <BulkEmailView />
        </ProGate>
    );
};

export default Page;
