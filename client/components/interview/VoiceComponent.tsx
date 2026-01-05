import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
interface VoiceComponentProps {
    isConnected: boolean;
    isSpeaking: boolean;
    transcript: Array<{ role: 'ai' | 'user'; content: string }>;
    onStart: () => void;
    onStop: () => void;
}

export const VoiceComponent: React.FC<VoiceComponentProps> = ({
    isConnected,
    isSpeaking,
    transcript,
    onStart,
    onStop
}) => {

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Interviewer AI</h2>
                <button
                    onClick={() => {
                        if (isConnected) {
                            onStop();
                        } else {
                            onStart();
                        }
                    }}
                    className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 font-medium ${isConnected
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                >
                    {isConnected ? (
                        <>
                            <PhoneOff size={18} />
                            End Call
                        </>
                    ) : (
                        <>
                            <Phone size={18} />
                            Start Interview
                        </>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'ai'
                            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            : 'bg-blue-500 text-white'
                            }`}>
                            <p className="text-sm">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {transcript.length === 0 && (
                    <div className="text-center text-slate-400 mt-10">
                        <p>Click the phone icon to start the interview.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                {isConnected && (
                    <div className="flex items-center gap-2 justify-center text-sm text-slate-500">
                        <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        {isSpeaking ? 'AI is speaking...' : 'AI is listening...'}
                    </div>
                )}
            </div>
        </div>
    );
};
