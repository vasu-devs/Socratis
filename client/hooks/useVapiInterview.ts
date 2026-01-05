import { useEffect, useState, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '');

interface UseVapiInterviewProps {
    questionDescription: string;
}

export function useVapiInterview({ questionDescription }: UseVapiInterviewProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<Array<{ role: 'ai' | 'user', content: string }>>([]);

    // Initialize Vapi with the specific assistant and inject context
    const startSession = useCallback(async () => {
        try {
            // Assuming a public assistant ID for now, or passing one via env
            const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

            if (!assistantId) {
                console.error("Vapi Assistant ID is missing");
                return;
            }

            // We can use the override system to inject the system prompt
            const assistantOverrides = {
                variableValues: {
                    // If the assistant is configured to use this variable
                    question_context: questionDescription
                }
            };

            await vapi.start(assistantId, assistantOverrides);
        } catch (error) {
            console.error("Failed to start Vapi session:", error);
        }
    }, [questionDescription]);

    const stopSession = useCallback(() => {
        vapi.stop();
    }, []);

    useEffect(() => {
        const onCallStart = () => setIsConnected(true);
        const onCallEnd = () => setIsConnected(false);
        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        const onMessage = (message: any) => {
            if (message.type === "transcript" && message.transcriptType === "final") {
                setTranscript(prev => [...prev, {
                    role: message.role === "assistant" ? "ai" : "user",
                    content: message.transcript
                }]);
            }
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('message', onMessage);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('message', onMessage);
        };
    }, []);

    return {
        isConnected,
        isSpeaking,
        transcript,
        startSession,
        stopSession
    };
}
