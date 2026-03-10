"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface ExerciseNavProps {
    currentIndex: number;
    totalExercises: number;
    exerciseName: string;
    onPrev: () => void;
    onNext: () => void;
    onAddExercise: () => void;
    completedIndices: Set<number>;
}

export function ExerciseNav({
    currentIndex,
    totalExercises,
    exerciseName,
    onPrev,
    onNext,
    onAddExercise,
    completedIndices,
}: ExerciseNavProps) {
    return (
        <div className="flex flex-col items-center gap-3">
            {/* Prev/Next Bar */}
            <div className="flex items-center justify-between w-full max-w-sm mx-auto">
                <button
                    onClick={onPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 p-2 text-sm font-bold text-neutral-600 disabled:opacity-30 transition-opacity"
                >
                    <ChevronLeft className="h-5 w-5" />
                    Prev
                </button>

                <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalExercises }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all ${i === currentIndex
                                    ? "w-4 bg-teal-600"
                                    : completedIndices.has(i)
                                        ? "w-2 bg-teal-500/40"
                                        : "w-2 bg-neutral-200"
                                }`}
                        />
                    ))}
                    <button
                        onClick={onAddExercise}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition-colors ml-1"
                    >
                        <Plus className="h-3 w-3" />
                    </button>
                </div>

                <button
                    onClick={onNext}
                    disabled={currentIndex === totalExercises - 1}
                    className="flex items-center gap-1 p-2 text-sm font-bold text-neutral-600 disabled:opacity-30 transition-opacity"
                >
                    Next
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Current Exercise Name Label */}
            <div className="text-sm font-semibold text-neutral-900 text-center">
                {exerciseName || "Unnamed Exercise"}
            </div>
        </div>
    );
}
