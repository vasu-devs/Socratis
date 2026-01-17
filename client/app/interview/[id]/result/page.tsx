"use client";

import React, { useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { ArrowLeft, CheckCircle2, ChevronRight, Share2, Sparkles, Trophy, TrendingUp, Brain, Code2, TestTube, Clock, MessageSquare, Target, AlertCircle, Lightbulb, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface SessionResult {
    question: {
        title: string;
        description: string;
    };
    code: string;
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

// Helper function to parse markdown into structured sections
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

// Extract bullet points from text
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-white">
            <div className="bg-grid absolute inset-0 opacity-40 pointer-events-none" />
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Generating Your Smart Report...</p>
        </div>
    );

    if (!session || !session.feedback) return <div className="p-20 text-center text-red-500">Session data not available.</div>;

    const dimensions = session.feedback.dimension_scores;
    const radarData = [
        { dimension: 'Problem Solving', score: dimensions.problem_solving, fullMark: 10 },
        { dimension: 'Algorithmic', score: dimensions.algorithmic_thinking, fullMark: 10 },
        { dimension: 'Code Quality', score: dimensions.code_implementation, fullMark: 10 },
        { dimension: 'Testing', score: dimensions.testing, fullMark: 10 },
        { dimension: 'Time Mgmt', score: dimensions.time_management, fullMark: 10 },
        { dimension: 'Communication', score: dimensions.communication, fullMark: 10 },
    ];

    const barData = [
        { name: 'Problem Solving', score: dimensions.problem_solving, icon: Brain },
        { name: 'Algorithmic', score: dimensions.algorithmic_thinking, icon: Target },
        { name: 'Code Quality', score: dimensions.code_implementation, icon: Code2 },
        { name: 'Testing', score: dimensions.testing, icon: TestTube },
        { name: 'Time Mgmt', score: dimensions.time_management, icon: Clock },
        { name: 'Communication', score: dimensions.communication, icon: MessageSquare },
    ];

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 6) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (score >= 4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getBarColor = (score: number) => {
        if (score >= 8) return '#10b981';
        if (score >= 6) return '#3b82f6';
        if (score >= 4) return '#f59e0b';
        return '#ef4444';
    };

    // Parse feedback sections
    const sections = parseMarkdownSections(session.feedback.feedback_markdown);
    const strengths = extractBullets(sections['Strengths'] || '');
    const improvements = extractBullets(sections['Areas for Improvement'] || sections['Areas for improvement'] || '');
    const nextSteps = extractBullets(sections['Recommended Next Steps'] || '');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
            <div className="bg-grid absolute inset-0 opacity-20 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm font-medium">Smart Report</span>
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

            <main className="relative z-10 max-w-7xl mx-auto px-8 py-8">
                {/* Top Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Overall Score Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white col-span-1 md:col-span-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10">
                            <Trophy size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider opacity-90">Overall Performance</span>
                            </div>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-7xl font-black">{session.feedback.overall_score}</span>
                                <span className="text-3xl font-light opacity-70 pb-2">/10</span>
                            </div>
                            <p className="text-sm opacity-90">
                                {session.feedback.overall_score >= 8 ? 'Excellent Performance! 🎉' :
                                    session.feedback.overall_score >= 6 ? 'Good Work! Keep Improving 👍' :
                                        'Room for Growth 💪'}
                            </p>
                        </div>
                    </div>

                    {/* Correctness Card */}
                    <div className={`rounded-3xl p-6 border-2 ${session.feedback.correctness ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            {session.feedback.correctness ?
                                <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            }
                            <span className={`text-xs font-bold uppercase tracking-wider ${session.feedback.correctness ? 'text-green-700' : 'text-red-700'}`}>
                                Correctness
                            </span>
                        </div>
                        <p className={`text-2xl font-bold ${session.feedback.correctness ? 'text-green-700' : 'text-red-700'}`}>
                            {session.feedback.correctness ? 'PASS ✓' : 'FAIL ✗'}
                        </p>
                        <p className={`text-xs mt-1 ${session.feedback.correctness ? 'text-green-600' : 'text-red-600'}`}>
                            {session.feedback.correctness ? 'Logic verified' : 'Needs fixes'}
                        </p>
                    </div>

                    {/* Top Dimension Card */}
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-3xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Top Skill</span>
                        </div>
                        {(() => {
                            const topDim = Object.entries(dimensions).reduce((a, b) => a[1] > b[1] ? a : b);
                            return (
                                <>
                                    <p className="text-lg font-bold text-purple-700">
                                        {topDim[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                    <p className="text-2xl font-black text-purple-600">{topDim[1]}/10</p>
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Radar Chart */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">6-Dimension Analysis</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Dimension Breakdown */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Score Breakdown</h3>
                            <div className="space-y-4">
                                {barData.map((dim, idx) => {
                                    const Icon = dim.icon;
                                    return (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Icon size={16} className="text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-slate-700">{dim.name}</span>
                                                    <span className="text-sm font-bold text-slate-900">{dim.score}/10</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${dim.score * 10}%`,
                                                            backgroundColor: getBarColor(dim.score)
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Problem Context */}
                        <div className="bg-slate-950 rounded-3xl p-8 text-white">
                            <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-4">Interview Problem</h4>
                            <h2 className="text-2xl font-bold mb-3">{session.question.title}</h2>
                            <p className="text-slate-400 text-sm leading-relaxed italic">
                                "{session.question.description}"
                            </p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Strengths */}
                        {strengths.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider">Key Strengths</h3>
                                </div>
                                <ul className="space-y-3">
                                    {strengths.slice(0, 5).map((strength, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <span className="text-green-600 mt-0.5">✓</span>
                                            <span className="text-sm text-green-900 leading-relaxed">{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Areas for Improvement */}
                        {improvements.length > 0 && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Areas for Improvement</h3>
                                </div>
                                <ul className="space-y-3">
                                    {improvements.slice(0, 5).map((improvement, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <span className="text-amber-600 mt-0.5">→</span>
                                            <span className="text-sm text-amber-900 leading-relaxed">{improvement}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Next Steps */}
                        {nextSteps.length > 0 && (
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <Lightbulb className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider">Recommended Next Steps</h3>
                                </div>
                                <ul className="space-y-3">
                                    {nextSteps.slice(0, 5).map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <span className="text-sm text-blue-900 leading-relaxed">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Summary */}
                        {sections['Summary'] && (
                            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Executive Summary</h3>
                                <p className="text-slate-700 leading-relaxed">{sections['Summary']}</p>
                            </div>
                        )}

                        {/* Code Display */}
                        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                            <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Final Code Solution</span>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
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
                </div>
            </main>
        </div>
    );
}
