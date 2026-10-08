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
- Local-first storage in the browser, with optional private cloud sync and MCP connectivity.

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

## ChatGPT MCP and private cloud journal (V2)

Codexiary now has an optional ChatGPT MCP bridge. ChatGPT can save structured work moments, retrieve recent journal entries, draft weekly LinkedIn ideas, and save post drafts **without an OpenAI API key**. The private cloud uses Supabase OAuth 2.1 with per-user row-level security.

**[Full setup guide](docs/CHATGPT_MCP.md)** — includes the Supabase SQL migration, Vercel environment settings, OAuth 2.1 configuration and ChatGPT custom MCP plugin setup.

This cannot automatically access every ChatGPT chat; you explicitly ask ChatGPT to save useful context from the current conversation. No automatic LinkedIn publishing is included.
