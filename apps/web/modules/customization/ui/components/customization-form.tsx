import {z} from "zod";
import {useForm, useFieldArray} from "react-hook-form";
import {toast} from "sonner";
import {Button} from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@workspace/ui/components/form";
import {Textarea} from "@workspace/ui/components/textarea";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {FormSchema} from "../../types";
import {widgetSettingsSchema} from "../../schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@workspace/ui/components/separator";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
    Collapsible,
    CollapsibleContent,
} from "@workspace/ui/components/collapsible";
import { VapiFormFields } from "./vapi-form-fields";
import { PlusIcon, Trash2Icon } from "lucide-react";



type WidgetSettings = Doc<"widgetSettings">;

const QUICK_REPLY_PLACEHOLDERS = [
    "e.g., How do I get started?",
    "e.g., What are your pricing plans?",
    "e.g., I need help with my account",
    "e.g., Book a demo",
    "e.g., Talk to a human",
];

function initialQuickReplies(
    data: WidgetSettings | null | undefined
): { text: string }[] {
    const trimmed = (s: string | undefined) => (s ?? "").trim();
    const fromStored = data?.quickReplies
        ?.map((s) => trimmed(s))
        .filter((s) => s.length > 0);
    if (fromStored && fromStored.length > 0) {
        return fromStored.slice(0, 5).map((text) => ({ text }));
    }
    const legacy = [
        trimmed(data?.defaultSuggestions?.suggestion1),
        trimmed(data?.defaultSuggestions?.suggestion2),
        trimmed(data?.defaultSuggestions?.suggestion3),
    ].filter((s) => s.length > 0);
    if (legacy.length > 0) {
        return legacy.slice(0, 5).map((text) => ({ text }));
    }
    return [{ text: "" }];
}

interface CustomizationFormProps {
    initialData?: WidgetSettings | null;
    hasVapiPlugin: boolean
}

export const CustomizationForm = ({
    initialData,
    hasVapiPlugin

}: CustomizationFormProps) => {
    const upsertWidgetSettings = useMutation(api.private.widgetSettings.upsert);

    const form = useForm<FormSchema>({
        resolver: zodResolver(widgetSettingsSchema),
        defaultValues: {
            greetMessage:
            initialData?.greetMessage || "Hi! How can I help you today?",
            quickRepliesEnabled: initialData?.quickRepliesEnabled ?? true,
            quickReplies: initialQuickReplies(initialData ?? null),
            vapiSettings: {
                assistantId: initialData?.vapiSettings.assistantId || "",
                phoneNumber: initialData?.vapiSettings.phoneNumber || "",
            },
            widgetColor: initialData?.widgetColor || "#4F46E5",
            blogLinks:
                initialData?.blogLinks && initialData.blogLinks.length > 0
                    ? initialData.blogLinks
                    : [{ title: "", url: "" }],
            faqs:
                initialData?.faqs && initialData.faqs.length > 0
                    ? initialData.faqs
                    : [{ question: "", answer: "" }],
            news:
                initialData?.news && initialData.news.length > 0
                    ? initialData.news
                    : [
                          {
                              title: "",
                              description: "",
                              imageUrl: "",
                              link: "",
                          },
                      ],
        }
    })

    const blogLinksFields = useFieldArray({
        control: form.control,
        name: "blogLinks",
    })

    const faqsFields = useFieldArray({
        control: form.control,
        name: "faqs",
    })

    const newsFields = useFieldArray({
        control: form.control,
        name: "news",
    })

    const quickReplyFields = useFieldArray({
        control: form.control,
        name: "quickReplies",
    })

    const onSubmit = async(values: FormSchema) => {
        try{
            const normalizedBlogLinks: { title: string; url: string }[] =
                (values.blogLinks ?? [])
                    .map((b) => ({
                        title: (b.title ?? "").trim(),
                        url: (b.url ?? "").trim(),
                    }))
                    .filter((b) => b.title || b.url);

            const normalizedFaqs: { question: string; answer: string }[] =
                (values.faqs ?? [])
                    .map((f) => ({
                        question: (f.question ?? "").trim(),
                        answer: (f.answer ?? "").trim(),
                    }))
                    .filter((f) => f.question || f.answer);

            const normalizedNews: {
                title: string;
                description: string;
                imageUrl: string;
                link: string;
            }[] = (values.news ?? [])
                .map((n) => ({
                    title: (n.title ?? "").trim(),
                    description: (n.description ?? "").trim(),
                    imageUrl: (n.imageUrl ?? "").trim(),
                    link: (n.link ?? "").trim(),
                }))
                .filter(
                    (n) =>
                        n.title ||
                        n.description ||
                        n.imageUrl ||
                        n.link
                );

            const vapiSettings: WidgetSettings["vapiSettings"] = {
                assistantId:
                values.vapiSettings.assistantId === "none"
                ? ""
                : values.vapiSettings.assistantId,
                phoneNumber:
                values.vapiSettings.phoneNumber === "none"
                ? ""
                : values.vapiSettings.phoneNumber
            };
            const replyLines = values.quickReplies
                .map((row) => row.text.trim())
                .filter((s) => s.length > 0)
                .slice(0, 5);

            await upsertWidgetSettings({
                greetMessage: values.greetMessage,
                defaultSuggestions: {
                    suggestion1: replyLines[0],
                    suggestion2: replyLines[1],
                    suggestion3: replyLines[2],
                },
                quickReplies: values.quickReplies.map((r) => r.text),
                quickRepliesEnabled: values.quickRepliesEnabled,
                vapiSettings,
                widgetColor: values.widgetColor,
                blogLinks: normalizedBlogLinks,
                faqs: normalizedFaqs,
                news: normalizedNews,
            });

            toast.success("Widget settings saved");

        } catch(error){
            console.error(error);
            toast.error("Something went wrong");
        }
    }



    return (
        <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            General Chat Settings
                        </CardTitle>
                        <CardDescription>
                            Configure basic chat widget behaviour and messages
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                            <FormField
                            control={form.control}
                            name="greetMessage"
                            render={({field})=> (
                                <FormItem>
                                    <FormLabel>Greeting Message</FormLabel>
                                    <FormControl>
                                        <Textarea
                                        {...field}
                                        placeholder="Welcome message shown when chat open"
                                        rows={3}/>
                                    </FormControl>
                                    <FormDescription>
                                        The first message customers see when they open chat
                                    </FormDescription>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <Separator/>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="mb-4 text-sm">
                                        Widget color
                                    </h3>
                                    <p className="mb-4 text-muted-foreground text-sm">
                                        Accent color used in the widget selection screen.
                                    </p>
                                    <FormField
                                        control={form.control}
                                        name="widgetColor"
                                        render={({ field }) => (
                                            <FormItem className="max-w-xs">
                                                <FormLabel>Primary color</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="text"
                                                        placeholder="#4F46E5"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter a hex color (for example: #4F46E5).
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="mb-2 text-sm">
                                        News
                                    </h3>
                                    <p className="mb-4 text-muted-foreground text-sm">
                                        Announce product updates or important news with an optional image and link, shown in the widget&apos;s news center.
                                    </p>
                                    <div className="space-y-4">
                                        {newsFields.fields.map(
                                            (field, index) => (
                                                <div
                                                    key={field.id}
                                                    className="flex items-start gap-4"
                                                >
                                                    <div className="flex-1 space-y-3">
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`news.${index}.title`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Title
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            placeholder="e.g., New feature launch"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`news.${index}.description`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Description
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Textarea
                                                                            {...field}
                                                                            rows={3}
                                                                            placeholder="Short summary of the update that visitors will see in the widget."
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`news.${index}.imageUrl`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Image URL
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            placeholder="https://example.com/news-image.png"
                                                                        />
                                                                    </FormControl>
                                                                    <FormDescription>
                                                                        Public image URL to display with this news item.
                                                                    </FormDescription>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`news.${index}.link`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Optional link
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            placeholder="https://example.com/blog/post"
                                                                        />
                                                                    </FormControl>
                                                                    <FormDescription>
                                                                        Where visitors should go to learn more (optional).
                                                                    </FormDescription>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="mt-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            newsFields.remove(
                                                                index
                                                            )
                                                        }
                                                    >
                                                        <Trash2Icon className="size-4" />
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                newsFields.append({
                                                    title: "",
                                                    description: "",
                                                    imageUrl: "",
                                                    link: "",
                                                })
                                            }
                                        >
                                            <PlusIcon className="mr-2 size-4" />
                                            Add news item
                                        </Button>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium">
                                            Quick reply suggestions
                                        </h3>
                                        <p className="mt-1 text-muted-foreground text-sm">
                                            Optional chips after the first assistant message. Visitors tap one to send it
                                            instantly. Add up to five, in the order you want them to appear.
                                        </p>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="quickRepliesEnabled"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                                                <div className="space-y-1 pr-2">
                                                    <FormLabel className="text-sm font-medium">
                                                        Show suggestions in the widget
                                                    </FormLabel>
                                                    <FormDescription className="text-xs">
                                                        Turn off to hide chips while keeping your text below for later.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked);
                                                            if (
                                                                checked &&
                                                                form.getValues("quickReplies")
                                                                    .length === 0
                                                            ) {
                                                                quickReplyFields.append({
                                                                    text: "",
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <Collapsible open={form.watch("quickRepliesEnabled")}>
                                        <CollapsibleContent className="space-y-4">
                                            <p className="text-muted-foreground text-xs">
                                                {quickReplyFields.fields.length} of 5 — first chip appears on the left
                                                (or top on small screens).
                                            </p>
                                            <div className="space-y-3">
                                                {quickReplyFields.fields.map(
                                                    (arrField, index) => (
                                                        <div
                                                            key={arrField.id}
                                                            className="flex items-start gap-3"
                                                        >
                                                            <span
                                                                className="mt-2.5 w-6 shrink-0 text-center text-muted-foreground text-xs tabular-nums"
                                                                aria-hidden
                                                            >
                                                                {index + 1}
                                                            </span>
                                                            <FormField
                                                                control={
                                                                    form.control
                                                                }
                                                                name={`quickReplies.${index}.text`}
                                                                render={({
                                                                    field,
                                                                }) => (
                                                                    <FormItem className="flex-1">
                                                                        <FormLabel className="sr-only">
                                                                            Suggestion{" "}
                                                                            {index + 1}
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                {...field}
                                                                                placeholder={
                                                                                    QUICK_REPLY_PLACEHOLDERS[
                                                                                        index
                                                                                    ] ??
                                                                                    "Short reply text"
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                                                                onClick={() =>
                                                                    quickReplyFields.remove(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                <Trash2Icon className="size-4" />
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                            {quickReplyFields.fields.length <
                                                5 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        quickReplyFields.append({
                                                            text: "",
                                                        })
                                                    }
                                                >
                                                    <PlusIcon className="mr-2 size-4" />
                                                    Add suggestion
                                                </Button>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="mb-2 text-sm">
                                        Blog Links
                                    </h3>
                                    <p className="mb-4 text-muted-foreground text-sm">
                                        Highlight key blog posts or documentation pages that visitors can open from the widget. Add as many as you need.
                                    </p>
                                    <div className="space-y-4">
                                        {blogLinksFields.fields.map(
                                            (field, index) => (
                                                <div
                                                    key={field.id}
                                                    className="flex gap-4 items-start"
                                                >
                                                    <div className="grid flex-1 gap-4 md:grid-cols-2">
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`blogLinks.${index}.title`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Title
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            placeholder="e.g., Getting started guide"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`blogLinks.${index}.url`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        URL
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            placeholder="https://example.com/blog/getting-started"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="mt-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            blogLinksFields.remove(index)
                                                        }
                                                    >
                                                        <Trash2Icon className="size-4" />
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                blogLinksFields.append({
                                                    title: "",
                                                    url: "",
                                                })
                                            }
                                        >
                                            <PlusIcon className="mr-2 size-4" />
                                            Add blog link
                                        </Button>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="mb-2 text-sm">
                                        FAQs
                                    </h3>
                                    <p className="mb-4 text-muted-foreground text-sm">
                                        Common questions and answers shown in a dedicated FAQs section inside the widget. Add as many as you need.
                                    </p>
                                    <div className="space-y-4">
                                        {faqsFields.fields.map(
                                            (field, index) => (
                                                <div
                                                    key={field.id}
                                                    className="flex gap-4 items-start"
                                                >
                                                    <div className="flex-1 space-y-3">
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`faqs.${index}.question`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Question
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            {...field}
                                                                            placeholder="e.g., How do I cancel my subscription?"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={
                                                                form.control
                                                            }
                                                            name={`faqs.${index}.answer`}
                                                            render={({
                                                                field,
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Answer
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Textarea
                                                                            {...field}
                                                                            rows={3}
                                                                            placeholder="Explain the steps or link to the relevant help page."
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="mt-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            faqsFields.remove(index)
                                                        }
                                                    >
                                                        <Trash2Icon className="size-4" />
                                                    </Button>
                                                </div>
                                            )
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                faqsFields.append({
                                                    question: "",
                                                    answer: "",
                                                })
                                            }
                                        >
                                            <PlusIcon className="mr-2 size-4" />
                                            Add FAQ
                                        </Button>
                                    </div>
                                </div>

                            </div>

                    </CardContent>
                </Card>
                {hasVapiPlugin && (
                    <Card>
                        <CardHeader>
                        <CardTitle>
                            Voice Assistant Settings
                        </CardTitle>
                        <CardDescription>
                            Configure voice calling features powered by Vapi
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <VapiFormFields
                        form={form}/>


                    </CardContent>

                    </Card>
                )}

                <div className="flex justify-end">   
                    <Button disabled={form.formState.isSubmitting} type="submit">
                        Save Settings
                    </Button>
                </div>



            </form>

        </Form>

    )
}