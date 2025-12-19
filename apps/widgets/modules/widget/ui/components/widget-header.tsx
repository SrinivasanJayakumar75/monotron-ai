import { cn } from "@workspace/ui/lib/utils";


export const WidgetHeader = ({
    children,
    className,
}:{
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <header className={cn(
            "bg-gradient-to-b from-[#00152e] to-[#002855] p-2 text-primary-foreground",
            className,
        )}>
            {children}
        </header>
    );
};