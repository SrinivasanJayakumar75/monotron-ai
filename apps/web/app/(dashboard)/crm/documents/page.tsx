import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="documents"
            title="Documents"
            description="Track CRM documents and references."
            statuses={["draft", "published", "archived"]}
        />
    );
};

export default Page;

