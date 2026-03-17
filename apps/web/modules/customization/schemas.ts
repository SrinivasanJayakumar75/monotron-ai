import { z } from "zod";

export const widgetSettingsSchema = z.object({
    greetMessage: z.string().min(1, "Greeting message is required"),
    defaultSuggestions: z.object({
        suggestion1: z.string().optional(),
        suggestion2: z.string().optional(),
        suggestion3: z.string().optional(),
    }),
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