"use client";

import { useEffect, useState } from "react";
import { X, FastForward, Rewind } from "lucide-react";

interface RestTimerProps {
    isRunning: boolean;
    remainingSeconds: number;
    onSkip: () => void;
    onAdjust: (delta: number) => void;
    onClose: () => void;
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RestTimer({
    isRunning,
    remainingSeconds,
    onSkip,
    onAdjust,
    onClose,
}: RestTimerProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted || remainingSeconds <= 0) return null;

    return (
        <div className="fixed inset-x-0 top-24 z-50 mx-auto w-[90%] max-w-sm pointer-events-none">
            {/* Overlay card */}
            <div className="bg-neutral-900/90 backdrop-blur-md rounded-3xl p-4 shadow-xl text-white pointer-events-auto border border-neutral-700/50 animate-in slide-in-from-top-4 fade-in duration-300">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Rest Timer</span>
                    <button onClick={onClose} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Timer Display */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="text-5xl font-bold tracking-tighter tabular-nums mb-2">
                        {formatTime(remainingSeconds)}
                    </div>
                    {/* Simple progress bar */}
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-teal-400 transition-all duration-1000 ease-linear"
                            style={{ width: `${Math.min(100, (remainingSeconds / 120) * 100)}%` }} // assume 120s max for progress
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={() => onAdjust(-15)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                    >
                        <Rewind className="h-3.5 w-3.5" /> -15s
                    </button>
                    <button
                        onClick={onSkip}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-xs font-bold transition-colors shadow-sm"
                    >
                        <FastForward className="h-3.5 w-3.5" /> Skip
                    </button>
                    <button
                        onClick={() => onAdjust(15)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                    >
                        +15s <FastForward className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
