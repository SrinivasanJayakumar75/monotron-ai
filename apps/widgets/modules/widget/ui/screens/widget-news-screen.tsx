"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeftIcon, NewspaperIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export const WidgetNewsScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom);

    const news = widgetSettings?.news ?? [];
    const hasNews = news.length > 0;

    const [activeNewsIndex, setActiveNewsIndex] = useState<number | null>(null);

    const activeNews =
        activeNewsIndex !== null && news[activeNewsIndex]
            ? news[activeNewsIndex]
            : null;

    const showNewsDetail = !!activeNews;

    return (
        <>
            <WidgetHeader>
                <div className="flex items-center gap-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]"
                        onClick={() => {
                            if (showNewsDetail) {
                                setActiveNewsIndex(null);
                            } else {
                                setScreen("selection");
                            }
                        }}
                    >
                        <ArrowLeftIcon />
                    </Button>
                    <p className="text-sm font-medium text-[#1f2937]">
                        {showNewsDetail ? "News" : "Latest news"}
                    </p>
                </div>
            </WidgetHeader>

            <div className="flex flex-1 flex-col overflow-y-auto bg-[#f7f7f8] p-4">
                {!hasNews ? (
                    <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                        No news items have been configured yet.
                    </div>
                ) : showNewsDetail && activeNews ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-y-3 rounded-xl bg-white p-4 shadow-sm">
                        {activeNews.imageUrl && (
                            <div className="mb-2 overflow-hidden rounded-lg bg-[#f3f4f6]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={activeNews.imageUrl}
                                    alt={activeNews.title}
                                    className="h-40 w-full object-cover"
                                />
                            </div>
                        )}
                        <p className="break-words text-sm font-semibold text-[#1f2937] [overflow-wrap:anywhere]">
                            {activeNews.title}
                        </p>
                        {activeNews.description && (
                            <p className="whitespace-pre-line break-words text-sm text-[#6b7280] [overflow-wrap:anywhere]">
                                {activeNews.description}
                            </p>
                        )}
                        {activeNews.link && (
                            <div className="pt-2">
                                <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 rounded-lg text-xs"
                                >
                                    <Link
                                        href={activeNews.link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLinkIcon className="size-3" />
                                        Read more
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col gap-y-3">
                        <section className="space-y-3">
                            <div className="flex items-center gap-x-2">
                                <NewspaperIcon className="size-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">
                                    News & updates
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {news.map((item, index) => {
                                    if (
                                        !item.title &&
                                        !item.description &&
                                        !item.imageUrl
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <Button
                                            key={`${item.title}-${index}`}
                                            variant="ghost"
                                            className="flex h-auto w-full min-w-0 justify-between overflow-hidden rounded-xl border-0 bg-white p-3 text-left shadow-sm hover:shadow-md"
                                            onClick={() =>
                                                setActiveNewsIndex(index)
                                            }
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                {item.imageUrl && (
                                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.title}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <p className="line-clamp-1 break-words text-sm font-medium text-[#111827] [overflow-wrap:anywhere]">
                                                        {item.title || "News"}
                                                    </p>
                                                    {item.description && (
                                                        <p className="line-clamp-2 break-words text-xs text-[#6b7280] [overflow-wrap:anywhere]">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </>
    );
};

