import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="orders"
            title="Orders"
            description="Manage order lifecycle after quote acceptance."
            statuses={["new", "processing", "fulfilled", "cancelled"]}
        />
    );
};

export default Page;

