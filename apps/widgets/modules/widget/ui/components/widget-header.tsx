import { cn } from "@workspace/ui/lib/utils";

export const WidgetHeader = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <header
            className={cn(
                "flex shrink-0 items-center border-b border-[#e5e7eb] bg-white px-3 py-2.5 text-[#1f2937]",
                className
            )}
        >
            {children}
        </header>
    );
};