import {ArrowLeftIcon, MicIcon, MicOffIcon} from "lucide-react";
import {Button} from "@workspace/ui/components/button";
import {
    AIConversation,
    AIConversationContent,
    AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";

import {
    AIMessage,
    AIMessageContent,
} from "@workspace/ui/components/ai/message";
import {useVapi} from "@/modules/widget/hooks/use-vapi";
import {WidgetHeader} from "@/modules/widget/ui/components/widget-header";
import { useSetAtom } from "jotai";
import { screenAtom } from "../../atoms/widget-atoms";
import { WidgetFooter } from "../components/widget-footer";
import {cn} from "@workspace/ui/lib/utils";

export const WidgetVoiceScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const {
        isConnected,
        isSpeaking,
        transcript,
        startCall,
        endCall,
        isConnecting,
    } = useVapi();

    return (
        <>
        <WidgetHeader>
            <div className="flex items-center gap-x-2">
                <Button variant="ghost" size="icon" className="text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]" onClick={()=>setScreen("selection")}>
                    <ArrowLeftIcon/>
                </Button>
                <p className="text-sm font-medium text-[#1f2937]">Voice Chat</p>
            </div>
        </WidgetHeader>
        {transcript.length > 0 ?(
            <AIConversation className="h-full bg-[#f7f7f8]">
                <AIConversationContent>
                    {transcript.map((message, index)=> (
                        <AIMessage 
                        from={message.role}
                        key={`${message.role}-${index}-${message.text}`}>
                            <AIMessageContent>{message.text}</AIMessageContent>

                        </AIMessage>
                    ))}
                </AIConversationContent>
                <AIConversationScrollButton/>

            </AIConversation>
        ):(
        <div className="flex flex-1 h-full flex-col items-center justify-center gap-y-4 bg-[#f7f7f8]">
            <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
                <MicIcon className="size-7 text-[#6b7280]"/>
            </div>
            <p className="text-sm text-[#6b7280]">Transcript will appear here</p>
        </div>
        )}
        <div className="border-t border-[#e5e7eb] bg-white p-4">
            <div className="flex flex-col items-center gap-y-4">
                {isConnected && (
                <div className="flex items-center gap-x-2">
                    <div className={cn("size-4 rounded-full",
                        isSpeaking ? "animate-pulse bg-red-500" : "bg-green-500"
                    )}/>   
                    <span className="text-sm text-[#6b7280]">
                        {isSpeaking ? "Assistant Speaking..." : "Listening..."}
                    </span>
                </div>
                )}
                <div className="flex w-full justify-center">
                    {isConnected ? (
                        <Button
                        className="w-full rounded-xl"
                        size="lg"
                        variant="destructive"
                        onClick={() => endCall()}>
                            <MicOffIcon/>
                            End Call
                        </Button>
                    ): (
                        <Button
                        className="w-full"
                        disabled={isConnecting}
                        size="lg"
                        onClick={()=> startCall()}>
                            <MicIcon/>
                            Start Call
                        </Button>
                    )}

                </div>
            </div>

        </div>
       
        </>
    )
}