"use client";

import { X, CalendarDays, Target } from "lucide-react";
import { WorkoutDraft } from "./types";
import { TrainingPlanVersion } from "../../lib/training";

interface SessionMetaSheetProps {
    isOpen: boolean;
    onClose: () => void;
    draft: WorkoutDraft;
    onUpdateDraft: <K extends keyof WorkoutDraft>(key: K, value: WorkoutDraft[K]) => void;
    selectedPlan?: TrainingPlanVersion;
    completionSummary: {
        totalPlanned: number;
        completed: number;
        modified: number;
        skipped: number;
        added: number;
    };
    isDirty: boolean;
    isExistingLog: boolean;
}

export function SessionMetaSheet({
    isOpen,
    onClose,
    draft,
    onUpdateDraft,
    selectedPlan,
    completionSummary,
    isDirty,
    isExistingLog,
}: SessionMetaSheetProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative w-full max-h-[90vh] bg-white rounded-t-3xl shadow-xl overflow-y-auto animate-in slide-in-from-bottom flex flex-col">
                {/* Handle & Close */}
                <div className="sticky top-0 bg-white z-10 pt-4 pb-2 px-6 flex items-center justify-between border-b border-neutral-100">
                    <div className="flex-1" />
                    <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
                    <div className="flex-1 flex justify-end">
                        <button onClick={onClose} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-700 bg-neutral-50 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8 pb-32">

                    <section>
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-600 mb-4">
                            <CalendarDays className="h-4 w-4" />
                            Session Setup
                        </div>
                        <div className="grid gap-4">
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-neutral-700">Focus / title</span>
                                <input
                                    type="text"
                                    value={draft.focus}
                                    onChange={(e) => onUpdateDraft("focus", e.target.value)}
                                    placeholder="Full body, lower body, recovery..."
                                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-neutral-700">Session RPE (0-10)</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={draft.rpe}
                                    onChange={(e) => onUpdateDraft("rpe", e.target.value)}
                                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-neutral-700">Workout notes</span>
                                <textarea
                                    value={draft.workout_notes}
                                    onChange={(e) => onUpdateDraft("workout_notes", e.target.value)}
                                    rows={4}
                                    placeholder="How did it go? What changed mid-session?"
                                    className="w-full rounded-[1.5rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                                />
                            </label>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-600 mb-4">
                            <Target className="h-4 w-4" />
                            Program Context
                        </div>

                        {selectedPlan ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/70">Linked Version</p>
                                    <p className="mt-1 text-lg font-bold text-teal-900">{selectedPlan.title}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Compliance</p>
                                        <p className="mt-1 text-xl font-bold text-neutral-900">
                                            {completionSummary.completed}/{completionSummary.totalPlanned}
                                        </p>
                                        <p className="mt-1 text-[11px] font-medium text-neutral-500">
                                            {completionSummary.modified} mod · {completionSummary.skipped} skip
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Log State</p>
                                        <p className="mt-1 text-sm font-bold text-neutral-900">
                                            {isExistingLog ? "Existing record" : "Fresh draft"}
                                        </p>
                                        <p className="mt-1 text-[11px] font-medium text-amber-600">
                                            {isDirty ? "Unsaved changes" : ""}
                                        </p>
                                    </div>
                                </div>

                                {selectedPlan.general_notes && (
                                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Coach Notes</p>
                                        <p className="text-sm leading-relaxed text-neutral-600">{selectedPlan.general_notes}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">
                                <p className="text-sm font-bold text-neutral-900">No active plan for this date.</p>
                            </div>
                        )}
                    </section>

                </div>
            </div>
        </div>
    );
}
