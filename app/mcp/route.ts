import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backend() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.CODEXIARY_MCP_BRIDGE_SECRET;
  if (!url || !secret || secret.length < 32)
    throw new Error("Codexiary MCP is not configured yet.");
  return { client: new ConvexHttpClient(url), secret };
}

function ownerFromContext(context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) {
  const ownerId = context.http?.authInfo?.extra?.userId;
  if (typeof ownerId !== "string" || !ownerId)
    throw new Error("A verified Clerk OAuth user is required.");
  return ownerId;
}

function okay(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function failed(error: unknown) {
  return {
    isError: true,
    content: [{ type: "text" as const, text:
      error instanceof Error ? error.message : "Codexiary could not complete the request." }],
  };
}

const handler = createMcpHandler((server) => {
  server.registerTool("account", {
    title: "Connected Codexiary account",
    description: "Verify the signed-in account that owns this private journal.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, openWorldHint: false },
    _meta: { "openai/profile": true },
  }, async (_args, context) => {
    const id = ownerFromContext(context);
    return okay({ connected: true, userId: id });
  });

  server.registerTool("save_moment", {
    title: "Save a learning or work moment",
    description: "Save an explicitly requested factual reflection from the current ChatGPT conversation to Codexiary. Never copy all chats silently, invent outcomes, or store credentials or employer secrets.",
    inputSchema: z.object({
      note: z.string().trim().min(1).max(12000),
      source: z.enum(["Project","Lecture","Assignment","Workshop","Conference","Tech content","Career","Other"]).default("Project"),
      project: z.string().max(160).default(""),
      category: z.enum(["Building","Learning","AI & Engineering","Career","Leadership"]).default("Learning"),
      summary: z.string().max(500).optional(),
      topics: z.array(z.string().max(70)).max(10).default([]),
      lesson: z.string().max(2000).default(""),
      angle: z.string().max(1000).default(""),
      hook: z.string().max(500).default(""),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input, context) => {
    try {
      const ownerId = ownerFromContext(context);
      const { client, secret } = backend();
      const saved = await client.mutation(anyApi.bridge.saveMoment, {
        secret, ownerId, raw: input.note, source: input.source, project: input.project,
        category: input.category, summary: input.summary || input.note.slice(0, 220),
        topics: input.topics, lesson: input.lesson, angle: input.angle, hook: input.hook,
      });
      return okay({ saved: true, entry: saved });
    } catch (error) { return failed(error); }
  });

  server.registerTool("list_moments", {
    title: "Search Codexiary journal",
    description: "Search private learning records to support grounded answers and posts.",
    inputSchema: z.object({
      query: z.string().max(160).optional(), project: z.string().max(160).optional(),
      days: z.number().int().min(1).max(3650).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (input, context) => {
    try {
      const { client, secret } = backend();
      const rows = await client.query(anyApi.bridge.searchMoments, {
        secret, ownerId: ownerFromContext(context), ...input,
      });
      return okay({ entries: rows, count: rows.length });
    } catch (error) { return failed(error); }
  });

  server.registerTool("weekly_review", {
    title: "Review my recorded week",
    description: "Retrieve factual moments from the previous days to identify no more than two authentic LinkedIn story ideas.",
    inputSchema: z.object({ days: z.number().int().min(1).max(31).default(7) }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ days }, context) => {
    try {
      const { client, secret } = backend();
      const entries = await client.query(anyApi.bridge.searchMoments, {
        secret, ownerId: ownerFromContext(context), days, limit: 100,
      });
      const byCategory: Record<string, number> = {};
      for (const entry of entries as Array<{ category: string }>) {
        byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      }
      return okay({
        days, captured: entries.length, byCategory, entries,
        instructions: "Propose up to two story angles with supporting entry IDs. Never invent facts. Read the voice profile before writing.",
      });
    } catch (error) { return failed(error); }
  });

  server.registerTool("save_post_draft", {
    title: "Save a LinkedIn draft",
    description: "Save a draft to Codexiary for human review. Does NOT publish to LinkedIn.",
    inputSchema: z.object({
      content: z.string().trim().min(1).max(12000),
      title: z.string().max(160).default(""),
      tone: z.enum(["Reflective","Technical","Concise"]).default("Reflective"),
      entry_ids: z.array(z.string().max(100)).max(20).default([]),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ entry_ids, ...input }, context) => {
    try {
      const { client, secret } = backend();
      const saved = await client.mutation(anyApi.bridge.saveDraft, {
        secret, ownerId: ownerFromContext(context), ...input, entryIds: entry_ids,
      });
      return okay({ saved: true, draft: saved });
    } catch (error) { return failed(error); }
  });

  server.registerTool("list_post_drafts", {
    title: "View saved LinkedIn drafts",
    description: "Read private drafts; no automatic publishing.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(30).default(10) }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit }, context) => {
    try {
      const { client, secret } = backend();
      const drafts = await client.query(anyApi.bridge.listDrafts, {
        secret, ownerId: ownerFromContext(context), limit,
      });
      return okay({ drafts });
    } catch (error) { return failed(error); }
  });

  server.registerTool("get_voice_profile", {
    title: "Get my writing voice",
    description: "Retrieve the user's saved communication style before drafting.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async (_args, context) => {
    try {
      const { client, secret } = backend();
      const instructions = await client.query(anyApi.bridge.getVoice, {
        secret, ownerId: ownerFromContext(context),
      });
      return okay({ instructions });
    } catch (error) { return failed(error); }
  });

  server.registerTool("update_voice_profile", {
    title: "Update my writing preferences",
    description: "Save explicitly user-approved instructions for LinkedIn writing.",
    inputSchema: z.object({ instructions: z.string().trim().min(10).max(4000) }),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ instructions }, context) => {
    try {
      const { client, secret } = backend();
      const result = await client.mutation(anyApi.bridge.updateVoice, {
        secret, ownerId: ownerFromContext(context), instructions,
      });
      return okay(result);
    } catch (error) { return failed(error); }
  });
});

const authenticatedHandler = withMcpAuth(
  handler,
  async (_request, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp" },
);

export { authenticatedHandler as GET, authenticatedHandler as POST };
