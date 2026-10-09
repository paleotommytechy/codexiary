import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireOwner(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required.");
  return identity.subject;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireOwner(ctx);
    return await ctx.db.query("drafts")
      .withIndex("by_owner", (q) => q.eq("owner", user))
      .order("desc").take(100);
  },
});

export const create = mutation({
  args: {
    title: v.string(), content: v.string(), tone: v.string(), entryIds: v.array(v.string()),
  },
  handler: async (ctx, input) => {
    const user = await requireOwner(ctx);
    if (!input.content.trim() || input.content.length > 12000) throw new Error("Invalid draft.");
    return await ctx.db.insert("drafts", {
      owner: user, ...input, status: "draft", createdAt: new Date().toISOString(),
    });
  },
});
