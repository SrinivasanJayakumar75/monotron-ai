"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon } from "lucide-react";
import { contactSessionIdAtomFamily, conversationIdAtom, errorMessageAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { WidgetFooter } from "../components/widget-footer";
import { Button } from "@workspace/ui/components/button";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {formatDistanceToNow} from "date-fns";
import { UseInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import {ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";

export const WidgetInboxScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const setConversationId = useSetAtom(conversationIdAtom);
    const organizationId = useAtomValue(organizationIdAtom);
    const contactSessionId = useAtomValue(
        contactSessionIdAtomFamily(organizationId || ""),
    )

    const conversations = usePaginatedQuery(
        api.public.conversations.getMany,
        contactSessionId 
        ? {
            contactSessionId,
        }
        : "skip",
        {
            initialNumItems: 10,
        }
    )
    const {topElementRef, handleLoadMore, canLoadMore, isLoadingMore} = UseInfiniteScroll(
            {status: conversations.status,
            loadMore: conversations.loadMore,
            loadSize: 10,
            }
        );
    


    return (
        <>
        <WidgetHeader>
            <div className="flex items-center gap-x-2">
                <Button variant="ghost" size="icon" className="text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]" onClick={()=>setScreen("selection")}>
                    <ArrowLeftIcon/>
                </Button>
                <p className="text-sm font-medium text-[#1f2937]">Inbox</p>
            </div>
        </WidgetHeader>
        <div className="flex flex-1 flex-col gap-y-2 bg-[#f7f7f8] p-4 overflow-y-auto">
           {conversations?.results.length > 0 && conversations?.results.map((conversation)=>(
            <Button
            className="h-20 w-full justify-between rounded-xl border-0 bg-white shadow-sm hover:shadow-md"
            key={conversation._id}
            onClick={() => {
                setConversationId(conversation._id)
                setScreen("chat")
            }}
            variant="ghost">
                <div className="flex w-full flex-col gap-4 overflow-hidden text-start">
                    <div className="flex w-full items-center justify-between gap-x-2">
                        <p className="text-muted-foreground text-xs">Chat</p>
                        <p className="text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(conversation._creationTime))}
                        </p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-x-2">
                        <p className="truncate text-sm">
                            {conversation.lastMessage?.text}
                        </p>
                        <ConversationStatusIcon status={conversation.status} className="shrink-0"/>
                    </div>
                </div>
            </Button>
           ))}
           <InfiniteScrollTrigger
           canLoadMore={canLoadMore}
           isLoadingMore={isLoadingMore}
           onLoadMore={handleLoadMore}
           ref={topElementRef}
           />
        </div>
        <WidgetFooter/>
        </>
    )
}