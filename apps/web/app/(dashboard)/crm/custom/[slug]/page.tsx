import { CustomModuleRecordsView } from "@/modules/crm/ui/views/custom-module-records-view";

const Page = ({ params }: { params: { slug: string } }) => {
    return <CustomModuleRecordsView slug={params.slug} />;
};

export default Page;

