"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { CodeEditor } from './CodeEditor';
import { VoiceComponent } from './VoiceComponent';
import { FileCode, Mic, BookOpen } from 'lucide-react';

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

export default function InterviewRoom({ sessionId }: InterviewRoomProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'problem' | 'voice'>('problem');
    const [code, setCode] = useState<string>('');
    const [question, setQuestion] = useState(INITIAL_QUESTION);
    const [loading, setLoading] = useState(true);

    // Fetch session data on mount
    useEffect(() => {
        // In a real app, we would fetch from /api/session/:id
        // For this MVP scaffold, we'll simulate a fetch or create a session via the start endpoint
        // processing if new, but here we assume we might just hit start to get a generic one
        // for demonstration if the ID is "new".

        const fetchSession = async () => {
            try {
                // For demo purposes, if ID is 'new', we'll hit /api/start
                // If it's a UUID, we would hit /api/session/id (not implemented yet)

                // Simulating a fresh start for now every time if we don't have a backend ready-ready
                // or just hitting the start endpoint to get questions.
                const res = await fetch('http://localhost:4000/api/start', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    setQuestion(data.question);
                    setCode(data.question.starterCode);
                } else {
                    console.error("Failed to fetch session");
                }
            } catch (e) {
                console.error("Error fetching session:", e);
                // Fallback for offline/demo without backend running
                setQuestion({
                    title: "Two Sum",
                    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                    examples: ["Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]"],
                    starterCode: "function twoSum(nums, target) {\n  \n}"
                });
                setCode("function twoSum(nums, target) {\n  \n}");
            } finally {
                setLoading(false);
            }
        };

        const submitSession = async () => {
            try {
                setLoading(true);
                const res = await fetch('http://localhost:4000/api/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, code })
                });

                if (res.ok) {
                    // Redirect to results page
                    router.push(`/interview/${sessionId}/result`);
                } else {
                    console.error("Submission failed");
                    setLoading(false);
                }
            } catch (e) {
                console.error("Error submitting session:", e);
                setLoading(false);
            }
        };

        const handleEndCall = () => {
            // Automatically submit when call ends
            submitSession();
        };



        const handleCodeChange = (value: string | undefined) => {
            if (value !== undefined) setCode(value);
        };

        if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading Interview Environment...</div>;

        return (
            <PanelGroup orientation="horizontal" className="h-full">
                {/* Left Panel: Context & Voice */}
                <Panel defaultSize={30} minSize={20}>
                    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                        {/* Tabs Header */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setActiveTab('problem')}
                                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'problem'
                                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <BookOpen size={16} />
                                Problem
                            </button>
                            <button
                                onClick={() => setActiveTab('voice')}
                                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'voice'
                                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Mic size={16} />
                                Interviewer
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto">
                            {activeTab === 'problem' ? (
                                <div className="p-6">
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
                            ) : (
                                <VoiceComponent
                                    questionDescription={question.description}
                                    onEndCall={handleEndCall}
                                />
                            )}
                        </div>
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
                                onClick={submitSession}
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
