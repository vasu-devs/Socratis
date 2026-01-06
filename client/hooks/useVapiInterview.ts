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

    // Use a ref to keep track of the latest callback to avoid stale closures in the event listener
    const onCallEndCallbackRef = useRef(onCallEndCallback);

    useEffect(() => {
        onCallEndCallbackRef.current = onCallEndCallback;
    }, [onCallEndCallback]);

    // Initialize Vapi with the specific assistant and inject context
    const startSession = useCallback(async () => {
        try {
            // Assuming a public assistant ID for now, or passing one via env
            const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

            if (!assistantId) {
                console.error("Vapi Assistant ID is missing");
                return;
            }

            if (!questionDescription || questionDescription === "Fetching question details...") {
                console.warn("Attempted to start Vapi without valid question description");
                return;
            }

            console.log("Starting Vapi session with question:", questionDescription.substring(0, 50) + "...");

            // We can use the override system to inject the system prompt
            const assistantOverrides = {
                variableValues: {
                    question_context: `You are a world-class Technical Interviewer from a top-tier tech company. 
                    
                    **CRITICAL INSTRUCTIONS:**
                    - **SPEAK CONCISELY.** Use short, natural sentences. Avoid long monologues.
                    - **DO NOT READ MARKDOWN.** Never say words like "Hash hash", "Dash dash", or "Asterisk". Just speak the text naturally.

                    **PROBLEM:**
                    ${questionDescription}
                    
                    **YOUR PERSONA & PHASED APPROACH:**
                    1. **INTRODUCTION:** Warmly greet the candidate. Give a *very brief* 1-2 sentence summary of the problem. Ask if they understand.
                    2. **ACTIVE LISTENING:** Do not speak over the candidate. Provide silence while they are typing or thinking.
                    3. **GUIDING:** If asked for help, give a small nudge. NEVER give the code or full algorithm. Ask about Time/Space complexity.
                    4. **STRICT RULES:** 
                       - NEVER PROVIDE THE SOLUTION.
                       - NEVER PROVIDE CODE SNIPPETS.
                       - **TERMINATION:** If the user says "End the interview" or "I'm done", say "Great, submitting your work now" and stop speaking.
                    
                    5. **LOOP:** Ask concise follow-up questions about complexity or edge cases if the user is silent or indicates they are done with a part.`
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
            if (onCallEndCallbackRef.current) onCallEndCallbackRef.current();
        }
        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        const onMessage = (message: any) => {
            if (message.type === "transcript" && message.transcriptType === "final") {
                const newTranscriptItem = {
                    role: message.role === "assistant" ? "ai" as const : "user" as const,
                    content: message.transcript
                };

                setTranscript(prev => [...prev, newTranscriptItem]);

                // Check for termination phrases from user
                if (message.role === "user") {
                    const terminationRegex = /(I('?m| am) done|End (the )?(interview|test|call)|That'?s all|Stop the interview)/i;
                    if (terminationRegex.test(message.transcript)) {
                        console.log("Termination phrase detected. Ending session...");
                        // Small delay to allow 'natural' feel or just stop immediately
                        setTimeout(() => {
                            stopSession();
                            // Backup: Manually trigger end callback to ensure submission happens even if Vapi event doesn't fire
                            if (onCallEndCallbackRef.current) {
                                console.log("Manually triggering end callback via voice command");
                                onCallEndCallbackRef.current();
                            }
                        }, 500);
                    }
                }
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

    const [isMuted, setIsMuted] = useState(false);

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        vapi.setMuted(newMuted);
        setIsMuted(newMuted);
    }, [isMuted]);

    return {
        isConnected,
        isSpeaking,
        isMuted,
        transcript,
        startSession,
        stopSession,
        toggleMute
    };
}
