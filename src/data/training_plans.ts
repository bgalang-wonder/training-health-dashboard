import type { TrainingPlanVersion } from "../lib/training";

export const trainingPlans: TrainingPlanVersion[] = [
  {
    program_id: "ryan-rehab",
    version_id: "ryan-rehab-v1",
    title: "Ryan Rehab Program",
    effective_start_date: "2026-02-26",
    status: "active",
    general_notes: "Initial plan from Ryan. Moving to 2-4 rounds for most exercises.",
    exercises: [
      { exercise_id: "ryan-rehab-v1-beast-crawl", name: "Beast crawl", category: "Core", primary_muscle: "Full Body", target_sets: 1, target_reps_or_time: "30s" },
      { exercise_id: "ryan-rehab-v1-torsion-buttress", name: "Torsion buttress", category: "Core", primary_muscle: "Obliques", target_sets: 1, target_reps_or_time: "10s each side", notes: "2-4 rounds. From 'The gift of injury' by Brian Carroll and Stuart McGill" },
      { exercise_id: "ryan-rehab-v1-long-lever-bridge", name: "Long lever bridge", category: "Legs", primary_muscle: "Hamstrings", target_sets: 2, target_reps_or_time: "12 reps", notes: "2-4 rounds" },
      { exercise_id: "ryan-rehab-v1-split-squat-iso", name: "Split squat iso", category: "Legs", primary_muscle: "Quads", target_sets: 2, target_reps_or_time: "45s each side", notes: "2-4 rounds" },
      { exercise_id: "ryan-rehab-v1-1l-rdl", name: "1L RDL with hand assist and hip circle", category: "Legs", primary_muscle: "Glutes/Hams", target_sets: 2, target_reps_or_time: "15 reps each side", notes: "2-4 rounds, 25lb" },
      { exercise_id: "ryan-rehab-v1-copenhagen", name: "Copenhagen", category: "Core", primary_muscle: "Adductors", target_sets: 2, target_reps_or_time: "30s each side", notes: "2-4 rounds" },
      { exercise_id: "ryan-rehab-v1-soleus-wall-sit", name: "Soleus wall sit", category: "Legs", primary_muscle: "Calves", target_sets: 2, target_reps_or_time: "45s", notes: "2-4 rounds" },
      { exercise_id: "ryan-rehab-v1-barbell-squat", name: "Barbell squat", category: "Legs", primary_muscle: "Quads/Glutes", target_sets: 2, target_reps_or_time: "6 reps", notes: "135lb + 5 weekly" },
      { exercise_id: "ryan-rehab-v1-1-arm-row-cable", name: "1 arm row cable or band", category: "Pull", primary_muscle: "Lats", target_sets: 2, target_reps_or_time: "12 reps each side" },
      { exercise_id: "ryan-rehab-v1-farmers-carry", name: "Farmers carry", category: "Conditioning", primary_muscle: "Core/Grip", target_sets: 2, target_reps_or_time: "40s", notes: "35lb" },
      { exercise_id: "ryan-rehab-v1-single-arm-row", name: "Single arm row", category: "Pull", primary_muscle: "Lats", target_sets: 2, target_reps_or_time: "10 reps each side", notes: "40lb" },
    ],
  },
];
