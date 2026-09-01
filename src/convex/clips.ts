import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clips")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("asc")
      .collect();
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("clips")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Insert clip — gets userId from auth context (works when called from actions)
export const insert = mutation({
  args: {
    jobId: v.id("jobs"),
    index: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    score: v.number(),
    label: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || "anonymous";
    return await ctx.db.insert("clips", {
      jobId: args.jobId,
      userId,
      index: args.index,
      startTime: args.startTime,
      endTime: args.endTime,
      score: args.score,
      label: args.label,
      reason: args.reason,
      exported: false,
      createdAt: Date.now(),
    });
  },
});

export const markExported = mutation({
  args: { clipId: v.id("clips") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clipId, { exported: true });
  },
});
