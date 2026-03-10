"use client";

import { Info, Plus, AlertCircle } from "lucide-react";
import { SetDraft, WorkoutExerciseDraft } from "./types";
import { WorkoutExerciseStatus } from "../../lib/training";
import { SetRow } from "./SetRow";
import { useState } from "react";

interface ExerciseCardProps {
    exercise: WorkoutExerciseDraft;
    exerciseIndex: number;
    onUpdateExercise: (exerciseId: string, updater: (ex: WorkoutExerciseDraft) => WorkoutExerciseDraft) => void;
    onAddSet: (exerciseId: string) => void;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    onUpdateSet: (exerciseId: string, setId: string, field: keyof SetDraft, value: string) => void;
    onSetCompleted?: (exerciseId: string, setId: string) => void;
}

export function ExerciseCard({
    exercise,
    exerciseIndex,
    onUpdateExercise,
    onAddSet,
    onRemoveSet,
    onUpdateSet,
    onSetCompleted,
}: ExerciseCardProps) {
    const isCustom = !exercise.plan_exercise_id;
    const disableActualFields = exercise.status === "skipped";

    // Track completed sets locally in the card for animation/timer triggers
    const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());

    const handleToggleSetComplete = (setId: string, isCompleted: boolean) => {
        const newCompleted = new Set(completedSets);
        if (isCompleted) {
            newCompleted.add(setId);
            onSetCompleted?.(exercise.exercise_id, setId); // Trigger rest timer
        } else {
            newCompleted.delete(setId);
        }
        setCompletedSets(newCompleted);

        // Auto-mark exercise as completed if all sets are done
        if (newCompleted.size === exercise.sets.length && exercise.status === "planned") {
            onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, status: "completed" }));
        }
    };

    return (
        <article className="flex flex-col h-full bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden flex-1 max-h-[calc(100vh-280px)]">

            {/* Header Area */}
            <div className="p-4 lg:p-6 pb-0 flex-shrink-0">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                                {exerciseIndex + 1}
                            </span>
                            {isCustom && (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                    Custom
                                </span>
                            )}
                            {exercise.category && (
                                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                                    {exercise.category}
                                </span>
                            )}
                        </div>

                        {/* Status Toggle */}
                        <select
                            value={exercise.status}
                            onChange={(e) => onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, status: e.target.value as WorkoutExerciseStatus }))}
                            className={`text-xs font-bold rounded-full px-3 py-1.5 border appearance-none text-center outline-none ${exercise.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                exercise.status === 'skipped' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    exercise.status === 'modified' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-white text-neutral-700 border-neutral-200'
                                }`}
                        >
                            <option value="planned">Planned</option>
                            <option value="completed">Completed</option>
                            <option value="modified">Modified</option>
                            <option value="skipped">Skipped</option>
                        </select>
                    </div>

                    <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) => onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, name: e.target.value }))}
                        placeholder="Exercise name"
                        className="w-full bg-transparent text-2xl lg:text-3xl font-bold tracking-tight text-neutral-900 outline-none placeholder:text-neutral-300"
                    />
                    {(exercise.target_reps_or_time || exercise.target_notes) && (
                        <p className="text-sm font-semibold text-neutral-500">
                            Target: {exercise.target_sets ?? 0} × {exercise.target_reps_or_time}
                        </p>
                    )}
                </div>

                {/* PT Cue Panel - Prominent display for rehab */}
                {exercise.target_notes && (
                    <div className="mt-4 rounded-2xl bg-amber-50/50 border border-amber-100 p-4">
                        <div className="flex items-start gap-2 text-amber-800">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">PT Cue</p>
                                <p className="text-sm font-medium leading-relaxed">{exercise.target_notes}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scrollable Sets Area */}
            <div className="p-4 lg:p-6 overflow-y-auto flex-1 min-h-[200px]">
                {/* Desktop Header */}
                <div className="hidden lg:grid lg:grid-cols-[2rem_4rem_1fr_1fr_1fr_1fr_2.5rem_2.5rem] lg:gap-2 lg:px-1 lg:pb-2 lg:text-xs lg:font-bold lg:uppercase lg:tracking-wider lg:text-neutral-400">
                    <span>#</span>
                    <span>Side</span>
                    <span>Reps</span>
                    <span>Weight</span>
                    <span>RPE</span>
                    <span>Secs</span>
                    <span className="text-center">Done</span>
                    <span />
                </div>

                <div className="space-y-3 lg:space-y-2">
                    {exercise.sets.map((set) => (
                        <SetRow
                            key={set.set_id}
                            exerciseId={exercise.exercise_id}
                            set={set}
                            disableActualFields={disableActualFields}
                            onUpdateSet={onUpdateSet}
                            onRemoveSet={onRemoveSet}
                            onToggleComplete={handleToggleSetComplete}
                            isCompleted={completedSets.has(set.set_id)}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => onAddSet(exercise.exercise_id)}
                    disabled={disableActualFields}
                    className="mt-3 lg:mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-3 text-sm font-bold text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700 disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" />
                    Add set
                </button>

                {/* Rehab: Pain Capture */}
                <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-bold text-neutral-900 mb-3 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-neutral-400" />
                        Pain Check-in
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={disableActualFields}
                            onClick={() => onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, pain_level: 'none', pain_note: '' }))}
                            className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${exercise.pain_level === 'none' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            😊 None
                        </button>
                        <button
                            disabled={disableActualFields}
                            onClick={() => onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, pain_level: 'mild', pain_note: '' }))}
                            className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${exercise.pain_level === 'mild' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-amber-50/50'
                                }`}
                        >
                            😐 Mild
                        </button>
                        <button
                            disabled={disableActualFields}
                            onClick={() => onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, pain_level: 'significant' }))}
                            className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${exercise.pain_level === 'significant' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-rose-50/50'
                                }`}
                        >
                            😣 Pain
                        </button>
                    </div>

                    {exercise.pain_level === 'significant' && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <input
                                type="text"
                                value={exercise.pain_note || ""}
                                onChange={(e) => onUpdateExercise(exercise.exercise_id, (ex) => ({ ...ex, pain_note: e.target.value }))}
                                placeholder="Where? What kind of pain?"
                                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
