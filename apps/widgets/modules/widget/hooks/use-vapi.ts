import Vapi from "@vapi-ai/web";
import { use, useEffect, useState } from "react";


interface TranscriptMessage {
    role : "user" | "assistant";
    text : string;
};

export const useVapi = () => {
    const [vapi, setVapi] = useState<Vapi | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptMessage []>([]);

    useEffect(() => {
        const vapiInstance = new Vapi("b0971248-a3cc-4ffd-b0d2-6c106645b74a");
        setVapi(vapiInstance);

        vapiInstance.on("call-start", ()=>{
            setIsConnected(true);
            setIsConnecting(false);
            setTranscript([]);
        });

        vapiInstance.on("call-end", ()=>{
            setIsConnected(false);
            setIsConnecting(false);
            setIsSpeaking(false);
        });

        vapiInstance.on("speech-start", ()=>{
            setIsSpeaking(true);
        });

        vapiInstance.on("speech-end", ()=>{
            setIsSpeaking(false);
        });

        vapiInstance.on("error", (error)=>{
            console.log(error, "VAPI_ERROR");
            setIsConnecting(false);
        });

        vapiInstance.on("message", (message)=>{
            if(message.type === "transcript" && message.transcriptType === "final"){
                setTranscript((prev)=> [
                    ...prev,
                    {
                        role: message.role === "user" ? "user" : "assistant",
                        text: message.transcript
                    }
                ]);
            }

        });
        return () => {
            vapiInstance?.stop();
        }
    }, []);

    const startCall = () => {
        setIsConnecting(true);

        if(vapi) {
            vapi.start("d3c396c6-6931-42e9-a5c1-90234a919989");
        }
    }

    const endCall = () => {
        if(vapi) {
            vapi.stop();
        }
    };

    return {
        isSpeaking,
        isConnecting,
        isConnected,
        transcript,
        startCall,
        endCall,
    }
};