import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      location: v.optional(v.string()),
      website: v.optional(v.string()),
      githubUrl: v.optional(v.string()),
    }).index("email", ["email"])
      .index("username", ["username"]),

    jobs: defineTable({
      userId: v.string(),
      sourceType: v.union(v.literal("upload"), v.literal("youtube")),
      sourceUrl: v.optional(v.string()),
      sourceName: v.string(),
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
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
      .index("by_status", ["status", "createdAt"]),

    clips: defineTable({
      jobId: v.id("jobs"),
      userId: v.string(),
      index: v.number(),
      startTime: v.number(),
      endTime: v.number(),
      score: v.number(),
      label: v.string(),
      reason: v.string(),
      exported: v.boolean(),
      createdAt: v.number(),
    }).index("by_job", ["jobId"])
      .index("by_user", ["userId"]),

    // User API settings
    apiSettings: defineTable({
      userId: v.string(),
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
        v.literal("sambanova"),
      ),
      llmApiKey: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
