"use client";

import { screenAtom } from "../../atoms/widget-atoms";
import { WidgetFooter } from "../components/widget-footer";
import { WidgetHeader } from "../components/widget-header";
import { WidgetAuthScreen } from "../screens/widget-auth-screen";
import { useAtomValue } from "jotai";
import { WidgetErrorScreen } from "../screens/widget-error-screen";
import { WidgetLoadingScreen } from "../screens/widget-loading-screen";
import { WidgetSelectionScreen } from "../screens/widget-selection-screen";
import { WidgetChatScreen } from "../screens/widget-chat-screen";
import { WidgetInboxScreen } from "../screens/widget-inbox-screen";
import { WidgetVoiceScreen } from "../screens/widget-voice-screen";
import { WidgetContactScreen } from "../screens/widget-contact-screen";
import { WidgetResourcesScreen } from "../screens/widget-resources-screen";

interface Props {
    organizationId: string | null;
};

export const WidgetView = ({ organizationId }: Props) => {
    const screen = useAtomValue(screenAtom);

    const screenComponents = {
        loading: <WidgetLoadingScreen organizationId={organizationId}/>,
        error: <WidgetErrorScreen/>,
        auth: <WidgetAuthScreen/>,
        voice: <WidgetVoiceScreen/>,
        inbox: <WidgetInboxScreen/>,
        selection: <WidgetSelectionScreen/>,
        chat: <WidgetChatScreen/>,
        contact: <WidgetContactScreen/>,
        resources: <WidgetResourcesScreen/>,
    }


    return (
        <main className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            {screenComponents[screen]}
        </main>
    )

}