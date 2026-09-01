import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all clips for a job
export const listByJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const clips = await ctx.db
      .query("clips")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("asc")
      .collect();
    return clips;
  },
});

// Get all clips for the current user
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const clips = await ctx.db
      .query("clips")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
    return clips;
  },
});

// Insert a clip (called by processing pipeline)
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
    if (!identity) throw new Error("Not authenticated");

    const clipId = await ctx.db.insert("clips", {
      jobId: args.jobId,
      userId: identity.subject,
      index: args.index,
      startTime: args.startTime,
      endTime: args.endTime,
      score: args.score,
      label: args.label,
      reason: args.reason,
      exported: false,
      createdAt: Date.now(),
    });

    return clipId;
  },
});

// Mark a clip as exported
export const markExported = mutation({
  args: { clipId: v.id("clips") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clipId, { exported: true });
  },
});
