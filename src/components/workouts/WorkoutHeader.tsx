"use client";

import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { TrainingPlanVersion } from "../../lib/training";

interface WorkoutHeaderProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    onShiftDate: (amount: number) => void;
    onJumpToToday: () => void;
    formatDateLabel: (date: string) => string;
    selectedPlan: TrainingPlanVersion | undefined;
    completedExercises: number;
    totalExercises: number;
    onOpenSessionMeta: () => void;
    elapsedSeconds?: number;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WorkoutHeader({
    selectedDate,
    onDateChange,
    onShiftDate,
    onJumpToToday,
    formatDateLabel,
    selectedPlan,
    completedExercises,
    totalExercises,
    onOpenSessionMeta,
    elapsedSeconds,
}: WorkoutHeaderProps) {
    const isToday = new Date(selectedDate).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

    return (
        <div className="sticky top-[73px] z-40 bg-white/95 pb-4 pt-4 shadow-sm backdrop-blur-xl border-b border-neutral-200">
            <div className="flex flex-col gap-2 px-4 md:px-8 max-w-6xl mx-auto">
                {/* Row 1: Nav + Timer + Info */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onShiftDate(-1)}
                            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors rounded-full hover:bg-neutral-100"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="absolute inset-0 opacity-0 w-full cursor-pointer h-full"
                            />
                            <span className="text-lg font-bold text-neutral-900 pointer-events-none">
                                {formatDateLabel(selectedDate)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => onShiftDate(1)}
                            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors rounded-full hover:bg-neutral-100"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>

                        {!isToday && (
                            <button
                                onClick={onJumpToToday}
                                className="ml-2 text-[11px] font-bold tracking-wide uppercase px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            >
                                Today
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {elapsedSeconds !== undefined && elapsedSeconds > 0 && (
                            <div className="text-sm font-semibold text-neutral-600 tabular-nums">
                                <span className="mr-1">⏱</span>
                                {formatDuration(elapsedSeconds)}
                            </div>
                        )}
                        <button
                            onClick={onOpenSessionMeta}
                            className="w-10 h-10 flex items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 shadow-sm"
                            aria-label="Session Info"
                        >
                            <Info className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Row 2: Program Context & Progress */}
                <div className="flex items-center justify-between pl-10 pr-2">
                    <div className="text-sm font-semibold text-teal-700 truncate max-w-[200px]">
                        {selectedPlan ? selectedPlan.title : "No Active Program"}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Progress indicators */}
                        <div className="flex gap-1 items-center mr-2">
                            {Array.from({ length: Math.min(totalExercises, 10) }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-colors ${i < completedExercises
                                            ? "bg-teal-500 w-3"
                                            : "bg-neutral-200 w-1.5"
                                        }`}
                                />
                            ))}
                            {totalExercises > 10 && <span className="text-[10px] text-neutral-400 font-bold ml-1">+{totalExercises - 10}</span>}
                        </div>
                        <span className="text-[11px] font-bold text-neutral-500">
                            {completedExercises}/{Math.max(totalExercises, 1)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
