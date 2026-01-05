"use client";

import React, { useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { CheckCircle, XCircle, Home } from 'lucide-react';
import Link from 'next/link';

interface ResultPageProps {
    params: {
        id: string;
    }
}

interface SessionResult {
    question: {
        title: string;
        description: string;
    };
    code: string;
    feedback?: {
        score: number;
        correctness: boolean;
        feedback_markdown: string;
    };
}

export default function ResultPage({ params }: ResultPageProps) {
    const [session, setSession] = useState<SessionResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/session/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setSession(data);
                }
            } catch (error) {
                console.error("Failed to fetch result:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [params.id]);

    if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">Loading Result...</div>;
    if (!session) return <div className="flex items-center justify-center h-screen text-red-500">Result not found or error loading.</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex flex-col gap-6">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Interview Report</h1>
                <Link href="/" className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Home size={20} />
                    Back to Home
                </Link>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Left Column: Feedback & Question */}
                <div className="flex flex-col gap-6 overflow-auto">
                    {/* Score Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Performance</h2>
                            {session.feedback?.correctness ? (
                                <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                                    <CheckCircle size={18} /> Passed
                                </span>
                            ) : (
                                <span className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                                    <XCircle size={18} /> Failed / Incomplete
                                </span>
                            )}
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                            {session.feedback?.score || 0}<span className="text-xl text-slate-400 font-normal">/10</span>
                        </div>
                        <p className="text-slate-500 text-sm">Overall Score based on correctness, optimality, and code quality.</p>
                    </div>

                    {/* Detailed Feedback */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">AI Feedback</h2>
                        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                            {/* Basic markdown rendering - could use react-markdown here for better safety/style */}
                            <pre className="whitespace-pre-wrap font-sans">{session.feedback?.feedback_markdown}</pre>
                        </div>
                    </div>
                </div>

                {/* Right Column: Code & Question Reference */}
                <div className="flex flex-col gap-6 h-full">
                    {/* Question Reference */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">Problem</h3>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{session.question.title}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{session.question.description}</p>
                    </div>

                    {/* Code Viewer */}
                    <div className="flex-1 bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col">
                        <div className="px-4 py-2 bg-[#252526] border-b border-[#333] text-slate-400 text-xs font-mono">
                            Final Submission
                        </div>
                        <div className="flex-1">
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                value={session.code}
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 14,
                                    theme: 'vs-dark'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
