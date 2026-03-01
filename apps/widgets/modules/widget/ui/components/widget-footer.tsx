import { Button } from "@workspace/ui/components/button"
import { HomeIcon, InboxIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { useAtomValue, useSetAtom } from "jotai"
import { screenAtom } from "../../atoms/widget-atoms"

export const WidgetFooter = () => {
    const screen = useAtomValue(screenAtom);
    const setScreen = useSetAtom(screenAtom);

    return (
        <footer className="flex shrink-0 items-center justify-center gap-1 border-t border-[#e5e7eb] bg-[#fafafa] p-2">
            <Button
                className={cn(
                    "h-10 flex-1 rounded-lg text-[#6b7280] transition-colors",
                    screen === "selection" && "bg-white text-[#1f2937] shadow-sm"
                )}
                onClick={() => setScreen("selection")}
                size="icon"
                variant="ghost"
            >
                <HomeIcon className="size-5" />
            </Button>
            <Button
                className={cn(
                    "h-10 flex-1 rounded-lg text-[#6b7280] transition-colors",
                    screen === "inbox" && "bg-white text-[#1f2937] shadow-sm"
                )}
                onClick={() => setScreen("inbox")}
                size="icon"
                variant="ghost"
            >
                <InboxIcon className="size-5" />
            </Button>
        </footer>
    )
}