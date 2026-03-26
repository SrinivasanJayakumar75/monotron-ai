import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="approvals"
            title="Approval Process"
            description="Track approval requests for CRM records."
            statuses={["pending", "approved", "rejected", "cancelled"]}
        />
    );
};

export default Page;

