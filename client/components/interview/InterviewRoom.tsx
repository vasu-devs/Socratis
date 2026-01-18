"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { CodeEditor } from './CodeEditor';
import { VoiceComponent } from './VoiceComponent';
import { FileCode, Sparkles, ChevronLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
    useRoomContext,
    useLocalParticipant,
    useRemoteParticipants,
    useTracks,
} from '@livekit/components-react';
import { RoomEvent, RemoteParticipant, Track } from 'livekit-client';
import '@livekit/components-styles';

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

// --- Inner Component to access LiveKit Context ---
const ActiveInterviewSession = ({
    question,
    code,
    setCode,
    sessionId,
    transcript,
    setTranscript,
    onEndCall
}: {
    question: Question;
    code: string;
    setCode: (c: string) => void;
    sessionId: string;
    transcript: Array<{ role: 'ai' | 'user', content: string }>;
    setTranscript: React.Dispatch<React.SetStateAction<Array<{ role: 'ai' | 'user', content: string }>>>;
    onEndCall: () => void;
}) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const remoteParticipants = useRemoteParticipants();
    const [isSpeaking, setIsSpeaking] = useState(false);

    // CRITICAL: Explicitly handle remote audio tracks to ensure agent voice plays
    useEffect(() => {
        const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
            if (track.kind === 'audio') {
                console.log("🔊 Agent audio track subscribed:", track);
                // Create audio element and play
                const audioEl = track.attach();
                audioEl.autoplay = true;
                audioEl.volume = 1.0;
                document.body.appendChild(audioEl);
                console.log("🔊 Agent audio element attached and playing");
            }
        };

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        return () => { room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed); };
    }, [room]);

    // CRITICAL: Send problem context to agent on connect
    useEffect(() => {
        const sendProblemContext = async () => {
            if (room && localParticipant && question.title !== "Loading...") {
                try {
                    const problemData = {
                        type: 'problem',
                        title: question.title,
                        description: question.description,
                        examples: question.examples
                    };
                    const encoder = new TextEncoder();
                    await localParticipant.publishData(encoder.encode(JSON.stringify(problemData)), { reliable: true });
                    console.log("📝 Sent problem context to agent:", question.title);
                } catch (e) {
                    console.error("Failed to send problem context:", e);
                }
            }
        };

        // Send immediately and also after a short delay to ensure agent is ready
        sendProblemContext();
        const timeout = setTimeout(sendProblemContext, 2000);
        return () => clearTimeout(timeout);
    }, [room, localParticipant, question]);

    // Check if AI agent (remote) is speaking
    useEffect(() => {
        const checkSpeaking = () => {
            const speaking = remoteParticipants.some(p => p.isSpeaking);
            setIsSpeaking(speaking);
        };
        // Listen to events
        room.on(RoomEvent.ActiveSpeakersChanged, checkSpeaking);
        const interval = setInterval(checkSpeaking, 100);
        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, checkSpeaking);
            clearInterval(interval);
        };
    }, [remoteParticipants, room]);

    // Handle Data (Transcript) - LEGACY fallback for manual data channel messages
    useEffect(() => {
        const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
            try {
                const decoder = new TextDecoder();
                const data = JSON.parse(decoder.decode(payload));
                if (data.type === 'transcript') {
                    setTranscript(prev => [...prev, {
                        role: data.role === 'assistant' ? 'ai' : 'user',
                        content: data.text
                    }]);

                    // Termination check
                    if (data.role === 'user') {
                        const terminationRegex = /(I('?m| am) done|End (the )?(interview|test|call)|That'?s all|Stop the interview|submit|finish)/i;
                        if (terminationRegex.test(data.text)) {
                            console.log("🔴 TERMINATION DETECTED via data channel:", data.text);
                            onEndCall();
                        }
                    }
                }
            } catch (e) { console.error(e); }
        };
        room.on(RoomEvent.DataReceived, handleData);
        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room, onEndCall]);

    // LiveKit Transcription Event - PRIMARY termination detection
    useEffect(() => {
        const handleTranscription = (segments: any, participant?: any, publication?: any) => {
            console.log("📝 Transcription received:", segments);

            segments.forEach((segment: any) => {
                const text = segment.text || '';
                const isFinal = segment.final;

                // Add to transcript
                if (isFinal && text) {
                    const role = participant?.identity?.includes('agent') ? 'ai' : 'user';
                    setTranscript(prev => [...prev, { role, content: text }]);

                    // Check for termination phrases FROM USER
                    if (role === 'user') {
                        const terminationRegex = /(I('?m| am) done|End (the )?(interview|test|call)|That'?s all|Stop the interview|submit|finish|I am done|Im done)/i;
                        if (terminationRegex.test(text)) {
                            console.log("🔴 TERMINATION DETECTED via transcription:", text);
                            setTimeout(() => onEndCall(), 1000); // Small delay for UX
                        }
                    }
                }
            });
        };

        room.on(RoomEvent.TranscriptionReceived, handleTranscription);
        return () => { room.off(RoomEvent.TranscriptionReceived, handleTranscription); };
    }, [room, onEndCall]);


    // Send Code Updates - faster sync for real-time agent awareness
    useEffect(() => {
        if (!room || !localParticipant) return;
        const handler = setTimeout(async () => {
            try {
                const strData = JSON.stringify({ type: 'code', content: code });
                const encoder = new TextEncoder();
                await localParticipant.publishData(encoder.encode(strData), { reliable: true });
                console.log("📤 Sent code update to agent");
            } catch (e) { console.error(e); }
        }, 500); // Reduced from 2000ms for faster sync
        return () => clearTimeout(handler);
    }, [code, room, localParticipant]);

    // Mute Tingle
    const toggleMute = async () => {
        if (localParticipant) {
            const enabled = localParticipant.isMicrophoneEnabled;
            await localParticipant.setMicrophoneEnabled(!enabled);
        }
    };

    return (
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
                            isConnected={true}
                            isSpeaking={isSpeaking}
                            isMuted={!localParticipant?.isMicrophoneEnabled}
                            transcript={transcript}
                            onStart={() => { }} // Already started
                            onStop={onEndCall}
                            onToggleMute={toggleMute}
                        />
                    </Panel>
                </PanelGroup>
            </Panel>
            <PanelResizeHandle className="w-[1px] bg-slate-100 hover:bg-blue-500 transition-colors z-20" />
            <Panel defaultSize={70}>
                <div className="h-full flex flex-col bg-white">
                    <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
                        <FileCode size={14} className="text-slate-400 mr-2" />
                        <span className="text-[12px] font-bold text-slate-500 tracking-tight">main.js</span>
                    </div>
                    <div className="flex-1 relative">
                        <CodeEditor code={code} onChange={(v) => v !== undefined && setCode(v)} />
                    </div>
                </div>
            </Panel>
        </PanelGroup>
    );
};


export default function InterviewRoom({ sessionId: initialSessionId }: InterviewRoomProps) {
    const router = useRouter();
    const [code, setCode] = useState<string>('');
    const [question, setQuestion] = useState(INITIAL_QUESTION);
    const [currentSessionId, setCurrentSessionId] = useState<string>(initialSessionId);
    const [token, setToken] = useState<string>("");
    const [wsUrl, setWsUrl] = useState<string>("");

    // Multi-question state
    const [totalQuestions, setTotalQuestions] = useState<number>(1);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

    // Transcript state - lifted to parent for submission
    const [transcript, setTranscript] = useState<Array<{ role: 'ai' | 'user', content: string }>>([]);

    // UI State
    const [hasStarted, setHasStarted] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Initial Data Fetch (Question/Session)
    useEffect(() => {
        const fetchSession = async () => {
            try {
                if (initialSessionId !== 'new') {
                    const res = await fetch(`http://localhost:4000/api/session/${initialSessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setQuestion(data.question);
                        setCode(data.code || data.question.starterCode);
                        setTotalQuestions(data.questions?.length || 1);
                        setCurrentQuestionIndex(data.currentQuestionIndex || 0);
                        return;
                    }
                }
                const res = await fetch('http://localhost:4000/api/start', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    console.log("[Debug] /api/start response:", data);
                    console.log("[Debug] totalQuestions:", data.totalQuestions, "currentQuestionIndex:", data.currentQuestionIndex);
                    setQuestion(data.question);
                    setCode(data.question.starterCode);
                    setCurrentSessionId(data.sessionId);
                    setTotalQuestions(data.totalQuestions || 1);
                    setCurrentQuestionIndex(data.currentQuestionIndex || 0);
                    if (initialSessionId === 'new') {
                        window.history.replaceState(null, '', `/interview/${data.sessionId}`);
                    }
                }
            } catch (e) {
                console.error("Error fetching session:", e);
            }
        };
        fetchSession();
    }, [initialSessionId]);

    // Keyboard shortcut: Ctrl+Enter to submit
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleEndCall();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [code, currentSessionId]); // Re-bind when these change


    // Fetch Token on "Start Interview"
    const handleStartInterview = async () => {
        setHasStarted(true);
        setIsConnecting(true);
        try {
            const response = await fetch('http://localhost:4000/api/livekit/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    participantName: `Candidate-${Math.floor(Math.random() * 1000)}`
                })
            });
            if (response.ok) {
                const data = await response.json();
                setToken(data.token);
                setWsUrl(data.url);
            }
        } catch (e) {
            console.error("Token error:", e);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleEndCall = async () => {
        try {
            // Submit code and transcript to backend for evaluation
            console.log("Submitting interview data...");
            const submitResponse = await fetch('http://localhost:4000/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    code: code,
                    transcript: transcript
                })
            });

            if (submitResponse.ok) {
                console.log("Interview submitted successfully!");
            } else {
                console.error("Failed to submit interview:", await submitResponse.text());
            }
        } catch (error) {
            console.error("Error submitting interview:", error);
        } finally {
            setToken("");
            router.push(`/interview/${currentSessionId}/result`);
        }
    };

    // Handler for submitting current question and advancing to next
    const handleNextQuestion = async () => {
        if (isSubmittingQuestion) return;
        setIsSubmittingQuestion(true);

        try {
            const response = await fetch('http://localhost:4000/api/submit-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    code: code,
                    transcript: transcript
                })
            });

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'next_question') {
                    // Update to next question
                    setQuestion(data.question);
                    setCode(data.question.starterCode);
                    setCurrentQuestionIndex(data.currentQuestionIndex);
                    setTranscript([]); // Reset transcript for new question
                    console.log(`Advanced to question ${data.currentQuestionIndex + 1}/${data.totalQuestions}`);
                } else if (data.status === 'completed') {
                    // All questions done, go to results
                    router.push(`/interview/${currentSessionId}/result`);
                }
            }
        } catch (error) {
            console.error("Error advancing question:", error);
        } finally {
            setIsSubmittingQuestion(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden relative">
            {/* Start Overlay */}
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

            {/* Connecting Overlay */}
            {isConnecting && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-semibold text-slate-700">Connecting to Socratis...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-20 bg-white shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="h-4 w-[1px] bg-slate-100" />
                    <h2 className="font-bold text-slate-900">{question.title}</h2>
                    {/* Question Progress Indicator */}
                    {totalQuestions > 1 && (
                        <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                            <span className="text-[12px] font-bold text-blue-600">
                                Question {currentQuestionIndex + 1}/{totalQuestions}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                        <Sparkles size={14} className="text-blue-500" />
                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Llama 3.3 Active</span>
                    </div>
                    {/* Next Question Button - shows when not on last question */}
                    {currentQuestionIndex + 1 < totalQuestions && (
                        <button
                            onClick={handleNextQuestion}
                            disabled={isSubmittingQuestion}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmittingQuestion ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>Next Question →</>
                            )}
                        </button>
                    )}
                    {/* Final Submit Button */}
                    <button
                        onClick={handleEndCall}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                        title="Click to submit or press Ctrl+Enter"
                    >
                        <CheckCircle2 size={16} />
                        {currentQuestionIndex + 1 >= totalQuestions ? 'Submit & Get Report' : 'Finish Early'}
                    </button>
                </div>
            </header>

            {token && wsUrl ? (
                <LiveKitRoom
                    token={token}
                    serverUrl={wsUrl}
                    connect={true}
                    audio={true}
                    video={false}
                    onDisconnected={handleEndCall}
                    className="flex-1 flex"
                >
                    <ActiveInterviewSession
                        question={question}
                        code={code}
                        setCode={setCode}
                        sessionId={currentSessionId}
                        transcript={transcript}
                        setTranscript={setTranscript}
                        onEndCall={handleEndCall}
                    />
                    <StartAudio label="Click to enable audio" />
                    <RoomAudioRenderer />
                </LiveKitRoom>
            ) : (
                <PanelGroup orientation="horizontal" className="flex-1 overflow-hidden opacity-50 pointer-events-none">
                    {/* Placeholder Layout if needed to avoid jump, or just wait for token */}
                </PanelGroup>
            )}
        </div>
    );
}
