import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="products"
            title="Products"
            description="Maintain product catalog entries used across CRM sales modules."
            statuses={["active", "inactive"]}
        />
    );
};

export default Page;

