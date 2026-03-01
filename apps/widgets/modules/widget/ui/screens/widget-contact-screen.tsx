import {ArrowLeftIcon, CheckIcon, CopyIcon, MicIcon, MicOffIcon, PhoneCallIcon, PhoneIcon} from "lucide-react";
import {Button} from "@workspace/ui/components/button";

import {useVapi} from "@/modules/widget/hooks/use-vapi";
import {WidgetHeader} from "@/modules/widget/ui/components/widget-header";
import { useAtomValue, useSetAtom } from "jotai";
import { screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { WidgetFooter } from "../components/widget-footer";
import {cn} from "@workspace/ui/lib/utils";
import { useState } from "react";
import Link from "next/link";

export const WidgetContactScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom);
    const phoneNumber = widgetSettings?.vapiSettings?.phoneNumber;

    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        if(!phoneNumber){
            return;
        }
        try{

        await navigator.clipboard.writeText(phoneNumber);
        setCopied(true); 
        } catch(error){
            console.error(error); 
        }finally{
            setTimeout(()=> setCopied(false), 2000);
        }
    };
    

    return (
        <>
        <WidgetHeader>
            <div className="flex items-center gap-x-2">
                <Button variant="ghost" size="icon" className="text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]" onClick={()=>setScreen("selection")}>
                    <ArrowLeftIcon/>
                </Button>
                <p className="text-sm font-medium text-[#1f2937]">Contact us</p>
            </div>
        </WidgetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-y-4 bg-[#f7f7f8]">
            <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
                <PhoneIcon className="size-7 text-[#6b7280]"/>
            </div>
            <p className="text-sm text-[#6b7280]">Available 24/7</p>
            <p className="text-xl font-semibold text-[#1f2937]">{phoneNumber}</p>
        </div>
        <div className="border-t border-[#e5e7eb] bg-white p-4">
            <div className="flex flex-col gap-2">
                <Button
                    className="w-full rounded-xl"
                    onClick={handleCopy}
                    size="lg"
                    variant="outline"
                >
                    {copied ? (
                        <>
                            <CheckIcon className="mr-2 size-4"/>
                            Copied!
                        </>
                    ) : (
                        <>
                            <CopyIcon className="mr-2 size-4"/>
                        </>
                    )}
                </Button>
                <Button asChild className="w-full rounded-xl" size="lg">
                    <Link href={`tel:${phoneNumber}`}>
                        <PhoneCallIcon className="mr-2"/>
                        Call Now
                    </Link>
                </Button>
            </div>
        </div>

       
        </>
    )
}