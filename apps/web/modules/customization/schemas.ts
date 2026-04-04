import { z } from "zod";

export const widgetSettingsSchema = z.object({
    greetMessage: z.string().min(1, "Greeting message is required"),
    quickRepliesEnabled: z.boolean(),
    /** Up to 5 lines; order is shown left-to-right in the widget. */
    quickReplies: z
        .array(
            z.object({
                text: z.string(),
            })
        )
        .max(5, "At most 5 suggestions"),
    vapiSettings: z.object({
        assistantId: z.string().optional(),
        phoneNumber: z.string().optional(),
    }),
    widgetColor: z.string().optional(),
    blogLinks: z
        .array(
            z.object({
                title: z.string().optional(),
                url: z.string().optional(),
            })
        )
        .optional(),
    faqs: z
        .array(
            z.object({
                question: z.string().optional(),
                answer: z.string().optional(),
            })
        )
        .optional(),
    news: z
        .array(
            z.object({
                title: z.string().optional(),
                description: z.string().optional(),
                imageUrl: z.string().optional(),
                link: z.string().optional(),
            })
        )
        .optional(),
})