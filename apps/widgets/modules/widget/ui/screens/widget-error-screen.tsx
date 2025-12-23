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
             <div className="flex px-1 py-1 font-semibold">
                <Image className="pe-2" src="/aiavatar.png" alt="Logo" width={50} height={30}/>
                <div className="flex flex-col">
                    <p className="font-semibold text-md">
                        Mona
                    </p>
                    <p className="text-sm">
                        AI Assistant
                    </p>
                    </div>
                </div>
        </WidgetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 text-muted-foreground">
            <AlertTriangleIcon/>
            <p className="text-sm">
                {errorMessage || "Invalid configuration"}
            </p>
        </div>
        </>
    )
}