import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Account = { id: string; email: string | undefined; db: SupabaseClient };

function oauthMetadataUrl(request: Request) {
  return new URL("/.well-known/oauth-protected-resource", request.url).toString();
}

function challenge(request: Request): Response {
  return new Response(
    JSON.stringify({ error: "unauthorized", message: "Connect your Codexiary account first." }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${oauthMetadataUrl(request)}", error="invalid_token"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

async function authenticate(request: Request): Promise<Account | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!url || !key || !token) return null;

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Always verify against the identity provider — never trust decoded JWT text.
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;

  // OAuth tokens have a client_id claim; regular browser sessions are not MCP credentials.
  try {
    const jwtPayload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { client_id?: string };
    if (!jwtPayload.client_id) return null;
  } catch {
    return null;
  }

  return { id: data.user.id, email: data.user.email, db };
}

function ok<T>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function failure(error: unknown) {
  return {
    isError: true,
    content: [{
      type: "text" as const,
      text: error instanceof Error ? error.message : "The Codexiary operation failed.",
    }],
  };
}

function makeServer(account: Account) {
  const server = new McpServer(
    { name: "codexiary", version: "0.2.0" },
    {
      instructions:
        "Codexiary is a private professional journal. Save notes only when the user explicitly requests it; never silently copy whole conversations. Never invent achievements or outcomes. Do not turn employer/confidential information into public posts without explicit permission. For writing posts, retrieve the voice profile and source entries first. Draft in ChatGPT and save the approved draft to Codexiary.",
    },
  );

  const auth = [{ type: "oauth2" as const, scopes: ["openid"] }];

  server.registerTool(
    "account",
    {
      title: "Connected Codexiary account",
      description: "Identify the Codexiary account linked to ChatGPT.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { "openai/profile": true, securitySchemes: auth },
    },
    async () => ok({ id: account.id, email: account.email || null }),
  );

  server.registerTool(
    "save_moment",
    {
      title: "Save a work or learning moment",
      description:
        "Save a concise, factual record of work already described in the chat, when explicitly asked. Can capture coding, lectures, debugging, workshops, conferences, project progress and lessons. Never invent outcomes or store secrets.",
      inputSchema: z.object({
        note: z.string().trim().min(1).max(12000),
        source: z.enum(["Project", "Lecture", "Assignment", "Workshop", "Conference", "Tech content", "Career", "Other"]).default("Project"),
        project: z.string().max(160).optional(),
        category: z.enum(["Building", "Learning", "AI & Engineering", "Career", "Leadership"]).default("Learning"),
        summary: z.string().max(500).optional(),
        lesson: z.string().max(2000).optional(),
        topics: z.array(z.string().max(70)).max(10).optional(),
        angle: z.string().max(1000).optional(),
        hook: z.string().max(500).optional(),
      }),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (input) => {
      try {
        const row = {
          id: crypto.randomUUID(),
          user_id: account.id,
          raw: input.note,
          source: input.source,
          project: input.project || "",
          category: input.category,
          summary: input.summary || input.note.slice(0, 220),
          lesson: input.lesson || "",
          topics: input.topics || [],
          angle: input.angle || "",
          hook: input.hook || "",
        };
        const { data, error } = await account.db
          .from("journal_entries")
          .insert(row)
          .select("id, created_at, summary, project, source")
          .single();
        if (error) throw error;
        return ok({ saved: true, entry: data });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "list_moments",
    {
      title: "Search the professional journal",
      description: "Retrieve private captured work, lessons and learning moments to answer questions or prepare drafts.",
      inputSchema: z.object({
        query: z.string().max(160).optional(),
        project: z.string().max(160).optional(),
        days: z.number().int().min(1).max(3650).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, project, days, limit }) => {
      try {
        let qb = account.db
          .from("journal_entries")
          .select("id, raw, source, project, category, topics, summary, lesson, angle, hook, created_at")
          .eq("user_id", account.id)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (project) qb = qb.ilike("project", `%${project}%`);
        if (query) qb = qb.ilike("raw", `%${query}%`);
        if (days) qb = qb.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
        const { data, error } = await qb;
        if (error) throw error;
        return ok({ entries: data || [], count: data?.length || 0 });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "weekly_review",
    {
      title: "Review this week's learning",
      description: "Retrieve the last few days of real journal records, grouped by context for a weekly reflection or LinkedIn shortlist. Does not invent posts.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(31).default(7),
      }),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ days }) => {
      try {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await account.db
          .from("journal_entries")
          .select("id, raw, source, project, category, topics, summary, lesson, created_at")
          .eq("user_id", account.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        const entries = data || [];
        const byCategory = entries.reduce((acc: Record<string, number>, entry) => {
          acc[entry.category] = (acc[entry.category] || 0) + 1;
          return acc;
        }, {});
        return ok({
          days,
          captured: entries.length,
          byCategory,
          entries,
          guidance: "Suggest at most two concrete post angles, each citing supporting entry IDs. Do not invent facts. Get the voice profile before drafting.",
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "save_post_draft",
    {
      title: "Save a LinkedIn draft",
      description: "Store a LinkedIn post written in ChatGPT for review and editing inside Codexiary. This does NOT publish to LinkedIn.",
      inputSchema: z.object({
        content: z.string().trim().min(1).max(12000),
        title: z.string().max(160).default(""),
        tone: z.enum(["Reflective", "Technical", "Concise"]).default("Reflective"),
        entry_ids: z.array(z.string().max(100)).max(20).default([]),
      }),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ content, title, tone, entry_ids }) => {
      try {
        const { data, error } = await account.db
          .from("content_drafts")
          .insert({
            user_id: account.id,
            title,
            content,
            tone,
            entry_ids,
          })
          .select("id, title, status, created_at")
          .single();
        if (error) throw error;
        return ok({ saved: true, draft: data });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "list_post_drafts",
    {
      title: "View saved LinkedIn drafts",
      description: "Read drafts from Codexiary. Drafts are private and are not posted automatically.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(30).default(10),
      }),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit }) => {
      try {
        const { data, error } = await account.db
          .from("content_drafts")
          .select("id, title, content, tone, status, entry_ids, created_at")
          .eq("user_id", account.id)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return ok({ drafts: data || [] });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "get_voice_profile",
    {
      title: "Get my personal writing voice",
      description: "Read writing preferences before creating a LinkedIn draft so it sounds like the user and avoids generic AI phrasing.",
      inputSchema: z.object({}),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const { data, error } = await account.db
          .from("voice_profiles")
          .select("instructions")
          .eq("user_id", account.id)
          .maybeSingle();
        if (error) throw error;
        return ok({
          instructions: data?.instructions ||
            "Write in first person, with thoughtful and clear language. Be specific and honest. Avoid generic hype, excessive emojis, invented results and corporate-sounding announcements.",
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "update_voice_profile",
    {
      title: "Update my writing preferences",
      description: "Save user-approved voice and style preferences to Codexiary. Only when the user explicitly asks to update them.",
      inputSchema: z.object({
        instructions: z.string().trim().min(10).max(4000),
      }),
      _meta: { securitySchemes: auth },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ instructions }) => {
      try {
        const { error } = await account.db
          .from("voice_profiles")
          .upsert({ user_id: account.id, instructions, updated_at: new Date().toISOString() });
        if (error) throw error;
        return ok({ saved: true });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}

async function serve(request: Request): Promise<Response> {
  const account = await authenticate(request);
  if (!account) return challenge(request);

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (allowedOrigin) {
    const expectedHost = new URL(allowedOrigin).host;
    const host = new URL(request.url).host;
    if (expectedHost !== host) {
      return new Response("Invalid host", { status: 403 });
    }
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new Response("Cross-origin MCP requests not allowed", { status: 403 });
  }

  const handler = createMcpHandler(() => makeServer(account));
  return handler.fetch(request);
}

export async function POST(request: Request) { return serve(request); }
export async function GET(request: Request) { return serve(request); }
export async function DELETE(request: Request) { return serve(request); }
