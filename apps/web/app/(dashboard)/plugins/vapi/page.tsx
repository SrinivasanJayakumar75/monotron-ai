import { ProGate } from "@/modules/billing/ui/components/pro-gate";
import { VapiView } from "@/modules/plugins/ui/views/vapi-view";

const Page = () => {
    return (
        <ProGate>
            <VapiView />
        </ProGate>
    );
};

export default Page;
