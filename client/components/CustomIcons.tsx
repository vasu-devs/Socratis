import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
}

export const ProblemSolvingIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
);

export const AlgorithmIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 4H10V10H4V4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M14 14H20V20H14V14Z" stroke="currentColor" strokeWidth="2" />
        <path d="M10 7H17V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
        <circle cx="17" cy="7" r="2" fill="currentColor" />
        <circle cx="7" cy="17" r="2" fill="currentColor" />
    </svg>
);

export const CodeQualityIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M7 8L3 12L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 8L21 12L17 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 4L10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 12H16" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
);

export const TestingIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 3H15M10 3V8M14 3V8M6 8H18L15 21H9L6 8Z" stroke="currentColor" strokeWidth="2" />
        <path d="M10 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 16V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="5" r="1" fill="currentColor" />
    </svg>
);

export const TimeIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const CommunicationIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 12C4 12 7 8 12 8C17 8 20 12 20 12C20 12 17 16 12 16C7 16 4 12 4 12Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M2 12H4M20 12H22M12 2V4M12 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 4L6 6M18 18L20 20M4 20L6 18M18 6L20 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </svg>
);

export const TrophyIcon = ({ size = 24, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M6 9H4V12C4 13.1046 4.89543 14 6 14V14M18 9H20V12C20 13.1046 19.1046 14 18 14V14" stroke="currentColor" strokeWidth="2" />
        <path d="M6 4H18V14C18 17.3137 15.3137 20 12 20C8.68629 20 6 17.3137 6 14V4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M9 22H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 20V22" stroke="currentColor" strokeWidth="2" />
    </svg>
);

export const ScoreDonut = ({ score, size = 160 }: { score: number, size?: number }) => {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 10) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="text-blue-600 drop-shadow-[0_0_4px_rgba(0,102,255,0.2)] transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-900 tracking-tighter">{score}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">Rating</span>
            </div>
        </div>
    );
};
