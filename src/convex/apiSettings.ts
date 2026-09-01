import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get current user's API settings
export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const settings = await ctx.db
      .query("apiSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return settings;
  },
});

// Save/update API settings
export const save = mutation({
  args: {
    transcriptionProvider: v.union(
      v.literal("groq"),
      v.literal("deepgram"),
      v.literal("assemblyai"),
      v.literal("openai"),
    ),
    transcriptionApiKey: v.string(),
    llmProvider: v.union(
      v.literal("claude"),
      v.literal("openai"),
      v.literal("gemini"),
    ),
    llmApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("apiSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        transcriptionProvider: args.transcriptionProvider,
        transcriptionApiKey: args.transcriptionApiKey,
        llmProvider: args.llmProvider,
        llmApiKey: args.llmApiKey,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("apiSettings", {
        userId: identity.subject,
        transcriptionProvider: args.transcriptionProvider,
        transcriptionApiKey: args.transcriptionApiKey,
        llmProvider: args.llmProvider,
        llmApiKey: args.llmApiKey,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Check if user has configured APIs
export const isConfigured = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const settings = await ctx.db
      .query("apiSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return !!(settings?.transcriptionApiKey && settings?.llmApiKey);
  },
});
