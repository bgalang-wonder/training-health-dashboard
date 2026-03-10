import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("oura_days").order("desc").collect();
    },
});

export const insertDay = mutation({
    args: {
        date: v.string(),
        readiness_score: v.optional(v.union(v.number(), v.null())),
        sleep_score: v.optional(v.union(v.number(), v.null())),
        activity_score: v.optional(v.union(v.number(), v.null())),
        hrv_balance_score: v.optional(v.union(v.number(), v.null())),
        heart_rate_data: v.optional(v.any()), // Pass as array of objects
        sleep_periods: v.optional(v.any()),   // Pass as array of objects
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("oura_days")
            .withIndex("by_date", (q) => q.eq("date", args.date))
            .first();

        if (existing) {
            return await ctx.db.patch(existing._id, args);
        }
        return await ctx.db.insert("oura_days", args);
    },
});
