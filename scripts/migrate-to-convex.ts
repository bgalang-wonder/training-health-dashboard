import { ConvexHttpClient } from "convex/browser";
import { trainingLogs } from "../src/data/training_logs";
import { trainingPlans } from "../src/data/training_plans";
import { fetchOuraData } from "../src/lib/oura";
import { anyApi } from "convex/server";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
    console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
    process.exit(1);
}

const client = new ConvexHttpClient(url);

async function main() {
    console.log("Starting Convex database migration...");

    console.log("\\n--- Migrating Training Plans ---");
    for (const plan of trainingPlans) {
        await client.mutation(anyApi.plans.saveVersion, {
            program_id: plan.program_id,
            version_id: plan.version_id,
            title: plan.title,
            effective_start_date: plan.effective_start_date,
            status: plan.status,
            general_notes: plan.general_notes,
            exercises: plan.exercises,
        });
        console.log(`✓ Plan ${plan.version_id}`);
    }

    console.log("\\n--- Migrating Training Logs ---");
    for (const log of trainingLogs) {
        await client.mutation(anyApi.logs.insert, {
            date: log.date,
            rpe: log.rpe || null,
            total_load: log.total_load || null,
            focus: log.focus || null,
            exercises: log.exercises || null,
            stressors: log.stressors || null,
            workout_notes: log.workout_notes || null,
            symptom_status: log.symptom_status || null,
            symptom_location: log.symptom_location || null,
            symptom_detail: log.symptom_detail || null,
            pain_modifiers: log.pain_modifiers || null,
            completed_plan_id: log.completed_plan_id || null,
        });
        console.log(`✓ Log ${log.date}`);
    }

    console.log("\\n--- Migrating Oura Data ---");
    const ouraData = await fetchOuraData("2026-02-25");
    for (const date of Object.keys(ouraData)) {
        await client.mutation(anyApi.oura.insertDay, {
            date: ouraData[date].date,
            readiness_score: ouraData[date].readiness_score,
            sleep_score: ouraData[date].sleep_score,
            activity_score: ouraData[date].activity_score,
            hrv_balance_score: ouraData[date].hrv_balance_score,
            heart_rate_data: ouraData[date].heart_rate_data,
            sleep_periods: ouraData[date].sleep_periods,
        });
        console.log(`✓ Oura ${date}`);
    }

    console.log("\\nMigration complete!");
}

main().catch(console.error);
