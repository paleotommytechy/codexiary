/*
 * Authenticated service bridge for the ChatGPT MCP route.
 * Requests use a Clerk OAuth token verified on the Vercel server, then a
 * separate shared secret verified here. The Vercel server is the only holder
 * of the secret besides this Convex deployment.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function checkSecret(provided: string) {
  const actual = process.env.CODEXIARY_MCP_BRIDGE_SECRET;
  if (!actual || actual.length < 32 || provided !== actual) {
    throw new Error("Unauthorized MCP service.");
  }
}
const auth = { secret: v.string(), ownerId: v.string() };

export const saveMoment = mutation({
  args: { ...auth,
    raw: v.string(), source: v.string(), project: v.string(), category: v.string(),
    summary: v.string(), topics: v.array(v.string()),
    lesson: v.string(), angle: v.string(), hook: v.string(),
  },
  handler: async (ctx, { secret, ownerId, ...input }) => {
    checkSecret(secret);
    if (!ownerId || !input.raw.trim() || input.raw.length > 12000) throw new Error("Invalid note.");
    const clientId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await ctx.db.insert("moments", { owner: ownerId, clientId, createdAt, ...input });
    return { clientId, createdAt, summary: input.summary };
  },
});

export const searchMoments = query({
  args: { ...auth, query: v.optional(v.string()), project: v.optional(v.string()),
    days: v.optional(v.number()), limit: v.number() },
  handler: async (ctx, input) => {
    checkSecret(input.secret);
    const limit = Math.min(Math.max(input.limit, 1), 100);
    const entries = await ctx.db.query("moments")
      .withIndex("by_owner", (q) => q.eq("owner", input.ownerId))
      .order("desc").take(500);
    const after = input.days ? Date.now() - input.days * 86400000 : 0;
    return entries.filter((entry) =>
      (!input.project || entry.project.toLowerCase().includes(input.project.toLowerCase())) &&
      (!input.query || (entry.raw + " " + entry.summary).toLowerCase().includes(input.query.toLowerCase())) &&
      (!after || Date.parse(entry.createdAt) >= after)
    ).slice(0, limit);
  },
});

export const saveDraft = mutation({
  args: { ...auth, title: v.string(), content: v.string(),
    tone: v.string(), entryIds: v.array(v.string()) },
  handler: async (ctx, { secret, ownerId, ...input }) => {
    checkSecret(secret);
    if (!ownerId || !input.content.trim() || input.content.length > 12000) throw new Error("Invalid draft.");
    const id = await ctx.db.insert("drafts", {
      owner: ownerId, ...input, status: "draft", createdAt: new Date().toISOString(),
    });
    return { id };
  },
});

export const listDrafts = query({
  args: { ...auth, limit: v.number() },
  handler: async (ctx, { secret, ownerId, limit }) => {
    checkSecret(secret);
    return await ctx.db.query("drafts")
      .withIndex("by_owner", (q) => q.eq("owner", ownerId))
      .order("desc").take(Math.min(30, Math.max(limit, 1)));
  },
});

export const getVoice = query({
  args: auth,
  handler: async (ctx, { secret, ownerId }) => {
    checkSecret(secret);
    const row = await ctx.db.query("voiceProfiles")
      .withIndex("by_owner", (q) => q.eq("owner", ownerId)).unique();
    return row?.instructions ||
      "Write in first person, with thoughtful and clear language. Be specific and honest. Avoid generic hype, excessive emojis, invented results and corporate-sounding announcements.";
  },
});

export const updateVoice = mutation({
  args: { ...auth, instructions: v.string() },
  handler: async (ctx, { secret, ownerId, instructions }) => {
    checkSecret(secret);
    if (instructions.length < 10 || instructions.length > 4000) throw new Error("Invalid profile length.");
    const row = await ctx.db.query("voiceProfiles")
      .withIndex("by_owner", (q) => q.eq("owner", ownerId)).unique();
    const updatedAt = new Date().toISOString();
    if (row) await ctx.db.patch(row._id, { instructions, updatedAt });
    else await ctx.db.insert("voiceProfiles", { owner: ownerId, instructions, updatedAt });
    return { saved: true };
  },
});
