"use client";

import { CheckCircle2 } from "lucide-react";

interface WorkoutSummaryProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    date: string;
    durationSeconds: number;
    completedExercises: number;
    totalExercises: number;
    painTrendAvg?: number;
    sessionStreak?: number;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
}

export function WorkoutSummary({
    isOpen,
    onClose,
    title,
    durationSeconds,
    completedExercises,
    totalExercises,
    painTrendAvg,
    sessionStreak,
}: WorkoutSummaryProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">

                {/* Header Ribbon */}
                <div className="bg-emerald-500 p-8 flex flex-col items-center justify-center text-white relative">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                    <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm shadow-sm ring-1 ring-white/30">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight relative z-10">Workout Saved</h2>
                    <p className="text-emerald-50 font-medium mt-1 relative z-10">{title}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Time</span>
                            <span className="text-xl font-black text-neutral-900">{formatDuration(durationSeconds)}</span>
                        </div>
                        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Exercises</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-teal-600">{completedExercises}</span>
                                <span className="text-sm font-bold text-neutral-400">/ {totalExercises}</span>
                            </div>
                        </div>
                    </div>

                    {(sessionStreak || painTrendAvg) && (
                        <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
                            {sessionStreak && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-lg">🔥</div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-900">{sessionStreak} Week Streak</p>
                                        <p className="text-[11px] font-medium text-neutral-500">Consistent logging</p>
                                    </div>
                                </div>
                            )}
                            {sessionStreak && painTrendAvg && <div className="h-px bg-neutral-100" />}
                            {painTrendAvg && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center text-lg">📉</div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-900">{painTrendAvg.toFixed(1)}/10 Avg Pain</p>
                                        <p className="text-[11px] font-medium text-neutral-500">Over last 14 days</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-full bg-neutral-900 text-white font-bold tracking-wide shadow-md hover:bg-neutral-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
