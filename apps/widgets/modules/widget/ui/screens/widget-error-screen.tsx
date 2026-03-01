"use client";

import { useAtomValue } from "jotai";
import { AlertTriangleIcon } from "lucide-react";
import { errorMessageAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import Image from "next/image";

export const WidgetErrorScreen = () => {
    const errorMessage = useAtomValue(errorMessageAtom);


    return (
        <>
        <WidgetHeader>
            <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-[#f3f4f6]">
                    <Image src="/aiavatar.png" alt="Logo" width={28} height={28} className="object-cover" />
                </div>
                <div className="flex flex-col">
                    <p className="text-sm font-semibold text-[#1f2937]">Mona</p>
                    <p className="text-xs text-[#6b7280]">AI Assistant</p>
                </div>
            </div>
        </WidgetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-y-4 bg-[#f7f7f8] p-4 text-[#6b7280]">
            <AlertTriangleIcon/>
            <p className="text-sm">
                {errorMessage || "Invalid configuration"}
            </p>
        </div>
        </>
    )
}