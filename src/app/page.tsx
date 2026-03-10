"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import DashboardWrapper from "./DashboardWrapper";
import { calculateTotalLoad, mapPlanVersionToLegacyPlan } from "../lib/training";

export default function Home() {
  const logs = useQuery(api.logs.list);
  const plans = useQuery(api.plans.list);
  const ouraDays = useQuery(api.oura.list);

  if (logs === undefined || plans === undefined || ouraDays === undefined) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-neutral-200 bg-white/80 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-neutral-500 animate-pulse">Syncing data...</p>
        </div>
      </section>
    );
  }

  const formattedPlans = plans.map(mapPlanVersionToLegacyPlan);

  const ouraMap = new Map();
  for (const day of ouraDays) {
    ouraMap.set(day.date, day);
  }

  const logsMap = new Map();
  for (const log of logs) {
    logsMap.set(log.date, log);
  }

  const allDates = new Set([
    ...ouraDays.map(d => d.date),
    ...logs.map(l => l.date)
  ]);

  const mergedData = Array.from(allDates).map(date => {
    const ouraDay = ouraMap.get(date) || null;
    const log = logsMap.get(date);

    return {
      date: date,
      rpe: log?.rpe || 0,
      focus: log?.focus || "",
      total_load: log?.total_load || calculateTotalLoad(log?.exercises),
      exercises: log?.exercises || [],
      readiness: ouraDay?.readiness_score || 0,
      sleep: ouraDay?.sleep_score || 0,
      hrv: ouraDay?.hrv_balance_score || 0,
      stressors: log?.stressors || "",
      workout_notes: log?.workout_notes || "",
      notes: "",
      symptom_status: log?.symptom_status || null,
      symptom_location: log?.symptom_location || null,
      symptom_detail: log?.symptom_detail || "",
      pain_modifiers: log?.pain_modifiers || "",
      heart_rate_data: ouraDay?.heart_rate_data || [],
      sleep_periods: ouraDay?.sleep_periods || [],
      completed_plan_id: log?.completed_plan_id || null,
      plan: log?.completed_plan_id
        ? formattedPlans.find((plan) => plan.id === log.completed_plan_id)
        : null
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Recovery Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
              See training cost next to readiness, sleep, and HRV
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              This stays read-focused: Oura context, symptom tracking, flare patterns, and plan
              adherence over time. Use Workouts when you want to execute and log the session itself.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 ring-1 ring-emerald-200 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              Live (Convex)
            </div>
          </div>
        </div>
      </section>

      <DashboardWrapper data={mergedData} plans={formattedPlans} />
    </div>
  );
}
