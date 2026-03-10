"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Grip,
  Plus,
  Save,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { api } from "../../../convex/_generated/api";
import {
  calculateTotalLoad,
  createId,
  getWorkoutCompletionSummary,
  resolvePlanForDate,
  type LoggedExercise,
  type PlanExercise,
  type PlanStatus,
  type TrainingLogRecord,
  type TrainingPlanVersion,
  type WorkoutExerciseStatus,
} from "../../lib/training";

type WorkoutView = "today" | "programs";

import {
  WorkoutDraft,
  WorkoutExerciseDraft,
  ProgramDraft,
  SetDraft,
} from "./types";
import { WorkoutHeader } from "./WorkoutHeader";
import { ExerciseNav } from "./ExerciseNav";
import { ExerciseCard } from "./ExerciseCard";
import { RestTimer } from "./RestTimer";
import { SessionMetaSheet } from "./SessionMetaSheet";
import { WorkoutSummary } from "./WorkoutSummary";
import { useRestTimer } from "./useRestTimer";

// Helper for compliance metrics
function computeStreak(logs: TrainingLogRecord[]) {
  if (!logs || logs.length === 0) return 0;
  // simplified streak logic for demo
  return logs.length > 5 ? 2 : 1;
}

function computePainTrend(logs: TrainingLogRecord[]) {
  if (!logs || logs.length === 0) return 0;
  // simplified pain metric aggregation for demo
  return 1.4;
}


const WORKOUT_VIEWS: Array<{ id: WorkoutView; label: string }> = [
  { id: "today", label: "Workout" },
  { id: "programs", label: "Programs" },
];

const STATUS_OPTIONS: Array<{ value: WorkoutExerciseStatus; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Done" },
  { value: "modified", label: "Modified" },
  { value: "skipped", label: "Skipped" },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(value: string, amount: number) {
  try {
    return format(addDays(parseISO(value), amount), "yyyy-MM-dd");
  } catch {
    return format(addDays(new Date(), amount), "yyyy-MM-dd");
  }
}

function formatDateLabel(value: string) {
  try {
    return format(parseISO(value), "EEE, MMM d");
  } catch {
    return value;
  }
}

function toStringValue(value?: string | number | null) {
  return value == null ? "" : String(value);
}

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function makeSetDraft(setNumber: number, overrides?: Partial<SetDraft>): SetDraft {
  return {
    set_id: createId("set"),
    set_number: setNumber,
    reps: "",
    weight: "",
    duration_s: "",
    rpe: "",
    notes: "",
    ...overrides,
  };
}

type LegacyPersistedExerciseDraft = Partial<WorkoutExerciseDraft> & {
  reps?: string | number;
  weight?: string | number;
  duration_s?: string | number;
  notes?: string;
};

type LegacyPersistedWorkoutDraft = Partial<WorkoutDraft> & {
  exercises?: LegacyPersistedExerciseDraft[];
};

function ensureSetDrafts(input: unknown, targetSetCount = 1): SetDraft[] {
  const desiredCount = Math.max(targetSetCount, 1);

  if (Array.isArray(input)) {
    return input.map((setLike, index) => {
      const set = typeof setLike === "object" && setLike !== null
        ? (setLike as Partial<SetDraft>)
        : {};

      return makeSetDraft(set.set_number ?? index + 1, {
        set_id: typeof set.set_id === "string" ? set.set_id : undefined,
        reps: toStringValue(set.reps),
        weight: toStringValue(set.weight),
        duration_s: toStringValue(set.duration_s),
        rpe: toStringValue(set.rpe),
        notes: typeof set.notes === "string" ? set.notes : "",
      });
    });
  }

  const legacySetCount =
    typeof input === "number"
      ? input
      : Number.parseInt(String(input ?? desiredCount), 10) || desiredCount;

  return Array.from({ length: Math.max(legacySetCount, 1) }, (_, index) =>
    makeSetDraft(index + 1),
  );
}

function normalizeWorkoutDraft(raw: unknown, fallback: WorkoutDraft): WorkoutDraft {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const candidate = raw as LegacyPersistedWorkoutDraft;

  const fallbackByPlanId = new Map(
    fallback.exercises.map((exercise) => [exercise.plan_exercise_id ?? exercise.exercise_id, exercise]),
  );

  const exercises = Array.isArray(candidate.exercises)
    ? candidate.exercises.map((exerciseLike, index) => {
      const exercise = exerciseLike as LegacyPersistedExerciseDraft;
      const fallbackExercise =
        fallbackByPlanId.get(exercise.plan_exercise_id ?? exercise.exercise_id ?? "") ??
        fallback.exercises[index];

      const setDrafts =
        Array.isArray(exercise.sets) && exercise.sets.length > 0
          ? ensureSetDrafts(exercise.sets, fallbackExercise?.target_sets ?? 1)
          : Array.from(
            {
              length:
                Number.parseInt(
                  String(exercise.target_sets ?? fallbackExercise?.target_sets ?? exercise.sets ?? 1),
                  10,
                ) || 1,
            },
            (_, setIndex) =>
              makeSetDraft(setIndex + 1, {
                reps: toStringValue(exercise.reps),
                weight: toStringValue(exercise.weight),
                duration_s: toStringValue(exercise.duration_s),
                notes: exercise.notes ?? "",
              }),
          );

      return {
        exercise_id:
          typeof exercise.exercise_id === "string"
            ? exercise.exercise_id
            : fallbackExercise?.exercise_id ?? createId("draft"),
        plan_exercise_id:
          typeof exercise.plan_exercise_id === "string" || exercise.plan_exercise_id === null
            ? exercise.plan_exercise_id
            : fallbackExercise?.plan_exercise_id,
        name:
          typeof exercise.name === "string" && exercise.name.trim()
            ? exercise.name
            : fallbackExercise?.name ?? "",
        category:
          typeof exercise.category === "string"
            ? exercise.category
            : fallbackExercise?.category,
        primary_muscle:
          typeof exercise.primary_muscle === "string"
            ? exercise.primary_muscle
            : fallbackExercise?.primary_muscle,
        status:
          typeof exercise.status === "string"
            ? (exercise.status as WorkoutExerciseStatus)
            : fallbackExercise?.status ?? "planned",
        target_sets: fallbackExercise?.target_sets,
        target_reps_or_time: fallbackExercise?.target_reps_or_time,
        target_notes: fallbackExercise?.target_notes,
        sets: setDrafts,
        exercise_notes:
          typeof exercise.exercise_notes === "string"
            ? exercise.exercise_notes
            : exercise.notes ?? fallbackExercise?.exercise_notes ?? "",
      };
    })
    : fallback.exercises;

  return {
    date: typeof candidate.date === "string" ? candidate.date : fallback.date,
    focus: typeof candidate.focus === "string" ? candidate.focus : fallback.focus,
    rpe: typeof candidate.rpe === "string" ? candidate.rpe : fallback.rpe,
    workout_notes:
      typeof candidate.workout_notes === "string"
        ? candidate.workout_notes
        : fallback.workout_notes,
    completed_plan_id:
      typeof candidate.completed_plan_id === "string"
        ? candidate.completed_plan_id
        : fallback.completed_plan_id,
    exercises,
  };
}

function makeExerciseDraftFromPlan(exercise: PlanExercise): WorkoutExerciseDraft {
  const targetSetCount = exercise.target_sets ?? 1;
  return {
    exercise_id: createId("draft"),
    plan_exercise_id: exercise.exercise_id,
    name: exercise.name,
    category: exercise.category,
    primary_muscle: exercise.primary_muscle,
    status: "planned",
    target_sets: exercise.target_sets,
    target_reps_or_time: exercise.target_reps_or_time,
    target_notes: exercise.notes,
    sets: Array.from({ length: targetSetCount }, (_, i) => makeSetDraft(i + 1)),
    exercise_notes: "",
  };
}

function makeExerciseDraftFromLog(exercise: LoggedExercise): WorkoutExerciseDraft {
  let sets: SetDraft[];

  if (exercise.logged_sets?.length) {
    sets = exercise.logged_sets.map((s) =>
      makeSetDraft(s.set_number, {
        reps: s.reps != null ? String(s.reps) : "",
        weight: s.weight_lbs != null ? String(s.weight_lbs) : "",
        duration_s: s.duration_s ? String(s.duration_s) : "",
        rpe: s.rpe != null ? String(s.rpe) : "",
        notes: s.notes ?? "",
      }),
    );
  } else {
    // Legacy: single aggregated set
    sets = [
      makeSetDraft(1, {
        reps: exercise.reps != null ? String(exercise.reps) : "",
        weight: exercise.weight != null ? String(exercise.weight) : (exercise.weight_lbs != null ? String(exercise.weight_lbs) : ""),
        duration_s: exercise.duration_s ? String(exercise.duration_s) : "",
        rpe: exercise.rpe != null ? String(exercise.rpe) : "",
      }),
    ];
    // If multiple sets were logged in legacy, duplicate the row
    if (exercise.sets > 1) {
      for (let i = 1; i < exercise.sets; i++) {
        sets.push(makeSetDraft(i + 1, {
          reps: sets[0].reps,
          weight: sets[0].weight,
          duration_s: sets[0].duration_s,
          rpe: sets[0].rpe,
        }));
      }
    }
  }

  return {
    exercise_id: exercise.exercise_id,
    plan_exercise_id: exercise.plan_exercise_id ?? undefined,
    name: exercise.name,
    category: exercise.category,
    primary_muscle: exercise.primary_muscle,
    status: exercise.status,
    sets,
    exercise_notes: exercise.notes ?? "",
  };
}

function buildWorkoutDraft(
  date: string,
  plan: TrainingPlanVersion | undefined,
  log: TrainingLogRecord | undefined,
): WorkoutDraft {
  const planRows = plan?.exercises.map((exercise) => makeExerciseDraftFromPlan(exercise)) ?? [];

  if (log?.exercises?.length) {
    const mergedRows = planRows.map((row) => {
      const matchingLogExercise = log.exercises?.find(
        (exercise) =>
          (row.plan_exercise_id && exercise.plan_exercise_id === row.plan_exercise_id) ||
          exercise.name === row.name,
      );

      if (!matchingLogExercise) {
        return row;
      }

      return {
        ...row,
        ...makeExerciseDraftFromLog(matchingLogExercise),
        target_sets: row.target_sets,
        target_reps_or_time: row.target_reps_or_time,
        target_notes: row.target_notes,
      };
    });

    const customRows =
      log.exercises
        ?.filter((exercise) => !exercise.plan_exercise_id)
        .map((exercise) => makeExerciseDraftFromLog(exercise)) ?? [];

    return {
      date,
      focus: log.focus ?? "",
      rpe: toStringValue(log.rpe),
      workout_notes: log.workout_notes ?? "",
      completed_plan_id: log.completed_plan_id ?? plan?.version_id ?? "",
      exercises: [...mergedRows, ...customRows],
    };
  }

  return {
    date,
    focus: "",
    rpe: "",
    workout_notes: "",
    completed_plan_id: plan?.version_id ?? "",
    exercises: planRows,
  };
}

function buildWorkoutPayload(draft: WorkoutDraft, existingLog?: TrainingLogRecord) {
  const exercises: LoggedExercise[] = draft.exercises.map((exercise) => {
    const logged_sets = exercise.sets.map((s) => ({
      set_number: s.set_number,
      reps: s.reps.trim() ? (toNumber(s.reps) ?? s.reps.trim()) : undefined,
      weight_lbs: toNumber(s.weight),
      duration_s: toNumber(s.duration_s),
      rpe: toNumber(s.rpe),
      notes: s.notes.trim() || undefined,
    }));

    // Compute aggregate fields for backward compat (use first set for reps/weight)
    const firstSet = logged_sets[0];
    return {
      exercise_id: exercise.exercise_id,
      plan_exercise_id: exercise.plan_exercise_id ?? null,
      name: exercise.name,
      category: exercise.category || undefined,
      primary_muscle: exercise.primary_muscle || undefined,
      status: exercise.status,
      sets: logged_sets.length,
      reps: firstSet?.reps,
      weight: typeof firstSet?.weight_lbs === "number" ? firstSet.weight_lbs : undefined,
      weight_lbs: firstSet?.weight_lbs,
      duration_s: firstSet?.duration_s,
      rpe: toNumber(exercise.sets.length > 0
        ? String(Math.round(exercise.sets.reduce((sum, s) => sum + (toNumber(s.rpe) ?? 0), 0) / Math.max(exercise.sets.filter(s => s.rpe.trim()).length, 1)))
        : ""),
      notes: exercise.exercise_notes.trim() || undefined,
      logged_sets,
    };
  });

  return {
    date: draft.date,
    rpe: toNumber(draft.rpe) ?? null,
    total_load: calculateTotalLoad(exercises),
    focus: draft.focus.trim() || null,
    exercises,
    stressors: existingLog?.stressors ?? null,
    workout_notes: draft.workout_notes.trim() || null,
    symptom_status: existingLog?.symptom_status ?? null,
    symptom_location: existingLog?.symptom_location ?? null,
    symptom_detail: existingLog?.symptom_detail ?? null,
    pain_modifiers: existingLog?.pain_modifiers ?? null,
    completed_plan_id: draft.completed_plan_id || null,
  };
}

function buildProgramDraft(plan?: TrainingPlanVersion): ProgramDraft {
  if (!plan) {
    return {
      program_id: "ryan-rehab",
      version_id: createId("plan"),
      title: "Ryan Rehab Program",
      effective_start_date: todayString(),
      status: "active",
      general_notes: "",
      exercises: [],
    };
  }

  return {
    program_id: plan.program_id,
    version_id: plan.version_id,
    title: plan.title,
    effective_start_date: plan.effective_start_date,
    status: plan.status,
    general_notes: plan.general_notes ?? "",
    exercises: plan.exercises.map((exercise) => ({ ...exercise })),
  };
}

function buildDuplicatedProgramDraft(plan?: TrainingPlanVersion): ProgramDraft {
  const base = buildProgramDraft(plan);

  return {
    ...base,
    version_id: createId(base.program_id),
    effective_start_date: todayString(),
    status: "active",
    exercises: base.exercises.map((exercise) => ({
      ...exercise,
      exercise_id: createId("plan-exercise"),
    })),
  };
}

function statusClassName(status: WorkoutExerciseStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "modified":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "skipped":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "added":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-600";
  }
}

export default function WorkoutApp() {
  const logs = useQuery(api.logs.list);
  const plans = useQuery(api.plans.list);
  const saveWorkout = useMutation(api.logs.insert);
  const savePlanVersion = useMutation(api.plans.saveVersion);

  const [view, setView] = useState<WorkoutView>("today");

  // New UI states
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isMetaSheetOpen, setIsMetaSheetOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const restTimer = useRestTimer();

  useEffect(() => {
    if (!workoutStartTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutStartTime]);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutDraft | null>(null);
  const [programDraft, setProgramDraft] = useState<ProgramDraft | null>(null);
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState("");
  const [workoutMessage, setWorkoutMessage] = useState<string | null>(null);
  const [programMessage, setProgramMessage] = useState<string | null>(null);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [programError, setProgramError] = useState<string | null>(null);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);

  const workoutBaselineRef = useRef("");

  const ready = logs !== undefined && plans !== undefined;
  const planVersions = useMemo(() => plans ?? [], [plans]);
  const logsByDate = useMemo(
    () => new Map((logs ?? []).map((log) => [log.date, log])),
    [logs],
  );
  const plansByVersionId = useMemo(
    () => new Map(planVersions.map((plan) => [plan.version_id, plan])),
    [planVersions],
  );

  const selectedLog = logsByDate.get(selectedDate);
  const selectedPlan =
    (selectedLog?.completed_plan_id
      ? plansByVersionId.get(selectedLog.completed_plan_id)
      : undefined) ?? resolvePlanForDate(planVersions, selectedDate);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const baseDraft = buildWorkoutDraft(selectedDate, selectedPlan, selectedLog);
    workoutBaselineRef.current = JSON.stringify(buildWorkoutPayload(baseDraft, selectedLog));

    const savedDraft = window.localStorage.getItem(`workout-draft:${selectedDate}`);
    if (savedDraft) {
      try {
        setWorkoutDraft(normalizeWorkoutDraft(JSON.parse(savedDraft), baseDraft));
      } catch {
        setWorkoutDraft(baseDraft);
      }
    } else {
      setWorkoutDraft(baseDraft);
    }

    setWorkoutMessage(null);
    setWorkoutError(null);
  }, [ready, selectedDate, selectedLog, selectedPlan]);

  useEffect(() => {
    if (!ready || selectedPlanVersionId) {
      return;
    }

    setSelectedPlanVersionId(planVersions[0]?.version_id ?? "");
  }, [ready, planVersions, selectedPlanVersionId]);

  useEffect(() => {
    if (!selectedPlanVersionId) {
      return;
    }

    const selectedPlanVersion = plansByVersionId.get(selectedPlanVersionId);
    if (selectedPlanVersion) {
      setProgramDraft(buildProgramDraft(selectedPlanVersion));
      setProgramMessage(null);
      setProgramError(null);
    }
  }, [plansByVersionId, selectedPlanVersionId]);

  const workoutIsDirty = workoutDraft
    ? JSON.stringify(buildWorkoutPayload(workoutDraft, selectedLog)) !== workoutBaselineRef.current
    : false;

  useEffect(() => {
    if (!workoutDraft) {
      return;
    }

    const key = `workout-draft:${selectedDate}`;
    if (workoutIsDirty) {
      window.localStorage.setItem(key, JSON.stringify(workoutDraft));
      return;
    }

    window.localStorage.removeItem(key);
  }, [selectedDate, workoutDraft, workoutIsDirty]);

  const completionSummary = useMemo(
    () =>
      getWorkoutCompletionSummary(
        selectedPlan,
        workoutDraft ? buildWorkoutPayload(workoutDraft, selectedLog).exercises : selectedLog?.exercises,
      ),
    [selectedLog, selectedPlan, workoutDraft],
  );

  function updateDraft<K extends keyof WorkoutDraft>(key: K, value: WorkoutDraft[K]) {
    setWorkoutDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateExercise(
    exerciseId: string,
    updater: (exercise: WorkoutExerciseDraft) => WorkoutExerciseDraft,
  ) {
    setWorkoutDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.exercise_id === exerciseId ? updater(exercise) : exercise,
        ),
      };
    });
  }

  function addCustomExercise() {
    setWorkoutDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: [
          ...current.exercises,
          {
            exercise_id: createId("exercise"),
            name: "",
            status: "added",
            sets: [makeSetDraft(1)],
            exercise_notes: "",
          },
        ],
      };
    });
  }

  function removeCustomExercise(exerciseId: string) {
    setWorkoutDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.filter((exercise) => exercise.exercise_id !== exerciseId),
      };
    });
  }

  function addSet(exerciseId: string) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: [...exercise.sets, makeSetDraft(exercise.sets.length + 1)],
    }));
  }

  function removeSet(exerciseId: string, setId: string) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets
        .filter((s) => s.set_id !== setId)
        .map((s, i) => ({ ...s, set_number: i + 1 })),
    }));
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    field: keyof SetDraft,
    value: string,
  ) {
    updateExercise(exerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((s) =>
        s.set_id === setId ? { ...s, [field]: value } : s,
      ),
    }));
  }

  async function handleWorkoutSave() {
    if (!workoutDraft) {
      return;
    }

    setSavingWorkout(true);
    setWorkoutError(null);
    setWorkoutMessage(null);

    try {
      const payload = buildWorkoutPayload(workoutDraft, selectedLog);
      await saveWorkout(payload);
      workoutBaselineRef.current = JSON.stringify(payload);
      window.localStorage.removeItem(`workout-draft:${selectedDate}`);
      setWorkoutMessage(`Saved ${formatDateLabel(selectedDate)}.`);
    } catch (error) {
      setWorkoutError(error instanceof Error ? error.message : "Unable to save workout.");
    } finally {
      setSavingWorkout(false);
    }
  }

  function updateProgramDraft<K extends keyof ProgramDraft>(key: K, value: ProgramDraft[K]) {
    setProgramDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateProgramExercise(
    exerciseId: string,
    updater: (exercise: PlanExercise) => PlanExercise,
  ) {
    setProgramDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.exercise_id === exerciseId ? updater(exercise) : exercise,
        ),
      };
    });
  }

  function addProgramExercise() {
    setProgramDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: [
          ...current.exercises,
          {
            exercise_id: createId("plan-exercise"),
            name: "",
            target_sets: 1,
            target_reps_or_time: "",
          },
        ],
      };
    });
  }

  function removeProgramExercise(exerciseId: string) {
    setProgramDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.filter((exercise) => exercise.exercise_id !== exerciseId),
      };
    });
  }

  function duplicateLatestProgram() {
    const source = plansByVersionId.get(selectedPlanVersionId) ?? planVersions[0];
    const duplicated = buildDuplicatedProgramDraft(source);
    setProgramDraft(duplicated);
    setSelectedPlanVersionId(duplicated.version_id);
    setView("programs");
    setProgramMessage("Duplicated latest version into a new editable draft.");
    setProgramError(null);
  }

  async function handleProgramSave() {
    if (!programDraft) {
      return;
    }

    setSavingProgram(true);
    setProgramError(null);
    setProgramMessage(null);

    try {
      await savePlanVersion({
        ...programDraft,
        general_notes: programDraft.general_notes.trim() || undefined,
      });
      setSelectedPlanVersionId(programDraft.version_id);
      setProgramMessage(
        `Saved ${programDraft.title} (${programDraft.status}) effective ${formatDateLabel(
          programDraft.effective_start_date,
        )}.`,
      );
    } catch (error) {
      setProgramError(error instanceof Error ? error.message : "Unable to save plan.");
    } finally {
      setSavingProgram(false);
    }
  }

  if (!ready || !workoutDraft) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-neutral-200 bg-white/80 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <p className="text-sm font-medium text-neutral-500">Loading workout workspace...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <section className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Workout Program Tracker
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
              Move day to day without leaving the workout flow
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              This workspace acts like a workout journal. Flip dates from the header to review,
              edit, or log a session while keeping each day linked to the plan version it actually used.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                Selected date
              </p>
              <p className="mt-2 text-lg font-semibold text-neutral-900">
                {formatDateLabel(selectedDate)}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                Active program
              </p>
              <p className="mt-2 text-sm font-semibold text-neutral-900">
                {selectedPlan?.title ?? "No active version"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {WORKOUT_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${view === item.id
              ? "border-teal-600 bg-teal-600 text-white"
              : "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900"
              }`}
          >
            {item.label}
          </button>
        ))}
      </section>

      {view === "today" && (
        <div className="relative">
          <WorkoutHeader
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onShiftDate={(amt) => setSelectedDate((current) => shiftDate(current, amt))}
            onJumpToToday={() => setSelectedDate(todayString())}
            formatDateLabel={formatDateLabel}
            selectedPlan={selectedPlan}
            completedExercises={completionSummary.completed}
            totalExercises={completionSummary.totalPlanned || workoutDraft.exercises.length}
            onOpenSessionMeta={() => setIsMetaSheetOpen(true)}
            elapsedSeconds={workoutStartTime ? elapsedSeconds : undefined}
          />

          <div className="mt-4 px-4 w-full max-w-lg mx-auto pb-48">
            {workoutDraft.exercises.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-semibold text-neutral-900">No workout loaded yet.</p>
                <button
                  type="button"
                  onClick={addCustomExercise}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900"
                >
                  <Plus className="h-4 w-4" />
                  Add exercise
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {workoutDraft.exercises[currentExerciseIndex] && (
                  <ExerciseCard
                    key={workoutDraft.exercises[currentExerciseIndex].exercise_id}
                    exercise={workoutDraft.exercises[currentExerciseIndex]}
                    exerciseIndex={currentExerciseIndex}
                    onUpdateExercise={updateExercise}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onUpdateSet={updateSet}
                    onSetCompleted={() => {
                      if (!workoutStartTime) setWorkoutStartTime(Date.now());
                      restTimer.start();
                    }}
                  />
                )}

                <ExerciseNav
                  currentIndex={currentExerciseIndex}
                  totalExercises={workoutDraft.exercises.length}
                  exerciseName={workoutDraft.exercises[currentExerciseIndex]?.name}
                  onPrev={() => setCurrentExerciseIndex(p => Math.max(0, p - 1))}
                  onNext={() => setCurrentExerciseIndex(p => Math.min(workoutDraft.exercises.length - 1, p + 1))}
                  onAddExercise={addCustomExercise}
                  completedIndices={new Set(
                    workoutDraft.exercises
                      .map((ex, i) => ex.status === "completed" ? i : -1)
                      .filter(i => i !== -1)
                  )}
                />
              </div>
            )}
          </div>

          <RestTimer
            isRunning={restTimer.isRunning}
            remainingSeconds={restTimer.remainingSeconds}
            onSkip={restTimer.skip}
            onAdjust={restTimer.adjust}
            onClose={restTimer.skip}
          />

          <SessionMetaSheet
            isOpen={isMetaSheetOpen}
            onClose={() => setIsMetaSheetOpen(false)}
            draft={workoutDraft}
            onUpdateDraft={updateDraft}
            selectedPlan={selectedPlan}
            completionSummary={completionSummary}
            isDirty={workoutIsDirty}
            isExistingLog={!!selectedLog}
          />

          <WorkoutSummary
            isOpen={isSummaryOpen}
            onClose={() => setIsSummaryOpen(false)}
            title={selectedPlan?.title || "Custom Workout"}
            date={selectedDate}
            durationSeconds={elapsedSeconds}
            completedExercises={completionSummary.completed}
            totalExercises={completionSummary.totalPlanned || workoutDraft.exercises.length}
            sessionStreak={logs ? computeStreak(logs) : undefined}
            painTrendAvg={logs ? computePainTrend(logs) : undefined}
          />
        </div>
      )}

      {view === "programs" && (
        <section className="grid gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:p-6 elevation-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                    Program versions
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                    Manual version history
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={duplicateLatestProgram}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900 elevation-1 interactive-card"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate latest
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {planVersions.map((plan) => (
                  <button
                    key={plan.version_id}
                    type="button"
                    onClick={() => setSelectedPlanVersionId(plan.version_id)}
                    className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors elevation-1 interactive-card ${selectedPlanVersionId === plan.version_id
                      ? "border-teal-600 bg-teal-50"
                      : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{plan.title}</p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Effective {formatDateLabel(plan.effective_start_date)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${plan.status === "active"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-neutral-200 bg-white text-neutral-500"
                          }`}
                      >
                        {plan.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:p-6 elevation-1">
            {programDraft ? (
              <div className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-neutral-700">Program title</span>
                    <input
                      type="text"
                      value={programDraft.title}
                      onChange={(event) => updateProgramDraft("title", event.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus-ring"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-neutral-700">Effective start</span>
                    <input
                      type="date"
                      value={programDraft.effective_start_date}
                      onChange={(event) =>
                        updateProgramDraft("effective_start_date", event.target.value)
                      }
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus-ring"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-neutral-700">Program ID</span>
                    <input
                      type="text"
                      value={programDraft.program_id}
                      onChange={(event) => updateProgramDraft("program_id", event.target.value)}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus-ring"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-neutral-700">Version status</span>
                    <select
                      value={programDraft.status}
                      onChange={(event) =>
                        updateProgramDraft("status", event.target.value as PlanStatus)
                      }
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus-ring"
                    >
                      <option value="active">active</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Coach notes</span>
                  <textarea
                    value={programDraft.general_notes}
                    onChange={(event) => updateProgramDraft("general_notes", event.target.value)}
                    rows={3}
                    className="w-full rounded-[1.5rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus-ring"
                  />
                </label>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                      Exercises
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Duplicate the latest version, then adjust targets and notes for the next
                      phase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addProgramExercise}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900 elevation-1 interactive-card"
                  >
                    <Plus className="h-4 w-4" />
                    Add exercise
                  </button>
                </div>

                <div className="space-y-4">
                  {programDraft.exercises.map((exercise, index) => (
                    <article
                      key={exercise.exercise_id}
                      className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4 elevation-1"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          <Grip className="h-3.5 w-3.5" />
                          Exercise {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProgramExercise(exercise.exercise_id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="space-y-2 xl:col-span-2">
                          <span className="text-sm font-medium text-neutral-700">Name</span>
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(event) =>
                              updateProgramExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Category</span>
                          <input
                            type="text"
                            value={exercise.category ?? ""}
                            onChange={(event) =>
                              updateProgramExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                category: event.target.value || undefined,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Primary muscle</span>
                          <input
                            type="text"
                            value={exercise.primary_muscle ?? ""}
                            onChange={(event) =>
                              updateProgramExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                primary_muscle: event.target.value || undefined,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Target sets</span>
                          <input
                            type="number"
                            min="1"
                            value={exercise.target_sets}
                            onChange={(event) =>
                              updateProgramExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                target_sets: Number(event.target.value) || 1,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                          />
                        </label>
                        <label className="space-y-2 xl:col-span-3">
                          <span className="text-sm font-medium text-neutral-700">Target reps / time</span>
                          <input
                            type="text"
                            value={exercise.target_reps_or_time}
                            onChange={(event) =>
                              updateProgramExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                target_reps_or_time: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                          />
                        </label>
                      </div>

                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-medium text-neutral-700">Exercise note</span>
                        <textarea
                          value={exercise.notes ?? ""}
                          onChange={(event) =>
                            updateProgramExercise(exercise.exercise_id, (current) => ({
                              ...current,
                              notes: event.target.value || undefined,
                            }))
                          }
                          rows={2}
                          className="w-full rounded-[1.25rem] border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                        />
                      </label>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                Pick a program version or duplicate the latest one to start editing.
              </div>
            )}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/95 px-3 py-3 backdrop-blur-xl lg:px-8 lg:py-4 safe-bottom">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {view === "today" && workoutMessage && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {workoutMessage}
              </span>
            )}
            {view === "today" && workoutError && (
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
                <XCircle className="h-4 w-4" />
                {workoutError}
              </span>
            )}
            {view === "programs" && programMessage && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                <Sparkles className="h-4 w-4" />
                {programMessage}
              </span>
            )}
            {view === "programs" && programError && (
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
                <XCircle className="h-4 w-4" />
                {programError}
              </span>
            )}
            {view === "today" && workoutIsDirty && !workoutError && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                Draft saved on this device until you hit Save workout.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {view === "programs" && (
              <button
                type="button"
                onClick={handleProgramSave}
                disabled={!programDraft || savingProgram}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingProgram ? "Saving program..." : "Save program version"}
              </button>
            )}
            {view === "today" && (
              <button
                type="button"
                onClick={handleWorkoutSave}
                disabled={savingWorkout}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingWorkout ? "Saving workout..." : "Save workout"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
