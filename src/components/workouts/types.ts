export type SetDraft = {
    set_id: string;
    set_number: number;
    reps: string;
    weight: string;
    duration_s: string;
    rpe: string;
    notes: string;
    side?: "left" | "right" | "bilateral"; // New for rehab tracking
};

export type WorkoutExerciseDraft = {
    exercise_id: string;
    plan_exercise_id?: string | null;
    name: string;
    category?: string;
    primary_muscle?: string;
    status: import("../../lib/training").WorkoutExerciseStatus;
    target_sets?: number;
    target_reps_or_time?: string;
    target_notes?: string;
    sets: SetDraft[];
    exercise_notes: string;
    // New for rehab tracking
    pain_level?: "none" | "mild" | "significant";
    pain_note?: string;
};

export type WorkoutDraft = {
    date: string;
    focus: string;
    rpe: string;
    workout_notes: string;
    completed_plan_id: string;
    exercises: WorkoutExerciseDraft[];
};

export type ProgramDraft = {
    program_id: string;
    version_id: string;
    title: string;
    effective_start_date: string;
    status: import("../../lib/training").PlanStatus;
    general_notes: string;
    exercises: import("../../lib/training").PlanExercise[];
};
