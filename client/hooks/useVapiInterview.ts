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

            if (!questionDescription || questionDescription === "Fetching question details...") {
                console.warn("Attempted to start Vapi without valid question description");
                return;
            }

            console.log("Starting Vapi session with question:", questionDescription.substring(0, 50) + "...");

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
                       - **TERMINATION:** If the candidate says "End the interview", "I'm done", or "That's all", acknowledge it warmly, say goodbye, and the call will end.
                    
                    5. **LOOP:** Continue the interview by asking about complexity, edge cases, or potential improvements until the user signals they are finished.
                    
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
                const newTranscriptItem = {
                    role: message.role === "assistant" ? "ai" as const : "user" as const,
                    content: message.transcript
                };

                setTranscript(prev => [...prev, newTranscriptItem]);

                // Check for termination phrases from user
                if (message.role === "user") {
                    const terminationRegex = /^(I('?m| am) done|End (the )?(interview|test|call)|That'?s all|Stop)/i;
                    if (terminationRegex.test(message.transcript)) {
                        console.log("Termination phrase detected. Ending session...");
                        // Small delay to allow 'natural' feel or just stop immediately
                        setTimeout(() => {
                            stopSession();
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
