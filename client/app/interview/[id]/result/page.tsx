"use client";

import React, { useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { ArrowLeft, CheckCircle2, Star, Trophy, Brain, Code2, TestTube, Clock, MessageSquare, Target, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface SessionResult {
    question: {
        title: string;
        description: string;
    };
    code: string;
    transcript?: Array<{ role: 'user' | 'ai' | 'assistant'; content: string }>;
    feedback?: {
        overall_score: number;
        correctness: boolean;
        dimension_scores: {
            problem_solving: number;
            algorithmic_thinking: number;
            code_implementation: number;
            testing: number;
            time_management: number;
            communication: number;
        };
        feedback_markdown: string;
    };
}

function parseMarkdownSections(markdown: string) {
    const sections: Record<string, string> = {};
    const lines = markdown.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    lines.forEach(line => {
        if (line.startsWith('### ')) {
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            currentSection = line.replace('### ', '').trim();
            currentContent = [];
        } else if (currentSection) {
            currentContent.push(line);
        }
    });

    if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
}

function extractBullets(text: string): string[] {
    return text.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[-*]\s*/, '').trim());
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

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Analyzing Your Performance...</p>
                </div>
            </div>
        );
    }

    if (!session || !session.feedback) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lightbulb className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Session data not available</h2>
                    <p className="text-slate-500 mb-8">Complete an interview to see your results here.</p>
                    <Link
                        href="/interview/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0066FF] text-white rounded-full font-semibold hover:bg-blue-600 transition-all"
                    >
                        Start New Interview <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    const { feedback, question, code } = session;
    const sections = parseMarkdownSections(feedback.feedback_markdown);

    // Radar chart data
    const radarData = [
        { dimension: 'Problem Solving', score: feedback.dimension_scores.problem_solving },
        { dimension: 'Algorithm', score: feedback.dimension_scores.algorithmic_thinking },
        { dimension: 'Code Quality', score: feedback.dimension_scores.code_implementation },
        { dimension: 'Testing', score: feedback.dimension_scores.testing },
        { dimension: 'Time Mgmt', score: feedback.dimension_scores.time_management },
        { dimension: 'Communication', score: feedback.dimension_scores.communication },
    ];

    const getPerformanceLabel = (score: number) => {
        if (score >= 9) return 'Outstanding';
        if (score >= 7) return 'Excellent';
        if (score >= 5) return 'Good';
        return 'Needs Work';
    };

    const getScoreColor = (score: number) => {
        if (score >= 9) return 'text-emerald-600';
        if (score >= 7) return 'text-blue-600';
        if (score >= 5) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <main className="min-h-screen relative overflow-hidden bg-white">
            {/* Background effects matching home page */}
            <div className="absolute inset-0 bg-grid pointer-events-none opacity-30" />
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-glow-blue blur-[120px] rounded-full opacity-40" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full" />

            {/* Header */}
            <header className="relative z-20 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0">
                <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold">Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                            <span className="text-sm font-bold text-slate-600">{question.title}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
                {/* Hero Score Section */}
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-6">
                        <Star className="w-3 h-3 text-[#0066FF] fill-[#0066FF]" />
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#0066FF]">Interview Complete</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-slate-950 mb-6">
                        {getPerformanceLabel(feedback.overall_score)}
                        <span className="block text-4xl md:text-5xl text-slate-400 font-normal mt-2">
                            Performance
                        </span>
                    </h1>

                    <div className="inline-flex items-center gap-4 px-8 py-6 bg-white rounded-3xl shadow-lg shadow-blue-500/5 border border-slate-100">
                        <div className="text-center">
                            <div className={`text-6xl font-bold ${getScoreColor(feedback.overall_score)}`}>
                                {feedback.overall_score}
                            </div>
                            <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mt-1">
                                Out of 10
                            </div>
                        </div>
                        {feedback.correctness && (
                            <>
                                <div className="w-px h-16 bg-slate-200" />
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50" />
                                    <span className="text-sm font-bold text-emerald-600">Correct Solution</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Skills Radar */}
                <div className="mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-950 mb-3">Skills Analysis</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">
                            Your performance across 6 key dimensions evaluated by our AI interviewer
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100">
                        <ResponsiveContainer width="100%" height={400}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis
                                    dataKey="dimension"
                                    tick={{ fill: '#64748b', fontSize: 14, fontWeight: 600 }}
                                />
                                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Radar
                                    name="Score"
                                    dataKey="score"
                                    stroke="#0066FF"
                                    fill="#0066FF"
                                    fillOpacity={0.15}
                                    strokeWidth={3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>

                        {/* Dimension breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                            {[
                                { key: 'problem_solving', label: 'Problem Solving', icon: Brain },
                                { key: 'algorithmic_thinking', label: 'Algorithm', icon: Target },
                                { key: 'code_implementation', label: 'Code Quality', icon: Code2 },
                                { key: 'testing', label: 'Testing', icon: TestTube },
                                { key: 'time_management', label: 'Time Mgmt', icon: Clock },
                                { key: 'communication', label: 'Communication', icon: MessageSquare },
                            ].map(({ key, label, icon: Icon }) => {
                                const score = feedback.dimension_scores[key as keyof typeof feedback.dimension_scores];
                                return (
                                    <div key={key} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Icon className="w-4 h-4 text-[#0066FF]" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                                            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}/10</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Feedback Sections */}
                <div className="grid md:grid-cols-2 gap-8 mb-20">
                    {/* Strengths */}
                    {sections.Strengths && (
                        <div className="bg-emerald-50/50 rounded-3xl p-10 border border-emerald-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-emerald-500 rounded-xl">
                                    <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-950">Strengths</h3>
                            </div>
                            <ul className="space-y-3">
                                {extractBullets(sections.Strengths).map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-slate-700 leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Areas for Improvement */}
                    {sections['Areas for Improvement'] && (
                        <div className="bg-amber-50/50 rounded-3xl p-10 border border-amber-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-amber-500 rounded-xl">
                                    <Lightbulb className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-950">Growth Areas</h3>
                            </div>
                            <ul className="space-y-3">
                                {extractBullets(sections['Areas for Improvement']).map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-amber-700">{i + 1}</span>
                                        </div>
                                        <span className="text-slate-700 leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Detailed Analysis Sections */}
                <div className="space-y-8 mb-20">
                    <h2 className="text-3xl font-bold text-slate-950 mb-8">Detailed Performance Analysis</h2>

                    {sections['Problem-Solving'] || sections['Problem-Solving Approach'] ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Target className="w-6 h-6 text-[#0066FF]" />
                                <h3 className="text-2xl font-bold text-slate-950">Problem-Solving Approach</h3>
                            </div>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                {sections['Problem-Solving'] || sections['Problem-Solving Approach'] || sections.Summary}
                            </p>
                        </div>
                    ) : null}

                    {sections['Code Quality'] || sections['Code Implementation'] ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Code2 className="w-6 h-6 text-[#0066FF]" />
                                <h3 className="text-2xl font-bold text-slate-950">Code Quality Analysis</h3>
                            </div>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                {sections['Code Quality'] || sections['Code Implementation']}
                            </p>
                        </div>
                    ) : null}

                    {sections['Algorithmic Thinking'] ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Brain className="w-6 h-6 text-[#0066FF]" />
                                <h3 className="text-2xl font-bold text-slate-950">Algorithmic Thinking</h3>
                            </div>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                {sections['Algorithmic Thinking']}
                            </p>
                        </div>
                    ) : null}

                    {sections.Communication ? (
                        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                                <MessageSquare className="w-6 h-6 text-[#0066FF]" />
                                <h3 className="text-2xl font-bold text-slate-950">Communication Assessment</h3>
                            </div>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                {sections.Communication}
                            </p>
                        </div>
                    ) : null}

                    {/* Overall Summary */}
                    {sections.Summary && (
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-12 shadow-sm border border-blue-100">
                            <div className="flex items-center gap-3 mb-6">
                                <Sparkles className="w-7 h-7 text-[#0066FF]" />
                                <h3 className="text-3xl font-bold text-slate-950">Executive Summary</h3>
                            </div>
                            <div className="prose prose-lg prose-slate max-w-none">
                                <p className="text-slate-700 leading-relaxed text-lg font-medium">{sections.Summary}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Interview Transcript */}
                {session.transcript && session.transcript.length > 0 ? (
                    <div className="bg-slate-950 rounded-3xl p-10 mb-20 overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <MessageSquare className="w-7 h-7 text-white" />
                            <h3 className="text-3xl font-bold text-white">Interview Transcript</h3>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            {session.transcript.map((msg: any, idx: number) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-5 ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                                        }`}>
                                        <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">
                                            {msg.role === 'user' ? 'You' : 'Socratis'}
                                        </div>
                                        <div className="text-sm leading-relaxed">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-100 rounded-3xl p-12 mb-20 text-center">
                        <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500 text-lg">
                            No transcript available for this session.
                            <br />
                            <span className="text-sm">Enable voice interaction in your next interview to see conversation history.</span>
                        </p>
                    </div>
                )}


                {/* Code Display */}
                <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-xl mb-20">
                    <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">Your Solution</h3>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                            <Code2 className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-mono text-slate-300">JavaScript</span>
                        </div>
                    </div>
                    <Editor
                        height="400px"
                        language="javascript"
                        value={code}
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
                    />
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Link
                        href="/interview/new"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#0066FF] text-white rounded-full font-bold text-lg hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25"
                    >
                        Practice Another Problem <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            <footer className="relative z-10 py-12 border-t border-slate-100 text-center text-slate-400 text-sm">
                <p>© 2026 Socratis Labs. Designed for elite engineers.</p>
            </footer>
        </main>
    );
}
