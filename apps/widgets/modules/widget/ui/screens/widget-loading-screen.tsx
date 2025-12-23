"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { LoaderIcon } from "lucide-react";
import { contactSessionIdAtomFamily, errorMessageAtom, loadingMessageAtom, organizationIdAtom, screenAtom, widgetSettingsAtom,vapiSecretsAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import Image from "next/image";
import { Id } from "@workspace/backend/_generated/dataModel";

type InitStep =  "org" | "session" | "settings" | "vapi" | "done";

export const WidgetLoadingScreen = ({organizationId}:{organizationId: string | null}) => {
    const [step, setStep] = useState<InitStep>("org")
    const [sessionValid, setSessionValid] = useState(false);

    const loadingMessage = useAtomValue(loadingMessageAtom);
    const setWidgetSettings = useSetAtom(widgetSettingsAtom);
    const setOrganizationId = useSetAtom(organizationIdAtom);
    const setLoadingmessage = useSetAtom(loadingMessageAtom);
    const setErrorMessage = useSetAtom(errorMessageAtom);
    const setScreen = useSetAtom(screenAtom);
    const setVapiSecrets = useSetAtom(vapiSecretsAtom);

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
            setStep("settings");
            return;
        }

        setLoadingmessage("validating session...");
        validateContactSession({
            contactSessionId,
        }).then((result) => {
            setSessionValid(result.valid);
            setStep("settings");
        }).catch(()=>{
            setSessionValid(false);
            setStep("settings");
        })
    }, [step, contactSessionId, validateContactSession, setLoadingmessage]);

    const widgetSettings = useQuery(api.public.widgetSettings.getByOrganizationId,
        organizationId ? {
            organizationId,
        } : "skip",
    );
    useEffect(() => {
        if(step !== "settings"){
            return;
        }

        setLoadingmessage("Loading widget settings...");

        if (widgetSettings != undefined){
            setWidgetSettings(widgetSettings);
            setStep("vapi");

        }

    }, [
        step,
        widgetSettings,
        setStep,
        setWidgetSettings,
        setLoadingmessage,
    ]);

    const getVapiSecrets = useAction(api.public.secrets.getVapiSecrets);
    useEffect(() => {
        if(step !== "vapi"){
            return;
        }

        if (!organizationId){
            setErrorMessage("Organization ID is required");
            setScreen("error");
            return;
        }
        setLoadingmessage("Loading voice features...")
        getVapiSecrets({organizationId})
        .then((secrets)=> {
            setVapiSecrets(secrets);
            setStep("done");
        })
        .catch(()=> {
            setVapiSecrets(null);
            setStep("done");
        })
    }, [
        step,
        organizationId,
        getVapiSecrets,
        setVapiSecrets,
        setLoadingmessage,
        setStep,
    ])

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
             <div className="flex px-1 py-1 font-semibold">
                <Image className="pe-2" src="/aiavatar.png" alt="Logo" width={50} height={30}/>
                <div className="flex flex-col">
                    <p className="font-semibold text-md">
                        Mona
                    </p>
                    <p className="text-sm">
                        AI Assistant
                    </p>
                    </div>
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