import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="contracts"
            title="Contracts"
            description="Manage contract records and key renewal/expiry dates."
            statuses={["draft", "under_review", "active", "expired", "terminated"]}
        />
    );
};

export default Page;

