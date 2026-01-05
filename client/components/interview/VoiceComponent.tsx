import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, User, Radio } from 'lucide-react';

interface VoiceComponentProps {
    isConnected: boolean;
    isSpeaking: boolean;
    isMuted: boolean;
    transcript: Array<{ role: 'ai' | 'user'; content: string }>;
    onStart: () => void;
    onStop: () => void;
    onToggleMute: () => void;
}

export const VoiceComponent: React.FC<VoiceComponentProps> = ({
    isConnected,
    isSpeaking,
    isMuted,
    transcript,
    onStart,
    onStop,
    onToggleMute
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm">
            {/* Call Status Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100/50">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                        {isConnected ? (isSpeaking ? 'Socratis is speaking' : 'Socratis is listening') : 'Interview Offline'}
                    </span>
                </div>
                {isConnected && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onToggleMute}
                            className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-50 text-red-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        >
                            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button 
                            onClick={onStop}
                            className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                        >
                            <PhoneOff size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Avatars Section (Brivio Style) */}
            <div className="pt-8 pb-4 flex justify-center items-center gap-12 shrink-0">
                <div className="flex flex-col items-center gap-3">
                    <div className={`relative w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center border-2 transition-all duration-500 ${isSpeaking ? 'border-blue-500 scale-110 shadow-xl shadow-blue-500/10' : 'border-slate-100 opacity-60'}`}>
                        <Radio className={`w-10 h-10 ${isSpeaking ? 'text-blue-500' : 'text-slate-300'}`} />
                        {isSpeaking && (
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-20" />
                        )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Socratis</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <div className={`w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border-2 transition-all duration-500 ${(!isSpeaking && isConnected) ? 'border-slate-400 scale-110' : 'border-slate-100 opacity-60'}`}>
                        <User className="w-10 h-10 text-slate-300" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">You</span>
                </div>
            </div>

            {/* Transcript Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scroll-smooth">
                {transcript.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 text-[13px] leading-relaxed transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                            msg.role === 'ai' 
                            ? 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none' 
                            : 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                
                {transcript.length === 0 && !isConnected && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-8 opacity-40 grayscale">
                         <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Radio className="w-8 h-8 text-slate-400" />
                         </div>
                         <p className="text-sm font-medium">Interview ready when you are.</p>
                         <button 
                            onClick={onStart} 
                            className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all uppercase tracking-widest"
                         >
                            Check Connection
                         </button>
                    </div>
                )}
            </div>
            
            {/* Visual Indicator Layer */}
            <div className="h-1 bg-slate-50 relative overflow-hidden shrink-0">
                {isConnected && (
                    <div className={`absolute inset-0 bg-blue-500/20 transition-all duration-1000 ${isSpeaking ? 'translate-x--full' : 'translate-x-0'}`} />
                )}
            </div>
        </div>
    );
};
