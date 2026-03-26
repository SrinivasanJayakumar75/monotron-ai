import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="quotes"
            title="Quotes"
            description="Create and track quote records."
            statuses={["draft", "sent", "accepted", "rejected", "expired"]}
        />
    );
};

export default Page;

