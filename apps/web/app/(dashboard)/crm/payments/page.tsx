import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="payments"
            title="Payments"
            description="Store payment records and reconciliation statuses."
            statuses={["pending", "completed", "failed", "refunded"]}
        />
    );
};

export default Page;

