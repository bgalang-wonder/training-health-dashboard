import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const planExercise = v.object({
    exercise_id: v.optional(v.string()),
    name: v.string(),
    category: v.optional(v.string()),
    primary_muscle: v.optional(v.string()),
    target_sets: v.optional(v.number()),
    target_reps_or_time: v.optional(v.string()),
    sets: v.optional(v.number()),
    reps_or_time: v.optional(v.string()),
    notes: v.optional(v.string()),
});

const loggedExercise = v.object({
    exercise_id: v.optional(v.string()),
    plan_exercise_id: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    category: v.optional(v.string()),
    primary_muscle: v.optional(v.string()),
    status: v.optional(
        v.union(
            v.literal("planned"),
            v.literal("completed"),
            v.literal("skipped"),
            v.literal("modified"),
            v.literal("added"),
        )
    ),
    sets: v.number(),
    reps: v.optional(v.union(v.number(), v.string())),
    weight: v.optional(v.number()),
    weight_lbs: v.optional(v.number()),
    duration_s: v.optional(v.number()),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
});

export default defineSchema({
    oura_days: defineTable({
        date: v.string(),
        readiness_score: v.optional(v.union(v.number(), v.null())),
        sleep_score: v.optional(v.union(v.number(), v.null())),
        activity_score: v.optional(v.union(v.number(), v.null())),
        hrv_balance_score: v.optional(v.union(v.number(), v.null())),
        heart_rate_data: v.optional(
            v.array(
                v.object({
                    timestamp: v.string(),
                    bpm: v.number(),
                })
            )
        ),
        sleep_periods: v.optional(
            v.array(
                v.object({
                    bedtime_start: v.string(),
                    bedtime_end: v.string(),
                })
            )
        ),
    }).index("by_date", ["date"]),

    training_plans: defineTable({
        program_id: v.optional(v.string()),
        version_id: v.optional(v.string()),
        title: v.optional(v.string()),
        effective_start_date: v.optional(v.string()),
        status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
        plan_id: v.optional(v.string()),
        date_prescribed: v.optional(v.string()),
        general_notes: v.optional(v.string()),
        exercises: v.array(planExercise),
    })
        .index("by_version_id", ["version_id"])
        .index("by_program_id", ["program_id"])
        .index("by_effective_start_date", ["effective_start_date"]),

    training_logs: defineTable({
        date: v.string(),
        rpe: v.optional(v.union(v.number(), v.null())),
        total_load: v.optional(v.union(v.number(), v.null())),
        focus: v.optional(v.union(v.string(), v.null())),
        exercises: v.optional(
            v.union(
                v.array(loggedExercise),
                v.null()
            )
        ),
        stressors: v.optional(v.union(v.string(), v.null())),
        workout_notes: v.optional(v.union(v.string(), v.null())),
        symptom_status: v.optional(v.union(v.string(), v.null())),
        symptom_location: v.optional(v.union(v.string(), v.null())),
        symptom_detail: v.optional(v.union(v.string(), v.null())),
        pain_modifiers: v.optional(v.union(v.string(), v.null())),
        completed_plan_id: v.optional(v.union(v.string(), v.null())),
    }).index("by_date", ["date"]),
});
