import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { WidgetHeader } from "../components/widget-header";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { useAtomValue, useSetAtom } from "jotai";
import { contactSessionIdAtomFamily, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
});

import Image from "next/image";


export const WidgetAuthScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const organizationId = useAtomValue(organizationIdAtom);
    const setContactSessionId = useSetAtom(
        contactSessionIdAtomFamily(organizationId || "")
    )


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
        }
    });

    const createContactSession = useMutation(api.public.contactSessions.create);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if(!organizationId){
            return;
        }
        const metadata: Doc<"contactSessions">["metadata"] = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages?.join(","),
            platform: navigator.platform,
            vendor: navigator.vendor,
            screenResolution: `${screen.width}*${screen.height}`,
            viewportSize: `${window.innerWidth}*${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, 
            timezoneOffset: new Date().getTimezoneOffset(),
            cookieEnabled: navigator.cookieEnabled,
            referrer: document.referrer || "direct",
            currentUrl: window.location.href,
        };
        const contactSessionId = await createContactSession({
            ...values,
            organizationId,
            metadata,
        });
        setContactSessionId(contactSessionId);
        setScreen("selection");
    }
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
            <Form {...form}>
                <form className="flex flex-1 flex-col gap-y-4 bg-[#f7f7f8] p-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField 
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input className="h-10 border-[#e5e7eb] bg-white"
                                placeholder="e.g. John Doe"
                                type="text"
                                {...field}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}>
                    </FormField>  
                    <FormField 
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input className="h-10 border-[#e5e7eb] bg-white"
                                placeholder="e.g. john.doe@example.com"
                                type="email"
                                {...field}/>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}>
                    </FormField>     
                    <Button
                    className="rounded-xl"
                    disabled={form.formState.isSubmitting}
                    size="lg"
                    type="submit">
                        Continue
                    </Button>         
                </form>
            </Form>
        </>
    )
}