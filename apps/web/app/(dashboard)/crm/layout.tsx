import { ProGate } from "@/modules/billing/ui/components/pro-gate";

export default function CrmLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProGate>{children}</ProGate>;
}
