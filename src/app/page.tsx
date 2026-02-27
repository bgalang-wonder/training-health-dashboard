import { fetchOuraData } from "../lib/oura";
import { trainingLogs } from "../data/training_logs";
import { trainingPlans } from "../data/training_plans";
import DashboardWrapper from "./DashboardWrapper";

export default async function Home() {
  // Start from baseline
  const start_date = "2026-02-25";
  const ouraData = await fetchOuraData(start_date);

  // Merge Oura Data with Training Logs
  const mergedData = trainingLogs.map(log => {
    const ouraDay = ouraData[log.date] || null;
    return {
      date: log.date,
      rpe: log.rpe || 0,
      focus: log.focus || "",
      total_load: log.total_load || 0,
      exercises: log.exercises || [],
      readiness: ouraDay?.readiness_score || 0,
      sleep: ouraDay?.sleep_score || 0,
      hrv: ouraDay?.hrv_balance_score || 0,
      stressors: log.stressors || "",
      notes: log.workout_notes || "",
      back_pain_score: log.back_pain_score ?? null,
      pain_modifiers: log.pain_modifiers || "",
      heart_rate_data: ouraDay?.heart_rate_data || [],
      plan: log.completed_plan_id ? trainingPlans.find(p => p.id === log.completed_plan_id) : null
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // We pass ALL plans to the dashboard so Brandon can flip through historical ones
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2">Training Health</h1>
            <p className="text-neutral-400">Syncing Oura + RPE + Stressors to track cost of training.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/50 text-neutral-300 ring-1 ring-neutral-700/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Oura Connected
            </div>
          </div>
        </header>

        {/* Client Wrapper for Charts & Interactions */}
        <DashboardWrapper data={mergedData} plans={trainingPlans} />

      </div>
    </main>
  );
}
