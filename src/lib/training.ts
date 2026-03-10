export type PlanStatus = "active" | "archived";
export type WorkoutExerciseStatus = "planned" | "completed" | "skipped" | "modified" | "added";

export interface PlanExercise {
  exercise_id: string;
  name: string;
  category?: string;
  primary_muscle?: string;
  target_sets: number;
  target_reps_or_time: string;
  notes?: string;
}

export interface TrainingPlanVersion {
  program_id: string;
  version_id: string;
  title: string;
  effective_start_date: string;
  status: PlanStatus;
  general_notes?: string;
  exercises: PlanExercise[];
}

export interface LoggedExercise {
  exercise_id: string;
  plan_exercise_id?: string | null;
  name: string;
  category?: string;
  primary_muscle?: string;
  status: WorkoutExerciseStatus;
  sets: number;
  reps?: number | string;
  weight?: number;
  weight_lbs?: number;
  duration_s?: number;
  rpe?: number;
  notes?: string;
}

export type SymptomStatus = string;

export type SymptomLocation = string;

export interface TrainingLogRecord {
  date: string;
  rpe?: number | null;
  total_load?: number | null;
  focus?: string | null;
  completed_plan_id?: string | null;
  exercises?: LoggedExercise[] | null;
  stressors?: string | null;
  workout_notes?: string | null;
  symptom_status?: SymptomStatus | null;
  symptom_location?: SymptomLocation | null;
  symptom_detail?: string | null;
  pain_modifiers?: string | null;
}

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${random}`;
}

export function calculateTotalLoad(exercises: LoggedExercise[] | undefined): number {
  if (!exercises?.length) {
    return 0;
  }

  return exercises.reduce((total, exercise) => {
    const reps =
      typeof exercise.reps === "number"
        ? exercise.reps
        : Number.parseFloat(exercise.reps ?? "");
    const weight = exercise.weight ?? exercise.weight_lbs ?? 0;

    if (!Number.isFinite(reps) || !weight || !exercise.sets) {
      return total;
    }

    return total + exercise.sets * reps * weight;
  }, 0);
}

export function resolvePlanForDate(
  plans: TrainingPlanVersion[],
  date: string,
): TrainingPlanVersion | undefined {
  return [...plans]
    .filter((plan) => plan.status === "active" && plan.effective_start_date <= date)
    .sort((a, b) => b.effective_start_date.localeCompare(a.effective_start_date))[0];
}

export function mapPlanVersionToLegacyPlan(plan: TrainingPlanVersion) {
  return {
    ...plan,
    id: plan.version_id,
    plan_id: plan.version_id,
    date_prescribed: plan.effective_start_date,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.target_sets,
      reps_or_time: exercise.target_reps_or_time,
    })),
  };
}

export function getWorkoutCompletionSummary(
  plan: TrainingPlanVersion | undefined,
  exercises: LoggedExercise[] | null | undefined,
) {
  const completed = exercises?.filter((exercise) => exercise.status === "completed").length ?? 0;
  const modified = exercises?.filter((exercise) => exercise.status === "modified").length ?? 0;
  const skipped = exercises?.filter((exercise) => exercise.status === "skipped").length ?? 0;
  const added = exercises?.filter((exercise) => exercise.status === "added").length ?? 0;

  return {
    totalPlanned: plan?.exercises.length ?? 0,
    completed,
    modified,
    skipped,
    added,
  };
}
