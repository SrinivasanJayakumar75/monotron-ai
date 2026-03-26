import { CustomModuleRecordsView } from "@/modules/crm/ui/views/custom-module-records-view";

const Page = async ({
    params,
}: {
    params: Promise<{ slug: string }>;
}) => {
    const { slug } = await params;
    return <CustomModuleRecordsView slug={slug} />;
};

export default Page;

