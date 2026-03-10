"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Grip,
  Plus,
  Save,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
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

type WorkoutView = "today" | "history" | "programs";

type WorkoutExerciseDraft = {
  exercise_id: string;
  plan_exercise_id?: string | null;
  name: string;
  category?: string;
  primary_muscle?: string;
  status: WorkoutExerciseStatus;
  target_sets?: number;
  target_reps_or_time?: string;
  target_notes?: string;
  sets: string;
  reps: string;
  duration_minutes: string;
  weight: string;
  notes: string;
  rpe: string;
};

type WorkoutDraft = {
  date: string;
  focus: string;
  rpe: string;
  workout_notes: string;
  completed_plan_id: string;
  exercises: WorkoutExerciseDraft[];
};

type ProgramDraft = {
  program_id: string;
  version_id: string;
  title: string;
  effective_start_date: string;
  status: PlanStatus;
  general_notes: string;
  exercises: PlanExercise[];
};

const WORKOUT_VIEWS: Array<{ id: WorkoutView; label: string }> = [
  { id: "today", label: "Today" },
  { id: "history", label: "History" },
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

function toMinutes(durationSeconds?: number) {
  return durationSeconds ? String(Math.round(durationSeconds / 60)) : "";
}

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function makeExerciseDraftFromPlan(exercise: PlanExercise): WorkoutExerciseDraft {
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
    sets: toStringValue(exercise.target_sets),
    reps: "",
    duration_minutes: "",
    weight: "",
    notes: "",
    rpe: "",
  };
}

function makeExerciseDraftFromLog(exercise: LoggedExercise): WorkoutExerciseDraft {
  return {
    exercise_id: exercise.exercise_id,
    plan_exercise_id: exercise.plan_exercise_id ?? undefined,
    name: exercise.name,
    category: exercise.category,
    primary_muscle: exercise.primary_muscle,
    status: exercise.status,
    sets: toStringValue(exercise.sets),
    reps: toStringValue(exercise.reps),
    duration_minutes: toMinutes(exercise.duration_s),
    weight: toStringValue(exercise.weight ?? exercise.weight_lbs),
    notes: exercise.notes ?? "",
    rpe: toStringValue(exercise.rpe),
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
  const exercises: LoggedExercise[] = draft.exercises.map((exercise) => ({
    exercise_id: exercise.exercise_id,
    plan_exercise_id: exercise.plan_exercise_id ?? null,
    name: exercise.name,
    category: exercise.category || undefined,
    primary_muscle: exercise.primary_muscle || undefined,
    status: exercise.status,
    sets: toNumber(exercise.sets) ?? 0,
    reps: exercise.reps.trim() ? (toNumber(exercise.reps) ?? exercise.reps.trim()) : undefined,
    weight: toNumber(exercise.weight),
    weight_lbs: toNumber(exercise.weight),
    duration_s: toNumber(exercise.duration_minutes)
      ? (toNumber(exercise.duration_minutes) ?? 0) * 60
      : undefined,
    rpe: toNumber(exercise.rpe),
    notes: exercise.notes.trim() || undefined,
  }));

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
        setWorkoutDraft(JSON.parse(savedDraft) as WorkoutDraft);
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

  const historyItems = useMemo(() => {
    return (logs ?? []).map((log) => {
      const linkedPlan =
        (log.completed_plan_id ? plansByVersionId.get(log.completed_plan_id) : undefined) ??
        resolvePlanForDate(planVersions, log.date);

      return {
        log,
        plan: linkedPlan,
        summary: getWorkoutCompletionSummary(linkedPlan, log.exercises),
      };
    });
  }, [logs, planVersions, plansByVersionId]);

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
            sets: "1",
            reps: "",
            duration_minutes: "",
            weight: "",
            notes: "",
            rpe: "",
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
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Workout Program Tracker
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
              Execute the plan without losing the history
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Today is optimized for live logging. History keeps old workouts pinned to the exact
              plan version they were performed against, and Programs is where you duplicate and
              edit Ryan&apos;s next version.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
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
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Session setup
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Focus / title</span>
                  <input
                    type="text"
                    value={workoutDraft.focus}
                    onChange={(event) => updateDraft("focus", event.target.value)}
                    placeholder="Full body, lower body, recovery..."
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Session RPE</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={workoutDraft.rpe}
                    onChange={(event) => updateDraft("rpe", event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                    Completion
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-900">
                    {completionSummary.completed} done, {completionSummary.modified} modified,{" "}
                    {completionSummary.skipped} skipped
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {completionSummary.added} custom additions
                  </p>
                </div>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-neutral-700">Workout notes</span>
                <textarea
                  value={workoutDraft.workout_notes}
                  onChange={(event) => updateDraft("workout_notes", event.target.value)}
                  rows={4}
                  placeholder="How did it go? What changed mid-session?"
                  className="w-full rounded-[1.5rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white"
                />
              </label>
            </div>

            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <Target className="h-4 w-4 text-teal-600" />
                Program context
              </div>
              {selectedPlan ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                      Linked version
                    </p>
                    <p className="mt-2 text-lg font-semibold text-neutral-900">{selectedPlan.title}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Effective {formatDateLabel(selectedPlan.effective_start_date)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                        Planned exercises
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-neutral-900">
                        {selectedPlan.exercises.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                        Estimated load
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-neutral-900">
                        {buildWorkoutPayload(workoutDraft, selectedLog).total_load?.toLocaleString() ?? 0}
                      </p>
                    </div>
                  </div>
                  {selectedPlan.general_notes && (
                    <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                      {selectedPlan.general_notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 p-5">
                  <p className="text-sm font-semibold text-neutral-900">No active plan for this date.</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Head to Programs to create or activate a version, then come back here to log
                    the session against it.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                  Exercise execution
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                  Planned work plus live adjustments
                </h2>
              </div>
              <button
                type="button"
                onClick={addCustomExercise}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900"
              >
                <Plus className="h-4 w-4" />
                Add exercise
              </button>
            </div>

            {workoutDraft.exercises.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-semibold text-neutral-900">No workout loaded yet.</p>
                <p className="mt-2 text-sm text-neutral-600">
                  Create or activate a program version, or add a custom exercise to log a freeform
                  session.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workoutDraft.exercises.map((exercise, index) => {
                  const isCustom = !exercise.plan_exercise_id;
                  const disableActualFields = exercise.status === "skipped";

                  return (
                    <article
                      key={exercise.exercise_id}
                      className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">

                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                                {index + 1}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(
                                  exercise.status,
                                )}`}
                              >
                                {exercise.status}
                              </span>
                              {isCustom && (
                                <span className="label-text text-[10px] rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                                  Custom
                                </span>
                              )}
                              {exercise.category && (
                                <span className="label-text text-[10px] rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-neutral-600">
                                  {exercise.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(event) =>
                              updateExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            placeholder="Exercise name"
                            className="mt-4 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base font-semibold outline-none transition focus:border-teal-500 focus:bg-white focus-ring"
                          />

                          {(exercise.target_reps_or_time || exercise.target_notes) && (
                            <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 elevation-1 interactive-card">
                              <p className="font-semibold text-neutral-900">
                                Target: {exercise.target_sets ?? 0} x {exercise.target_reps_or_time}
                              </p>
                              {exercise.target_notes && (
                                <p className="mt-2 leading-6 text-neutral-600">{exercise.target_notes}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!isCustom &&
                            STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateExercise(exercise.exercise_id, (current) => ({
                                    ...current,
                                    status: option.value,
                                  }))
                                }
                                className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors elevation-1 interactive-card ${exercise.status === option.value
                                  ? "border-teal-600 bg-teal-600 text-white"
                                  : "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900"
                                  }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomExercise(exercise.exercise_id)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 elevation-1 interactive-card"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Sets</span>
                          <input
                            type="number"
                            min="0"
                            value={exercise.sets}
                            disabled={disableActualFields}
                            onChange={(event) =>
                              updateExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                sets: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Reps</span>
                          <input
                            type="text"
                            value={exercise.reps}
                            disabled={disableActualFields}
                            onChange={(event) =>
                              updateExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                reps: event.target.value,
                              }))
                            }
                            placeholder="10 or 10 each side"
                            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Duration (min)</span>
                          <input
                            type="number"
                            min="0"
                            value={exercise.duration_minutes}
                            disabled={disableActualFields}
                            onChange={(event) =>
                              updateExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                duration_minutes: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Weight (lbs)</span>
                          <input
                            type="number"
                            min="0"
                            value={exercise.weight}
                            disabled={disableActualFields}
                            onChange={(event) =>
                              updateExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                weight: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-neutral-700">Exercise RPE</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={exercise.rpe}
                            disabled={disableActualFields}
                            onChange={(event) =>
                              updateExercise(exercise.exercise_id, (current) => ({
                                ...current,
                                rpe: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                          />
                        </label>
                      </div>

                      <div className="mt-4 block space-y-2">
                        <span className="text-sm font-medium text-neutral-700">Notes</span>
                        <textarea
                          value={exercise.notes}
                          disabled={disableActualFields}
                          onChange={(event) =>
                            updateExercise(exercise.exercise_id, (current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="What changed, how it felt, cues, substitutions..."
                          className="w-full rounded-[1.5rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {view === "history" && (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Workout history
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
              Reopen past days against the plan version they actually used
            </h2>
          </div>

          <div className="space-y-4">
            {historyItems.map(({ log, plan, summary }) => (
              <article
                key={log.date}
                className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6 elevation-1"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                      {formatDateLabel(log.date)}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-neutral-900">
                      {log.focus || "Workout log"}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-600">
                      {plan?.title ?? "No linked plan"} • {summary.completed} done •{" "}
                      {summary.modified} modified • {summary.skipped} skipped • {summary.added} added
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(log.date);
                      setView("today");
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900 elevation-1 interactive-card"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Open day
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === "programs" && (
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6 elevation-1">
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

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6 elevation-1">
            {programDraft ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/95 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
