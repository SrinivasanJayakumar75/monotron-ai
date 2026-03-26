import { UnderConstructionView } from "@/modules/crm/ui/views/under-construction-view";
import { redirect } from "next/navigation";

const REMOVED_CRM_MODULE_SLUGS = new Set([
    "cases",
    "solutions",
    "webforms",
    "automation",
    "integrations",
    "pipeline",
]);

function prettyModuleName(module: string): string {
    const map: Record<string, string> = {
        products: "Products",
        quotes: "Quotes",
        orders: "Orders",
        invoices: "Invoices",
        payments: "Payments",
        contracts: "Contracts",
        documents: "Documents",
        approvals: "Approval Process",
        reports: "Reports",
        settings: "Settings",
    };

    return map[module] ?? module.charAt(0).toUpperCase() + module.slice(1);
}

const Page = ({ params }: { params: { module: string } }) => {
    if (params.module === "dashboards") {
        redirect("/dashboard");
    }
    if (REMOVED_CRM_MODULE_SLUGS.has(params.module)) {
        redirect("/crm");
    }
    return <UnderConstructionView title={prettyModuleName(params.module)} />;
};

export default Page;

