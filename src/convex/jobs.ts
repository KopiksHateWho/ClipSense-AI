import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all jobs for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
    return jobs;
  },
});

// Get a single job by ID
export const get = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// Create a new analysis job
export const create = mutation({
  args: {
    sourceType: v.union(v.literal("upload"), v.literal("youtube")),
    sourceUrl: v.optional(v.string()),
    sourceName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const jobId = await ctx.db.insert("jobs", {
      userId: identity.subject,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      sourceName: args.sourceName,
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
    });

    return jobId;
  },
});

// Update job status (called by processing pipeline)
export const updateStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("transcribing"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    error: v.optional(v.string()),
    duration: v.optional(v.number()),
    clipCount: v.optional(v.number()),
    exportedCount: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      ...(args.progress !== undefined && { progress: args.progress }),
      ...(args.error !== undefined && { error: args.error }),
      ...(args.duration !== undefined && { duration: args.duration }),
      ...(args.clipCount !== undefined && { clipCount: args.clipCount }),
      ...(args.exportedCount !== undefined && { exportedCount: args.exportedCount }),
      ...(args.completedAt !== undefined && { completedAt: args.completedAt }),
    });
  },
});
