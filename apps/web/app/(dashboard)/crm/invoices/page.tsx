import { CrmModuleItemsView } from "@/modules/crm/ui/views/crm-module-items-view";

const Page = () => {
    return (
        <CrmModuleItemsView
            module="invoices"
            title="Invoices"
            description="Track billing documents and payment progress."
            statuses={["draft", "sent", "paid", "overdue", "void"]}
        />
    );
};

export default Page;

