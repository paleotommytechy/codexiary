import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const DEFAULT_VOICE = "Write in first person, with thoughtful and clear language. Be specific and honest. Avoid generic hype, excessive emojis, invented results and corporate-sounding announcements.";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required.");
    const row = await ctx.db.query("voiceProfiles")
      .withIndex("by_owner", (q) => q.eq("owner", identity.subject)).unique();
    return row?.instructions || DEFAULT_VOICE;
  },
});

export const update = mutation({
  args: { instructions: v.string() },
  handler: async (ctx, { instructions }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required.");
    if (instructions.trim().length < 10 || instructions.length > 4000)
      throw new Error("Voice instructions must be 10–4000 characters.");
    const existing = await ctx.db.query("voiceProfiles")
      .withIndex("by_owner", (q) => q.eq("owner", identity.subject)).unique();
    const now = new Date().toISOString();
    if (existing) return await ctx.db.patch(existing._id, { instructions, updatedAt: now });
    return await ctx.db.insert("voiceProfiles", { owner: identity.subject, instructions, updatedAt: now });
  },
});
