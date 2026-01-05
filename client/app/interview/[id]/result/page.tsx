"use client";

import React, { useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { ArrowLeft, CheckCircle2, ChevronRight, Share2, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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

export default function ResultPage({ params }: { params: { id: string } }) {
    const [session, setSession] = useState<SessionResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/session/${params.id}`);
                if (res.ok) setSession(await res.json());
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [params.id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <div className="bg-grid absolute inset-0 opacity-40 pointer-events-none" />
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Generating Your Elite Report...</p>
        </div>
    );
    
    if (!session) return <div className="p-20 text-center text-red-500">Session data not available.</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="bg-grid absolute inset-0 opacity-30 pointer-events-none" />
            
            {/* Minimal Header */}
            <header className="relative z-10 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm font-medium">Session Report</span>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="text-slate-900 text-sm font-bold tracking-tight">{session.question.title}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-400 hover:text-slate-900 transition-all">
                        <Share2 size={18} />
                    </button>
                    <Link href="/" className="bg-slate-950 text-white px-5 py-2 rounded-full text-[13px] font-bold active:scale-95 transition-all shadow-sm">
                        New Session
                    </Link>
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Summary & Score */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Performance Bento Card */}
                    <div className="bg-white rounded-[32px] p-10 border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Trophy size={120} className="text-slate-400" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full w-fit mb-8">
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">AI Evaluation</span>
                            </div>

                            <h1 className="text-5xl font-bold text-slate-950 mb-2 leading-tight">
                                Your Performance <br />
                                <span className="font-serif-italic font-normal text-slate-700">Detailed Report.</span>
                            </h1>
                            
                            <div className="mt-10 flex items-end gap-3">
                                <span className="text-[120px] font-black leading-none tracking-tighter text-slate-950">
                                    {session.feedback?.score || 0}
                                </span>
                                <div className="pb-4">
                                    <span className="text-slate-300 text-6xl font-light">/</span>
                                    <span className="text-slate-300 text-4xl font-light">10</span>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest pt-8 border-t border-slate-50">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>Core logic verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Problem Context Card */}
                    <div className="bg-slate-950 rounded-[32px] p-8 text-white">
                        <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-6">Interview Problem</h4>
                        <h2 className="text-2xl font-bold mb-4">{session.question.title}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 italic">
                            "{session.question.description}"
                        </p>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase">Algorithm</span>
                            <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase">Optimized</span>
                        </div>
                    </div>
                </div>

                {/* Right: Feedback & Code */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Qualitative Feedback */}
                    <div className="bg-white rounded-[32px] p-10 border border-slate-100 shadow-xl shadow-slate-200/20">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-10 pb-4 border-b border-slate-50">Technical Feedback</h3>
                        <div className="prose prose-slate prose-blue max-w-none prose-h3:text-lg prose-h3:font-bold prose-h3:mb-4 prose-p:text-sm prose-p:leading-relaxed">
                            <ReactMarkdown>
                                {session.feedback?.feedback_markdown || "No qualitative feedback provided."}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Code Display */}
                    <div className="bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Final Code Solution</span>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                value={session.code}
                                theme="vs-dark"
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 24, bottom: 24 },
                                    scrollBeyondLastLine: false,
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
