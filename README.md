# Codexiary

**Capture the work. Keep the story.**

Codexiary is a personal developer journal and content operating system. It is designed to make professional documentation and consistent LinkedIn posting a side effect of doing the work — not another job.

## What V1 does

- 60-second quick capture for projects, lectures, assignments, workshops, conferences, career moments, and tech content.
- Browser voice dictation where supported.
- Automatic organization into a category, topics, summary, lesson, story angle, and potential hook.
- A searchable personal journal.
- A Content Radar that surfaces strong story signals from real entries.
- An editable LinkedIn draft workbench with Reflective, Technical, and Concise modes.
- Optional OpenAI enhancement with a fully usable local fallback.
- Local-first storage in the browser, with optional Convex cloud sync and MCP connectivity.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional OpenAI setup

Codexiary works without an API key. To turn on AI organization and AI drafting, create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna
```

The key is used only on the server route and is never exposed to the browser.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. Keep the default Next.js settings.
3. Deploy immediately to try the local-fallback version.
4. Optional: add `OPENAI_API_KEY` under **Project Settings → Environment Variables** and redeploy to enable AI.
5. Optional: set `OPENAI_MODEL` if you want to use a different supported model.

## Current architecture

```text
Next.js + TypeScript
├── Browser localStorage     # V1 journal persistence
├── Web Speech API           # optional voice capture
└── /api/ai
    └── OpenAI Responses API # optional organization + drafting
```

## Product principles

1. **Capture before content.** The private journal is the source of truth.
2. **Evidence before generation.** Posts should come from things that actually happened.
3. **Low friction.** A rough 30-second note should be enough.
4. **Human review stays required.** Codexiary drafts; the user decides what is public.
5. **Do not turn every moment into content.** The journal should remain useful even when nothing gets posted.

## Next milestones

- Authentication and cloud persistence with Convex or Supabase.
- GitHub OAuth and meaningful commit/PR clustering.
- Uploads for lectures, assignments, screenshots, and notes.
- Calendar/event context and post-event reflection prompts.
- Weekly reflection and two-post content queue.
- Personal voice profile learned from approved edits.
- Post-performance notes focused on conversations and opportunities, not vanity metrics.
- Semantic search across long-term professional memory.

---

Codexiary is being built as a personal tool first: a searchable record of what you build, learn, struggle with, and eventually know.

## ChatGPT ↔ Codexiary, powered by Convex

Codexiary now supports **your existing Convex project** as an optional cloud backend. It uses Clerk only for login and ChatGPT OAuth 2.1, while keeping your private work notes, post drafts and writing preferences in Convex.

- Sign in and sync captured work from the browser.
- Save lessons straight from ChatGPT via a custom OAuth-authenticated MCP server.
- Search moments, review the week, and save LinkedIn drafts without an OpenAI API key.
- Keep using the local-only journal if cloud configuration isn't complete.
- Import existing local entries explicitly; nothing is migrated silently.

**Setup guide:** [docs/CONVEX_MCP.md](docs/CONVEX_MCP.md).

**External setup is required:** Link this repo to the existing deployment, deploy Convex functions, configure Clerk credentials and the service secret, then redeploy on Vercel. This repo cannot configure your dashboard on its own.
