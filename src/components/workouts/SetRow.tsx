"use client";

import { Check, Trash2, XCircle } from "lucide-react";
import { SetDraft } from "./types";

interface SetRowProps {
    exerciseId: string;
    set: SetDraft;
    disableActualFields: boolean;
    onUpdateSet: (exerciseId: string, setId: string, field: keyof SetDraft, value: string) => void;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    onToggleComplete?: (setId: string, isCompleted: boolean) => void;
    isCompleted?: boolean;
}

export function SetRow({
    exerciseId,
    set,
    disableActualFields,
    onUpdateSet,
    onRemoveSet,
    onToggleComplete,
    isCompleted = false,
}: SetRowProps) {
    const sideOptions = [
        { value: "bilateral", label: "B" },
        { value: "left", label: "L" },
        { value: "right", label: "R" },
    ] as const;

    const activeSide = set.side || "bilateral";

    return (
        <div
            className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-colors ${isCompleted ? "bg-emerald-50/50 border-emerald-100" : "bg-neutral-50/50 border-neutral-100"
                } lg:grid lg:grid-cols-[2rem_4rem_1fr_1fr_1fr_1fr_2.5rem_2.5rem] lg:items-center lg:gap-2 lg:rounded-lg lg:p-0 lg:border-0 lg:bg-transparent`}
        >
            {/* Set number */}
            <span className="hidden text-xs font-bold text-neutral-400 lg:block">
                {set.set_number}
            </span>
            <div className="flex items-center justify-between lg:hidden mb-1">
                <span className="text-xs font-bold text-neutral-400">
                    Set {set.set_number}
                </span>
                {/* Toggle completion on mobile upper corner */}
                <button
                    onClick={() => onToggleComplete?.(set.set_id, !isCompleted)}
                    className={`h-6 w-6 rounded-md flex items-center justify-center border transition-colors ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-neutral-300 text-transparent hover:border-emerald-400"
                        }`}
                >
                    <Check className="h-4 w-4" />
                </button>
            </div>

            {/* Side Selector */}
            <div className="flex bg-neutral-200/50 p-0.5 rounded-lg w-fit lg:w-full">
                {sideOptions.map((option) => (
                    <button
                        key={option.value}
                        disabled={disableActualFields}
                        onClick={() => onUpdateSet(exerciseId, set.set_id, "side", option.value)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${activeSide === option.value
                                ? "bg-white shadow-sm text-neutral-900"
                                : "text-neutral-500 hover:text-neutral-700"
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Mobile: 3-col grid for Reps/Weight/RPE */}
            <div className="grid grid-cols-3 gap-2 lg:contents">
                <label className="space-y-1 lg:space-y-0">
                    <span className="text-[10px] font-medium text-neutral-500 lg:hidden">Reps</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={set.reps}
                        disabled={disableActualFields}
                        onChange={(e) => onUpdateSet(exerciseId, set.set_id, "reps", e.target.value)}
                        placeholder="—"
                        className={`w-full rounded-lg border px-2.5 py-2 text-center text-sm font-semibold outline-none transition focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 ${isCompleted ? 'bg-emerald-50 border-emerald-200 focus:border-emerald-500' : 'bg-white border-neutral-200 focus:border-teal-500'}`}
                    />
                </label>
                <label className="space-y-1 lg:space-y-0">
                    <span className="text-[10px] font-medium text-neutral-500 lg:hidden">lbs</span>
                    <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={set.weight}
                        disabled={disableActualFields}
                        onChange={(e) => onUpdateSet(exerciseId, set.set_id, "weight", e.target.value)}
                        placeholder="—"
                        className={`w-full rounded-lg border px-2.5 py-2 text-center text-sm font-semibold outline-none transition focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 ${isCompleted ? 'bg-emerald-50 border-emerald-200 focus:border-emerald-500' : 'bg-white border-neutral-200 focus:border-teal-500'}`}
                    />
                </label>
                <label className="space-y-1 lg:space-y-0">
                    <span className="text-[10px] font-medium text-neutral-500 lg:hidden">RPE</span>
                    <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="10"
                        value={set.rpe}
                        disabled={disableActualFields}
                        onChange={(e) => onUpdateSet(exerciseId, set.set_id, "rpe", e.target.value)}
                        placeholder="—"
                        className={`w-full rounded-lg border px-2.5 py-2 text-center text-sm font-semibold outline-none transition focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 ${isCompleted ? 'bg-emerald-50 border-emerald-200 focus:border-emerald-500' : 'bg-white border-neutral-200 focus:border-teal-500'}`}
                    />
                </label>
            </div>

            {/* Duration: hidden by default on mobile, 5th col on lg */}
            <label className="hidden space-y-1 lg:block lg:space-y-0">
                <span className="text-[10px] font-medium text-neutral-500 lg:hidden">Time (s)</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={set.duration_s}
                    disabled={disableActualFields}
                    onChange={(e) => onUpdateSet(exerciseId, set.set_id, "duration_s", e.target.value)}
                    placeholder="sec"
                    className={`w-full rounded-lg border px-2.5 py-2 text-center text-sm outline-none transition focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 ${isCompleted ? 'bg-emerald-50 border-emerald-200 focus:border-emerald-500' : 'bg-white border-neutral-200 focus:border-teal-500'}`}
                />
            </label>

            {/* Desktop Checkmark */}
            <div className="hidden lg:flex justify-center">
                <button
                    onClick={() => onToggleComplete?.(set.set_id, !isCompleted)}
                    className={`h-8 w-8 rounded-md flex items-center justify-center border transition-colors ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-neutral-300 text-transparent hover:border-emerald-400"
                        }`}
                >
                    <Check className="h-5 w-5" />
                </button>
            </div>

            {/* Delete set */}
            <div className="flex justify-end mt-2 lg:mt-0">
                <button
                    type="button"
                    onClick={() => onRemoveSet(exerciseId, set.set_id)}
                    className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Remove set"
                >
                    <XCircle className="h-5 w-5 hidden lg:block" />
                    <Trash2 className="h-4 w-4 lg:hidden" />
                </button>
            </div>
        </div>
    );
}
