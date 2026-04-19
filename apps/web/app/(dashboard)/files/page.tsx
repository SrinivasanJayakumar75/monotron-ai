import { ProGate } from "@/modules/billing/ui/components/pro-gate";
import { FilesView } from "@/modules/files/ui/views/files-view";

const Page = () => {
    return (
        <ProGate>
            <FilesView />
        </ProGate>
    );
};

export default Page;
