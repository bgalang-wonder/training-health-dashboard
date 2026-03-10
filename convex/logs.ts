import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const loggedSet = v.object({
    set_number: v.number(),
    reps: v.optional(v.union(v.number(), v.string())),
    weight_lbs: v.optional(v.number()),
    duration_s: v.optional(v.number()),
    rpe: v.optional(v.number()),
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
    logged_sets: v.optional(v.array(loggedSet)),
});

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "exercise";
}

export const list = query({
    args: {},
    handler: async (ctx) => {
        const logs = await ctx.db.query("training_logs").order("desc").collect();
        return logs.map((log) => ({
            ...log,
            exercises: log.exercises?.map((exercise, index) => ({
                ...exercise,
                exercise_id: exercise.exercise_id ?? `${log.date}-${index + 1}-${slugify(exercise.name)}`,
                status: exercise.status ?? "completed",
            })) ?? null,
        }));
    },
});

export const insert = mutation({
    args: {
        date: v.string(),
        rpe: v.optional(v.union(v.number(), v.null())),
        total_load: v.optional(v.union(v.number(), v.null())),
        focus: v.optional(v.union(v.string(), v.null())),
        exercises: v.optional(v.union(v.array(loggedExercise), v.null())),
        stressors: v.optional(v.union(v.string(), v.null())),
        workout_notes: v.optional(v.union(v.string(), v.null())),
        symptom_status: v.optional(v.union(v.string(), v.null())),
        symptom_location: v.optional(v.union(v.string(), v.null())),
        symptom_detail: v.optional(v.union(v.string(), v.null())),
        pain_modifiers: v.optional(v.union(v.string(), v.null())),
        completed_plan_id: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        // Upsert by date
        const existing = await ctx.db
            .query("training_logs")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .first();

        if (existing) {
            return await ctx.db.patch(existing._id, args);
        }
        return await ctx.db.insert("training_logs", args);
    },
});
