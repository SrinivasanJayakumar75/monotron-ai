"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { contactSessionIdAtomFamily, conversationIdAtom, errorMessageAtom, organizationIdAtom, screenAtom,widgetSettingsAtom,hasVapiSecretsAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { ChevronRightIcon, MessageSquareTextIcon, MicIcon, PhoneIcon, BookOpenIcon, NewspaperIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";
import { WidgetFooter } from "../components/widget-footer";
import Image from "next/image";

export const WidgetSelectionScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const setErrorMessage = useSetAtom(errorMessageAtom);
    const setConversationId = useSetAtom(conversationIdAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom);
    const hasVapiSecrets = useAtomValue(hasVapiSecretsAtom);
    const organizationId = useAtomValue(organizationIdAtom);
    const contactSessionId = useAtomValue(
        contactSessionIdAtomFamily(organizationId || "")
    );

    const createConversation = useMutation(api.public.conversations.create);
    const [isPending, setIsPending] = useState(false);

    const hasResources =
        (widgetSettings?.blogLinks &&
            widgetSettings.blogLinks.length > 0) ||
        (widgetSettings?.faqs && widgetSettings.faqs.length > 0);

    const hasNews =
        !!widgetSettings?.news && widgetSettings.news.length > 0;

    const accentColor = widgetSettings?.widgetColor || "#4F46E5";

    const handleNewConversation = async () => {
         

        if(!organizationId) {
            setScreen("error");
            setErrorMessage("Missing Organization Id");
            return;
        }

        if(!contactSessionId) {
            setScreen("auth");
            return;
        }

        setIsPending(true);
        try{
            const conversationId = await createConversation({
                contactSessionId,
                organizationId,
            });
            setConversationId(conversationId);
            setScreen("chat");
        } catch {
            setScreen("auth");
        } finally {
            setIsPending(false);
        }
    }
        
    const greetMessage = widgetSettings?.greetMessage || "Hi! How can we help?";

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
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f7f7f8] p-4">
                <p className="text-sm text-[#6b7280]">{greetMessage}</p>
                <div className="flex flex-col gap-2">
                    <Button
                        className="h-12 w-full justify-between rounded-xl border-0 px-4 text-white shadow-sm transition-shadow hover:opacity-95"
                        style={{ backgroundColor: accentColor }}
                        onClick={handleNewConversation}
                        disabled={isPending}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                                <MessageSquareTextIcon className="size-4" />
                            </div>
                            <span className="font-medium">Start a conversation</span>
                        </div>
                        <ChevronRightIcon className="size-4 opacity-80" />
                    </Button>
                    {hasVapiSecrets && widgetSettings?.vapiSettings?.assistantId && (
                        <Button
                            className="h-12 w-full justify-between rounded-xl border-0 bg-white px-4 shadow-sm transition-shadow hover:shadow-md"
                            variant="ghost"
                            onClick={() => setScreen("voice")}
                            disabled={isPending}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f3f4f6]">
                                    <MicIcon className="size-4 text-[#6b7280]" />
                                </div>
                                <span className="font-medium text-[#1f2937]">Start voice call</span>
                            </div>
                            <ChevronRightIcon className="size-4 text-[#9ca3af]" />
                        </Button>
                    )}
                    {hasVapiSecrets && widgetSettings?.vapiSettings?.phoneNumber && (
                        <Button
                            className="h-12 w-full justify-between rounded-xl border-0 bg-white px-4 shadow-sm transition-shadow hover:shadow-md"
                            variant="ghost"
                            onClick={() => setScreen("contact")}
                            disabled={isPending}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f3f4f6]">
                                    <PhoneIcon className="size-4 text-[#6b7280]" />
                                </div>
                                <span className="font-medium text-[#1f2937]">Call us</span>
                            </div>
                            <ChevronRightIcon className="size-4 text-[#9ca3af]" />
                        </Button>
                    )}
                    {hasResources && (
                        <Button
                            className="h-12 w-full justify-between rounded-xl border-0 bg-white px-4 shadow-sm transition-shadow hover:shadow-md"
                            variant="ghost"
                            onClick={() => setScreen("resources")}
                            disabled={isPending}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f3f4f6]">
                                    <BookOpenIcon className="size-4 text-[#6b7280]" />
                                </div>
                                <span className="font-medium text-[#1f2937]">Browse help & FAQs</span>
                            </div>
                            <ChevronRightIcon className="size-4 text-[#9ca3af]" />
                        </Button>
                    )}
                    {hasNews && (
                        <Button
                            className="h-12 w-full justify-between rounded-xl border-0 bg-white px-4 shadow-sm transition-shadow hover:shadow-md"
                            variant="ghost"
                            onClick={() => setScreen("news")}
                            disabled={isPending}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f3f4f6]">
                                    <NewspaperIcon className="size-4 text-[#6b7280]" />
                                </div>
                                <span className="font-medium text-[#1f2937]">Latest news & updates</span>
                            </div>
                            <ChevronRightIcon className="size-4 text-[#9ca3af]" />
                        </Button>
                    )}
                </div>
            </div>
            <WidgetFooter />
        </>
    )
}