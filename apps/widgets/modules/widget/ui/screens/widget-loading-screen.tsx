"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { LoaderIcon } from "lucide-react";
import { contactSessionIdAtomFamily, errorMessageAtom, loadingMessageAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";

type InitStep =  "org" | "session" | "settings" | "vapi" | "done";

export const WidgetLoadingScreen = ({organizationId}:{organizationId: string | null}) => {
    const [step, setStep] = useState<InitStep>("org")
    const [sessionValid, setSessionValid] = useState(false);

    const loadingMessage = useAtomValue(loadingMessageAtom);
    const setOrganizationId = useSetAtom(organizationIdAtom);
    const setLoadingmessage = useSetAtom(loadingMessageAtom);
    const setErrorMessage = useSetAtom(errorMessageAtom);
    const setScreen = useSetAtom(screenAtom);

    const contactSessionId = useAtomValue(contactSessionIdAtomFamily(organizationId || ""));

    const validateOrganization = useAction(api.public.organizations.validate)
    useEffect(()=>{
        if (step !== "org"){
            return;
        }

        setLoadingmessage("Finding organization Id...");

        if(!organizationId){
            setErrorMessage("Organization Id is required");
            setScreen("error");
            return;
        }
 
        setLoadingmessage("Verifying organization...");

        validateOrganization({ organizationId })
        .then((result) => {
            if (result.valid) {
                setOrganizationId(organizationId);
                setStep("session");
            } else {
                setErrorMessage(result.reason || "Invalid configuration");
                setScreen("error");
            }
        })
        .catch(() => {
            setErrorMessage("Unable to verify organization");
            setScreen("error");
        })

    }, [
        step,
        organizationId, 
        setErrorMessage, 
        setScreen,
        setOrganizationId,
        setStep,
        validateOrganization,
        setLoadingmessage
    ]);


    const validateContactSession = useMutation(api.public.contactSessions.validate);
    useEffect(()=> {
        if (step !== "session"){
            return;
        }

        setLoadingmessage("Finding contact session Id...")

        if(!contactSessionId) {
            setSessionValid(false);
            setStep("done");
            return;
        }

        setLoadingmessage("validating session...");
        validateContactSession({
            contactSessionId,
        }).then((result) => {
            setSessionValid(result.valid);
            setStep("done");
        }).catch(()=>{
            setSessionValid(false);
            setStep("done");
        })
    }, [step, contactSessionId, validateContactSession, setLoadingmessage]);

    useEffect(()=>{
        if(step !== "done"){
            return;
        }

        const hasValidSession = contactSessionId && sessionValid;
        setScreen(hasValidSession ? "selection": "auth");
    }, [step, contactSessionId, sessionValid, setScreen]);


    return (
        <>
        <WidgetHeader>
             <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
                    <p className="font-semibold text-3xl">
                        Hi there! ✋
                    </p>
                    <p className="text-lg">
                        Let&apos;s get you started
                    </p>
                </div>
        </WidgetHeader>
        <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 text-muted-foreground">
            <LoaderIcon className="animate-spin"/>
            <p className="text-sm">
                {loadingMessage || "Loading..."}
            </p>
        </div>
        </>
    )
}