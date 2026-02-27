export interface Exercise {
  name: string;
  sets: number;
  reps_or_time: string;
  notes?: string;
}

export interface TrainingPlan {
  id: string; // Identifier like "Feb2026-Ryan"
  date_prescribed: string;
  exercises: Exercise[];
  general_notes?: string;
  active: boolean;
}

export const trainingPlans: TrainingPlan[] = [
  {
    id: "plan_1_feb26",
    date_prescribed: "2026-02-26",
    active: true,
    general_notes: "Initial plan from Ryan.",
    exercises: [
      { name: "Beast crawl", category: "Core", primary_muscle: "Full Body", sets: 1, reps_or_time: "30s" },
      { name: "Torsion buttress", category: "Core", primary_muscle: "Obliques", sets: 2, reps_or_time: "10s each side", notes: "From 'The gift of injury' by Brian Carroll and Stuart McGill" },
      { name: "Long lever bridge", category: "Legs", primary_muscle: "Hamstrings", sets: 2, reps_or_time: "12 reps" },
      { name: "Split squat iso", category: "Legs", primary_muscle: "Quads", sets: 2, reps_or_time: "45s each side" },
      { name: "1L RDL with hand assist and hip circle", category: "Legs", primary_muscle: "Glutes/Hams", sets: 2, reps_or_time: "15 reps each side" },
      { name: "Copenhagen", category: "Core", primary_muscle: "Adductors", sets: 2, reps_or_time: "30s each side" },
      { name: "1 arm row cable or band", category: "Pull", primary_muscle: "Lats", sets: 2, reps_or_time: "12 reps each side" },
      { name: "Farmers carry", category: "Conditioning", primary_muscle: "Core/Grip", sets: 2, reps_or_time: "40s", notes: "35lb" },
      { name: "Single arm row", category: "Pull", primary_muscle: "Lats", sets: 2, reps_or_time: "10 reps each side", notes: "40lb" }
    ]
  }
];
