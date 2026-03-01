"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ArrowLeftIcon, BookOpenIcon, HelpCircleIcon } from "lucide-react";
import Link from "next/link";

export const WidgetResourcesScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom);

    const blogLinks = widgetSettings?.blogLinks ?? [];
    const faqs = widgetSettings?.faqs ?? [];

    const hasBlogs = blogLinks.length > 0;
    const hasFaqs = faqs.length > 0;

    const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
    const [faqSearch, setFaqSearch] = useState("");

    const activeFaq =
        activeFaqIndex !== null && faqs[activeFaqIndex]
            ? faqs[activeFaqIndex]
            : null;

    const showFaqDetail = hasFaqs && activeFaq;

    const filteredFaqs = faqs.filter((faq) => {
        if (!faq.question && !faq.answer) return false;
        if (!faqSearch.trim()) return true;

        const term = faqSearch.toLowerCase();
        return (
            (faq.question ?? "").toLowerCase().includes(term) ||
            (faq.answer ?? "").toLowerCase().includes(term)
        );
    });

    return (
        <>
            <WidgetHeader>
                <div className="flex items-center gap-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1f2937]"
                        onClick={() => {
                            if (showFaqDetail) {
                                setActiveFaqIndex(null);
                            } else {
                                setScreen("selection");
                            }
                        }}
                    >
                        <ArrowLeftIcon />
                    </Button>
                    <p className="text-sm font-medium text-[#1f2937]">{showFaqDetail ? "FAQ" : "Help resources"}</p>
                </div>
            </WidgetHeader>

            <div className="flex flex-1 flex-col overflow-y-auto bg-[#f7f7f8] p-4">
                {showFaqDetail ? (
                    <div className="flex flex-1 flex-col gap-y-3 rounded-xl bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-[#1f2937]">
                            {activeFaq?.question}
                        </p>
                        {activeFaq?.answer && (
                            <p className="whitespace-pre-line text-sm text-[#6b7280]">
                                {activeFaq.answer}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col gap-y-6">
                        {hasBlogs && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-x-2">
                                    <BookOpenIcon className="size-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold">
                                        Blog posts & articles
                                    </h2>
                                </div>
                                <div className="space-y-2">
                                    {blogLinks.map((blog, index) => {
                                        if (!blog.title && !blog.url) {
                                            return null;
                                        }

                                        return (
                                            <Button
                                                key={`${blog.url}-${index}`}
                                                asChild
                                                variant="ghost"
                                                className="h-auto w-full justify-between rounded-xl border-0 bg-white py-2.5 shadow-sm hover:shadow-md"
                                            >
                                                <Link
                                                    href={blog.url || "#"}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <span className="text-left text-sm">
                                                        {blog.title ||
                                                            blog.url}
                                                    </span>
                                                </Link>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {hasFaqs && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-x-2">
                                    <HelpCircleIcon className="size-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold">
                                        Frequently asked questions
                                    </h2>
                                </div>

                                <Input
                                    value={faqSearch}
                                    onChange={(e) =>
                                        setFaqSearch(e.target.value)
                                    }
                                    placeholder="Search FAQs..."
                                    className="h-9 rounded-lg border-[#e5e7eb] bg-white text-sm"
                                />

                                <div className="space-y-2">
                                    {filteredFaqs.map((faq, index) => {
                                        if (!faq.question && !faq.answer) {
                                            return null;
                                        }

                                        return (
                                            <Button
                                                key={`${faq.question}-${index}`}
                                                variant="ghost"
                                                className="h-auto w-full justify-between rounded-xl border-0 bg-white py-2.5 text-left shadow-sm hover:shadow-md"
                                                onClick={() =>
                                                    setActiveFaqIndex(
                                                        faqs.indexOf(faq)
                                                    )
                                                }
                                            >
                                                <span className="text-sm">
                                                    {faq.question}
                                                </span>
                                            </Button>
                                        );
                                    })}

                                    {filteredFaqs.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            No FAQs match your search.
                                        </p>
                                    )}
                                </div>
                            </section>
                        )}

                        {!hasBlogs && !hasFaqs && (
                            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
                                No blog links or FAQs have been configured yet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
