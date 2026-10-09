import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const fields = {
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
};

async function owner(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Please sign in to your Codexiary account.");
  return identity.subject;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await owner(ctx);
    return await ctx.db.query("moments")
      .withIndex("by_owner", (q) => q.eq("owner", user))
      .order("desc").take(500);
  },
});

export const create = mutation({
  args: fields,
  handler: async (ctx, input) => {
    const user = await owner(ctx);
    if (!input.raw.trim() || input.raw.length > 12000) throw new Error("Invalid journal note.");
    const existing = await ctx.db.query("moments")
      .withIndex("by_owner_client", (q) =>
        q.eq("owner", user).eq("clientId", input.clientId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("moments", { owner: user, ...input });
  },
});

export const importLocal = mutation({
  args: { entries: v.array(v.object(fields)) },
  handler: async (ctx, { entries }) => {
    const user = await owner(ctx);
    if (entries.length > 100) throw new Error("Import up to 100 entries per batch.");
    let count = 0;
    for (const input of entries) {
      if (!input.raw.trim() || input.raw.length > 12000) continue;
      const existing = await ctx.db.query("moments")
        .withIndex("by_owner_client", (q) =>
          q.eq("owner", user).eq("clientId", input.clientId))
        .unique();
      if (!existing) {
        await ctx.db.insert("moments", { owner: user, ...input });
        count++;
      }
    }
    return count;
  },
});

export const remove = mutation({
  args: { id: v.id("moments") },
  handler: async (ctx, { id }) => {
    const user = await owner(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.owner !== user) throw new Error("Entry not found.");
    await ctx.db.delete(id);
  },
});
