import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
        const plans = await ctx.db.query("training_plans").collect();
        return plans
            .filter((plan) => plan.version_id || plan.plan_id)
            .map((plan) => {
                const versionId = plan.version_id ?? plan.plan_id!;
                const effectiveStartDate = plan.effective_start_date ?? plan.date_prescribed ?? "";

                return {
                    ...plan,
                    program_id: plan.program_id ?? "legacy-program",
                    version_id: versionId,
                    title: plan.title ?? "Training Program",
                    effective_start_date: effectiveStartDate,
                    status: plan.status ?? "active",
                    exercises: plan.exercises.map((exercise, index) => ({
                        exercise_id:
                            exercise.exercise_id ?? `${versionId}-${index + 1}-${slugify(exercise.name)}`,
                        name: exercise.name,
                        category: exercise.category,
                        primary_muscle: exercise.primary_muscle,
                        target_sets: exercise.target_sets ?? exercise.sets ?? 0,
                        target_reps_or_time:
                            exercise.target_reps_or_time ?? exercise.reps_or_time ?? "",
                        notes: exercise.notes,
                    })),
                };
            })
            .sort((a, b) => b.effective_start_date.localeCompare(a.effective_start_date));
    },
});

export const saveVersion = mutation({
    args: {
        program_id: v.string(),
        version_id: v.string(),
        title: v.string(),
        effective_start_date: v.string(),
        status: v.union(v.literal("active"), v.literal("archived")),
        general_notes: v.optional(v.string()),
        exercises: v.array(planExercise),
    },
    handler: async (ctx, args) => {
        if (args.status === "active") {
            const siblingVersions = await ctx.db
                .query("training_plans")
                .withIndex("by_program_id", (q) => q.eq("program_id", args.program_id))
                .collect();

            for (const sibling of siblingVersions) {
                if (sibling.version_id !== args.version_id && sibling.status === "active") {
                    await ctx.db.patch(sibling._id, { status: "archived" });
                }
            }
        }

        const existing = await ctx.db
            .query("training_plans")
            .withIndex("by_version_id", (q) => q.eq("version_id", args.version_id))
            .first();

        if (existing) {
            return await ctx.db.patch(existing._id, args);
        }
        return await ctx.db.insert("training_plans", args);
    },
});
