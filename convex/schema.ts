import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  moments: defineTable({
    owner: v.string(),
    clientId: v.string(),
    raw: v.string(),
    source: v.string(),
    project: v.string(),
    category: v.string(),
    topics: v.array(v.string()),
    summary: v.string(),
    lesson: v.string(),
    angle: v.string(),
    hook: v.string(),
    createdAt: v.string(),
  })
    .index("by_owner", ["owner", "createdAt"])
    .index("by_owner_client", ["owner", "clientId"]),

  drafts: defineTable({
    owner: v.string(),
    title: v.string(),
    content: v.string(),
    tone: v.string(),
    status: v.union(v.literal("draft"), v.literal("ready"), v.literal("published")),
    entryIds: v.array(v.string()),
    createdAt: v.string(),
  }).index("by_owner", ["owner", "createdAt"]),

  voiceProfiles: defineTable({
    owner: v.string(),
    instructions: v.string(),
    updatedAt: v.string(),
  }).index("by_owner", ["owner"]),
});
