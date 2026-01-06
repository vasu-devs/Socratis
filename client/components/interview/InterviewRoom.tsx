"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { CodeEditor } from './CodeEditor';
import { VoiceComponent } from './VoiceComponent';
import { FileCode, Sparkles, ChevronLeft } from 'lucide-react';
import { useVapiInterview } from '@/hooks/useVapiInterview';
import Link from 'next/link';

interface InterviewRoomProps {
    sessionId: string;
}

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
    starterCode: "// Preparing your interview environment..."
};

export default function InterviewRoom({ sessionId: initialSessionId }: InterviewRoomProps) {
    const router = useRouter();
    const [code, setCode] = useState<string>('');
    const [question, setQuestion] = useState(INITIAL_QUESTION);
    const [loading, setLoading] = useState(true);
    const [currentSessionId, setCurrentSessionId] = useState<string>(initialSessionId);
    const [hasStarted, setHasStarted] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                if (initialSessionId !== 'new') {
                    const res = await fetch(`http://localhost:4000/api/session/${initialSessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setQuestion(data.question);
                        setCode(data.code || data.question.starterCode);
                        setLoading(false);
                        return;
                    }
                }

                const res = await fetch('http://localhost:4000/api/start', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    setQuestion(data.question);
                    setCode(data.question.starterCode);
                    setCurrentSessionId(data.sessionId);
                    if (initialSessionId === 'new') {
                        window.history.replaceState(null, '', `/interview/${data.sessionId}`);
                    }
                }
            } catch (e) {
                console.error("Error fetching session:", e);
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

        if (isConnected) stopSession();

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
                setLoading(false);
                isSubmitting.current = false;
            }
        } catch (e) {
            setLoading(false);
            isSubmitting.current = false;
        }
    };

    const handleEndCall = () => {
        if (!isSubmitting.current) submitSession(transcript);
    };

    const { isConnected, isSpeaking, isMuted, startSession, stopSession, toggleMute, transcript } = useVapiInterview({
        questionDescription: question.description,
        onCallEnd: handleEndCall
    });

    // Removed auto-start useEffect to fix Brave autoplay issues
    // Manually triggered by user in overlay instead

    const handleStartInterview = async () => {
        setHasStarted(true);
        setIsConnecting(true);
        try {
            await startSession();
        } catch (err) {
            console.error("Failed to start session:", err);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleCodeChange = (value: string | undefined) => {
        if (value !== undefined) setCode(value);
    };

    if (loading && !isConnected) return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <div className="bg-grid absolute inset-0 opacity-40 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium font-mono text-sm">Initializing Socratic Engine...</p>
            </div>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden relative">
            {/* Start Interview Overlay */}
            {!hasStarted && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="text-blue-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Interview?</h2>
                        <p className="text-slate-500 mb-8">
                            This session uses AI voice interaction. Click below to enable your microphone and begin.
                        </p>
                        <button
                            onClick={handleStartInterview}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Start Interview
                        </button>
                    </div>
                </div>
            )}
            
            {/* Connecting Overlay */ }
            {isConnecting && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                   <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-semibold text-slate-700">Connecting to Socratis...</p>
                   </div>
                </div>
            )}

            {/* Minimal Header */}
            <header className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-20 bg-white">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="h-4 w-[1px] bg-slate-100" />
                    <h2 className="font-bold text-slate-900">{question.title}</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                        <Sparkles size={14} className="text-blue-500" />
                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Llama 3.3 Active</span>
                    </div>
                    <button
                        onClick={() => submitSession()}
                        className="bg-slate-950 text-white px-4 py-1.5 rounded-full text-[13px] font-bold hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Submit Implementation
                    </button>
                </div>
            </header>

            <PanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
                {/* Information Sidebar */}
                <Panel defaultSize={30} minSize={20} className="relative z-10 flex flex-col bg-slate-50/50">
                    <PanelGroup orientation="vertical" className="h-full">
                        <Panel defaultSize={60} minSize={30} className="overflow-auto border-r border-slate-100 bg-white">
                            <div className="p-8">
                                <div className="prose prose-slate prose-sm max-w-none">
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {question.description}
                                    </p>
                                    
                                    <div className="mt-8 space-y-6">
                                        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Examples</h4>
                                        {question.examples.map((ex, i) => (
                                            <div key={i} className="bg-slate-50 rounded-xl p-4 font-mono text-xs border border-slate-100 relative overflow-hidden group">
                                               <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10 group-hover:bg-blue-500/30 transition-colors" />
                                               {ex}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <PanelResizeHandle className="h-[1px] bg-slate-100 hover:bg-blue-500 transition-colors z-20" />

                        <Panel defaultSize={40} minSize={20} className="bg-slate-50/50 border-r border-slate-100 relative overflow-hidden">
                             <VoiceComponent
                                isConnected={isConnected}
                                isSpeaking={isSpeaking}
                                isMuted={isMuted}
                                transcript={transcript}
                                onStart={startSession}
                                onStop={stopSession}
                                onToggleMute={toggleMute}
                            />
                        </Panel>
                    </PanelGroup>
                </Panel>

                <PanelResizeHandle className="w-[1px] bg-slate-100 hover:bg-blue-500 transition-colors z-20" />

                {/* Editor Area */}
                <Panel defaultSize={70}>
                    <div className="h-full flex flex-col bg-white">
                        <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
                            <FileCode size={14} className="text-slate-400 mr-2" />
                            <span className="text-[12px] font-bold text-slate-500 tracking-tight">main.js</span>
                        </div>
                        <div className="flex-1 relative">
                            <CodeEditor code={code} onChange={handleCodeChange} />
                        </div>
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
