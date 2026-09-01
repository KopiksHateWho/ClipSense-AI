import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
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
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ClipSense analysis jobs
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

    // Individual clips from analysis
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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
