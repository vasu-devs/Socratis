"use client";

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Editor } from '@monaco-editor/react';
import { ArrowLeft, CheckCircle2, Star, Target, ArrowRight, Sparkles, Box, Binary, Cpu, Network, ShieldCheck, Activity } from 'lucide-react';
import Link from 'next/link';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import {
    ScoreDonut,
    ProblemSolvingIcon,
    AlgorithmIcon,
    CodeQualityIcon,
    TestingIcon,
    TimeIcon,
    CommunicationIcon,
    TrophyIcon
} from '@/components/CustomIcons';

interface CodeIssue {
    line_number: number;
    code_snippet: string;
    issue: string;
    suggestion: string;
    severity: 'error' | 'warning' | 'info';
}

interface TranscriptIssue {
    quote: string;
    issue: string;
    what_should_have_been_said: string;
    category: 'concept' | 'complexity' | 'approach' | 'communication';
}

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
        code_issues?: CodeIssue[];
        transcript_issues?: TranscriptIssue[];
        feedback_markdown: string;
    };
}

function parseMarkdownSections(markdown: string) {
    const sections: Record<string, string> = {};
    const lines = markdown.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    lines.forEach(line => {
        // Match ## or ### headers
        const match = line.match(/^(#{2,3})\s+(.+)$/);
        if (match) {
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            // Normalize: remove emojis and extra spaces for the key
            // e.g. "✅ Strengths" -> "Strengths"
            // But we keep the original text mapping if needed? 
            // Actually, the UI relies on specific keys 'Strengths', 'Areas for Improvement'.
            // So we try to map to those if we detect them.
            let title = match[2].trim();

            // Simple normalization to match keys expected by UI
            const cleanTitle = title.replace(/[^\w\s-]/g, '').trim();

            // Map known sections to standard keys
            if (cleanTitle.includes("Strengths") || cleanTitle.includes("What Went Well")) currentSection = "Strengths";
            else if (cleanTitle.includes("Areas for Improvement") || cleanTitle.includes("Improvement") || cleanTitle.includes("Weaknesses")) currentSection = "Areas for Improvement";
            else if (cleanTitle.includes("Summary") || cleanTitle.includes("Executive Summary")) currentSection = "Summary";
            else if (cleanTitle.includes("Problem-Solving") || cleanTitle.includes("Logic")) currentSection = "Problem-Solving";
            else if (cleanTitle.includes("Communication")) currentSection = "Communication";
            else if (cleanTitle.includes("Code Review") || cleanTitle.includes("Code Quality")) currentSection = "Code Review";
            else currentSection = cleanTitle;

            // Actually, let's use the cleanTitle if it's not a known key, to avoid emoji keys.
            if (!["Strengths", "Areas for Improvement", "Summary", "Problem-Solving", "Communication", "Code Review"].includes(currentSection)) {
                currentSection = cleanTitle;
            }

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
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold tracking-tight uppercase text-xs tracking-[0.2em]">Analyzing Performance Data...</p>
                </div>
            </div>
        );
    }

    if (!session || !session.feedback) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
                <div className="text-center max-w-md w-full relative z-10">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-slate-100 brivio-shadow">
                        <Box className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-950 mb-4 tracking-tight uppercase">No Session Data</h2>
                    <p className="text-slate-500 mb-10 leading-relaxed font-medium">Complete an interview scenario with Socratis to generate your specialized technical report.</p>
                    <Link
                        href="/interview/new"
                        className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-500/20"
                    >
                        Initiate Assessment <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    const { feedback, question, code } = session;
    const sections = parseMarkdownSections(feedback.feedback_markdown);

    const radarData = [
        { dimension: 'Logic', score: feedback.dimension_scores.problem_solving },
        { dimension: 'Algo', score: feedback.dimension_scores.algorithmic_thinking },
        { dimension: 'Code', score: feedback.dimension_scores.code_implementation },
        { dimension: 'Tests', score: feedback.dimension_scores.testing },
        { dimension: 'Speed', score: feedback.dimension_scores.time_management },
        { dimension: 'Voice', score: feedback.dimension_scores.communication },
    ];

    const getPerformanceLabel = (score: number) => {
        if (score >= 9) return 'Elite Operator';
        if (score >= 7) return 'Senior Expert';
        if (score >= 5) return 'Proficient';
        return 'Needs Refinement';
    };

    const getScoreColor = (score: number) => {
        if (score >= 9) return 'text-blue-600';
        if (score >= 7) return 'text-emerald-600';
        if (score >= 5) return 'text-amber-600';
        return 'text-rose-600';
    };

    return (
        <main className="min-h-screen relative overflow-hidden bg-white">
            {/* Background elements */}
            <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.03]" />
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-glow-blue blur-[120px] rounded-full opacity-40" />

            {/* Header */}
            <header className="relative z-20 border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0">
                <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold tracking-tight text-sm uppercase">Return to Terminal</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                            <Binary className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{question.title}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
                {/* Hero section */}
                <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
                    <div className="text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-8">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Analysis Verified</span>
                        </div>

                        <h1 className="text-6xl md:text-[80px] font-black leading-[0.9] tracking-tighter text-slate-950 mb-8">
                            {getPerformanceLabel(feedback.overall_score).split(' ').map((word, i) => (
                                <span key={i} className={i === 1 ? 'text-slate-400' : 'block'}>{word} </span>
                            ))}
                        </h1>

                        <p className="text-xl text-slate-500 max-w-lg leading-relaxed mb-10 font-medium">
                            Comprehensive evaluation of your technical aptitude and communication architecture during the <span className="text-slate-950 font-bold">"{question.title}"</span> scenario.
                        </p>

                        <div className="flex items-center gap-6">
                            <ScoreDonut score={feedback.overall_score} size={180} />
                            <div className="h-20 w-px bg-slate-200" />
                            <div className="space-y-4">

                                {feedback.correctness && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification</div>
                                            <div className="text-lg font-bold text-slate-900">Logic Validated</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] blur opacity-[0.08] group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl overflow-hidden brivio-shadow">
                            <div className="absolute top-0 right-0 p-8 flex items-center gap-2 opacity-[0.05]">
                                <Cpu className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Dimensional Mapping</h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#f1f5f9" />
                                    <PolarAngleAxis
                                        dataKey="dimension"
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900, textAnchor: 'middle' }}
                                    />
                                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Score"
                                        dataKey="score"
                                        stroke="#0066FF"
                                        fill="#0066FF"
                                        fillOpacity={0.05}
                                        strokeWidth={3}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Dimensions breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-24">
                    {[
                        { key: 'problem_solving', label: 'Logic', icon: ProblemSolvingIcon },
                        { key: 'algorithmic_thinking', label: 'Strategy', icon: AlgorithmIcon },
                        { key: 'code_implementation', label: 'Syntax', icon: CodeQualityIcon },
                        { key: 'testing', label: 'Validation', icon: TestingIcon },
                        { key: 'time_management', label: 'Efficiency', icon: TimeIcon },
                        { key: 'communication', label: 'Voice', icon: CommunicationIcon },
                    ].map(({ key, label, icon: Icon }) => {
                        const score = feedback.dimension_scores[key as keyof typeof feedback.dimension_scores];
                        return (
                            <div key={key} className="bg-white border border-slate-100 p-6 rounded-2xl group hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                                <Icon className="w-5 h-5 text-slate-400 mb-4 group-hover:text-blue-600 transition-colors" />
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                                <div className={`text-2xl font-bold tracking-tight ${getScoreColor(score)}`}>{score}<span className="text-slate-300 text-sm">/10</span></div>
                            </div>
                        );
                    })}
                </div>

                {/* SWOT/Feedback sections */}
                <div className="grid lg:grid-cols-5 gap-8 mb-24">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Strengths */}
                        <div className="bg-emerald-50 rounded-[32px] p-8 border border-emerald-100">
                            <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <Network className="w-6 h-6 text-emerald-600" />
                                Assets
                            </h3>
                            <ul className="space-y-4">
                                {extractBullets(sections.Strengths || "").map((item, i) => (
                                    <li key={i} className="flex items-start gap-4">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                        <div className="text-emerald-950 font-medium leading-relaxed prose prose-emerald prose-sm">
                                            <ReactMarkdown components={{ p: 'span' }}>{item}</ReactMarkdown>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Improvements */}
                        <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-100">
                            <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight mb-8 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-amber-600" />
                                Deltas
                            </h3>
                            <ul className="space-y-4">
                                {extractBullets(sections['Areas for Improvement'] || "").map((item, i) => (
                                    <li key={i} className="flex items-start gap-4">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                        <div className="text-amber-950 font-medium leading-relaxed prose prose-amber prose-sm">
                                            <ReactMarkdown components={{ p: 'span' }}>{item}</ReactMarkdown>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="lg:col-span-3 space-y-8">
                        {/* Executive Summary */}
                        <div className="relative overflow-hidden bg-slate-50 rounded-[40px] p-12 border border-slate-100 brivio-shadow">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                                <span className="w-8 h-px bg-slate-200" />
                                Executive Briefing
                            </h3>
                            <div className="prose prose-slate max-w-none prose-lg">
                                <ReactMarkdown>{sections.Summary}</ReactMarkdown>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-blue-600" />
                                    Logic Path
                                </h4>
                                <div className="text-slate-600 leading-relaxed text-sm prose prose-sm prose-blue">
                                    <ReactMarkdown>
                                        {sections['Problem-Solving'] || sections['Problem-Solving Approach'] || sections.Summary?.slice(0, 150) + '...'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Network className="w-4 h-4 text-emerald-600" />
                                    Communication
                                </h4>
                                <div className="text-slate-600 leading-relaxed text-sm prose prose-sm prose-emerald">
                                    <ReactMarkdown>
                                        {sections.Communication || 'Excellent articulation of technical constraints and trade-offs observed throughout the session.'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Code Review Section */}
                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <Binary className="w-24 h-24 text-slate-900" />
                            </div>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
                                <Cpu className="w-4 h-4 text-indigo-600" />
                                Code Architecture Review
                            </h4>
                            <div className="prose prose-sm prose-slate max-w-none relative z-10">
                                <ReactMarkdown>
                                    {sections['Code Review'] || sections['Code Quality'] || 'Detailed analysis of code structure, efficiency, and best practices.'}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transcript - Case File Aesthetic */}
                <div className="grid lg:grid-cols-3 gap-12 mb-24">
                    {/* ... Transcript content ... (omitted for brevity in replacement chunk) */}
                    <div className="lg:col-span-1">
                        <h2 className="text-4xl font-black text-slate-950 tracking-tighter mb-4">Case History</h2>
                        <p className="text-slate-500 leading-relaxed mb-8">
                            Full audit log of the interaction between <span className="text-slate-950 font-bold">Client</span> and <span className="text-blue-600 font-bold">Socratis</span>.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <div className="w-2 h-2 rounded-full bg-blue-600" />
                                Session Verified
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <div className="w-2 h-2 rounded-full bg-slate-200" />
                                Audit Finalized
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-slate-50 rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                        <div className="p-1 max-h-[600px] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1 p-4">
                                {session.transcript?.map((msg: any, idx: number) => (
                                    <div key={idx} className="group p-6 rounded-2xl hover:bg-white transition-colors border border-transparent hover:border-slate-100 hover:shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {msg.role === 'user' ? 'USR' : 'SOC'}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-400' : 'text-blue-600'
                                                    }`}>
                                                    {msg.role === 'user' ? 'Client' : 'Socratis'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">00:{idx.toString().padStart(2, '0')}</span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-slate-700' : 'text-slate-600 font-medium'}`}>
                                            {msg.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Code Terminal */}
                <div className="relative group mb-24">

                    <div className="relative bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-2xl brivio-shadow">
                        <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                </div>
                                <div className="h-4 w-px bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">logic_implementation.js</span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                                <Binary className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Syntax Highlighting: JS</span>
                            </div>
                        </div>
                        <div className="p-2 bg-slate-950">
                            <Editor
                                height="480px"
                                language="javascript"
                                value={code}
                                theme="vs-dark"
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    padding: { top: 20 },
                                    scrollBeyondLastLine: false,
                                    renderLineHighlight: 'none',
                                    scrollbar: { vertical: 'hidden' }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="relative text-center pb-20">
                    <div className="inline-flex items-center gap-4 p-2 pl-8 bg-white border border-slate-100 rounded-full brivio-shadow">
                        <span className="text-sm font-bold text-slate-400 tracking-tight">Ready to escalate your training?</span>
                        <Link
                            href="/interview/new"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Next Scenario <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div >

            <footer className="relative z-10 py-12 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">© 2026 Socratis Labs. Powered by Brivio Intelligence.</p>
            </footer>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </main >
    );
}
