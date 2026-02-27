export interface ExecutedExercise {
    name: string;
    category?: "Push" | "Pull" | "Legs" | "Core" | "Conditioning" | "Mobility";
    primary_muscle?: string;
    weight_lbs?: number;
    sets: number;
    reps?: number;
    duration_s?: number;
    notes?: string;
}

export interface TrainingLog {
    date: string;
    rpe?: number; // Rate of Perceived Exertion (1-10)
    total_load?: number; // Sets x Reps x Weight
    focus?: string; // Leg day, Pull day, Conditioning, etc
    completed_plan_id?: string; // Links back to a plan
    exercises?: ExecutedExercise[];
    stressors?: string; // Flight, poor sleep, work stress
    workout_notes?: string;
    back_pain_score?: number; // 0-10 Pain level
    pain_modifiers?: string; // e.g. "Sitting too long", "Morning stiffness"
}

export const trainingLogs: TrainingLog[] = [
    {
        date: "2026-02-25",
        focus: "Rest",
    },
    {
        date: "2026-02-26",
        rpe: 6,
        focus: "Full Body Rx + Core",
        stressors: "Interview stress",
        workout_notes: "Workout felt good. Discovered a major compensatory mechanic: Sternum discomfort limited my thoracic (upper chest) extension. Because I couldn't extend through the upper back, my body forced compensatory extension into my lower back instead. Need to watch this. Forward flexion and side-bending are highly accessible.",
        back_pain_score: 1, // Approximating based on "no pain" during workout but some guarding
        pain_modifiers: "Arching/Extension",
        completed_plan_id: "plan_1_feb26",
        exercises: [
            { name: "Beast crawl", sets: 1, duration_s: 30 },
            { name: "Torsion buttress", sets: 2, duration_s: 10 },
            { name: "Long lever bridge", sets: 2, reps: 12 },
            { name: "Farmers carry", weight_lbs: 35, sets: 2, duration_s: 40 },
            { name: "Single arm row", weight_lbs: 40, sets: 2, reps: 10 }
        ]
    },
    {
        date: "2026-02-27",
        focus: "Recovery",
        stressors: "Interview stress",
        workout_notes: "Continued focus on avoiding extension.",
        back_pain_score: 1
    }
];
