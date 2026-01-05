import { useEffect, useState, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '');

interface UseVapiInterviewProps {
    questionDescription: string;
    onCallEnd?: () => void;
}

export function useVapiInterview({ questionDescription, onCallEnd: onCallEndCallback }: UseVapiInterviewProps) {
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
                    question_context: `You are a world-class Technical Interviewer from a top-tier tech company. 
                    Your task is to conduct a professional coding interview for the following problem:
                    
                    **PROBLEM:**
                    ${questionDescription}
                    
                    **YOUR PERSONA & PHASED APPROACH:**
                    1. **INTRODUCTION (Phase 1):** Start the call by warmly greeting the candidate. Immediately explain the problem description and examples in a clear, concise manner. Ask if they have any clarifying questions before they start.
                    2. **ACTIVE LISTENING:** Do not speak over the candidate. Provide silence while they are typing or thinking. If they are silent for more than 30 seconds, ask how they are thinking or if they need a hint.
                    3. **GUIDING (Phase 2):** If they ask for help, give a small nudge or conceptual hint. NEVER give the code or the full algorithm. Ask about Time and Space complexity.
                    4. **STRICT RULES:** 
                       - NEVER PROVIDE THE SOLUTION.
                       - NEVER PROVIDE CODE SNIPPETS.
                       - If they ask for the answer, say "I can't give you the answer, but let's look at [specific part of the problem] together."
                    
                    Remind them to use the code editor on the right to implement their solution.`
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
        const onCallEnd = () => {
            setIsConnected(false);
            if (onCallEndCallback) onCallEndCallback();
        }
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
