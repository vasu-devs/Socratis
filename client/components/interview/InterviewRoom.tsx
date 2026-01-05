"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { CodeEditor } from './CodeEditor';
import { VoiceComponent } from './VoiceComponent';
import { FileCode, Mic, BookOpen } from 'lucide-react';
import { useVapiInterview } from '@/hooks/useVapiInterview';

interface InterviewRoomProps {
    sessionId: string;
}

// Mock data for initial invalid state or loading
interface Question {
    title: string;
    description: string;
    examples: string[];
    starterCode: string;
}

const INITIAL_QUESTION: Question = {
    title: "Loading...",
    description: "Fetching question details...",
    examples: [],
    starterCode: "// Loading..."
};

export default function InterviewRoom({ sessionId: initialSessionId }: InterviewRoomProps) {
    const router = useRouter();
    const [code, setCode] = useState<string>('');
    const [question, setQuestion] = useState(INITIAL_QUESTION);
    const [loading, setLoading] = useState(true);
    const [currentSessionId, setCurrentSessionId] = useState<string>(initialSessionId);

    // Fetch session data on mount
    useEffect(() => {
        const fetchSession = async () => {
            try {
                // If it's a UUID (not 'new'), try to fetch existing session
                if (initialSessionId !== 'new') {
                    const res = await fetch(`http://localhost:4000/api/session/${initialSessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setQuestion(data.question);
                        setCode(data.code || data.question.starterCode);
                        setLoading(false);
                        return;
                    }
                    console.error("Session not found, starting new one");
                }

                // Start a fresh session
                const res = await fetch('http://localhost:4000/api/start', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    setQuestion(data.question);
                    setCode(data.question.starterCode);
                    setCurrentSessionId(data.sessionId);

                    // Update URL to the new sessionId without refreshing
                    if (initialSessionId === 'new') {
                        window.history.replaceState(null, '', `/interview/${data.sessionId}`);
                    }
                } else {
                    console.error("Failed to fetch session");
                }
            } catch (e) {
                console.error("Error fetching session:", e);
                // Fallback for offline/demo
                const fallback = {
                    title: "Two Sum",
                    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                    examples: ["Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]"],
                    starterCode: "function twoSum(nums, target) {\n  \n}"
                };
                setQuestion(fallback);
                setCode(fallback.starterCode);
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [initialSessionId]);

    const isSubmitting = React.useRef(false);

    const submitSession = async (currentTranscript: any[] = transcript) => {
        if (!currentSessionId || currentSessionId === 'new' || isSubmitting.current) return;
        
        isSubmitting.current = true;
        setLoading(true);

        // Stop Vapi if it's still running
        if (isConnected) {
            stopSession();
        }

        try {
            const res = await fetch('http://localhost:4000/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    code,
                    transcript: currentTranscript
                })
            });

            if (res.ok) {
                router.push(`/interview/${currentSessionId}/result`);
            } else {
                console.error("Submission failed");
                setLoading(false);
                isSubmitting.current = false;
            }
        } catch (e) {
            console.error("Error submitting session:", e);
            setLoading(false);
            isSubmitting.current = false;
        }
    };

    const handleEndCall = () => {
        // Automatically submit when call ends, but only if we haven't already
        if (!isSubmitting.current) {
            submitSession(transcript);
        }
    };

    const { isConnected, isSpeaking, startSession, stopSession, transcript } = useVapiInterview({
        questionDescription: question.description,
        onCallEnd: handleEndCall
    });

    // Auto-start Vapi session when question is loaded
    useEffect(() => {
        if (!loading && question.title !== "Loading..." && !isConnected) {
            // Attempt auto-start (might be blocked by browser policy without interaction)
            startSession().catch(err => console.log("Auto-start blocked or failed", err));
        }
    }, [loading, question.title, startSession]);



    const handleCodeChange = (value: string | undefined) => {
        if (value !== undefined) setCode(value);
    };

    if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading Interview Environment...</div>;

    return (
        <PanelGroup orientation="horizontal" className="h-full">
            {/* Left Panel: Context & Voice */}
            <Panel defaultSize={30} minSize={20}>
                <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                    {/* Content Area - Vertical Split for Problem and Voice */}
                    <PanelGroup orientation="vertical" className="flex-1">
                        <Panel defaultSize={50} minSize={30}>
                            <div className="p-6 h-full overflow-auto">
                                <h1 className="text-2xl font-bold mb-4">{question.title}</h1>
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                        {question.description}
                                    </p>

                                    <h3 className="text-lg font-semibold mt-6 mb-2">Examples</h3>
                                    <div className="space-y-4">
                                        {question.examples.map((ex, i) => (
                                            <div key={i} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md font-mono text-xs">
                                                {ex}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <PanelResizeHandle className="h-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 transition-colors" />

                        <Panel defaultSize={50} minSize={30}>
                            <div className="h-full border-t border-slate-200 dark:border-slate-800">
                                <VoiceComponent
                                    isConnected={isConnected}
                                    isSpeaking={isSpeaking}
                                    transcript={transcript}
                                    onStart={startSession}
                                    onStop={stopSession}
                                />
                            </div>
                        </Panel>
                    </PanelGroup>
                </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 transition-colors" />

            {/* Right Panel: Code Editor */}
            <Panel defaultSize={70}>
                <div className="flex flex-col h-full bg-[#1e1e1e]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-[#333]">
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                            <FileCode size={16} />
                            <span>main.js</span>
                        </div>
                        <button
                            onClick={() => submitSession()}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors">
                            Submit Solution
                        </button>
                    </div>
                    <div className="flex-1">
                        <CodeEditor code={code} onChange={handleCodeChange} />
                    </div>
                </div>
            </Panel>
        </PanelGroup>
    );
}
