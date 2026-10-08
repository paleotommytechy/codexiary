# ChatGPT ↔ Codexiary via MCP

This integration lets ChatGPT save factual notes to your Codexiary account and draft from them **without needing an OpenAI API key**. ChatGPT generates the text using the model you're already conversing with. Codexiary is the storage and retrieval service.

## Architecture

```text
ChatGPT / Codexiary plugin
   │ OAuth 2.1 + PKCE
   ▼
https://<your-vercel-domain>/mcp
   │ Verified Supabase bearer identity
   ├─ save_moment
   ├─ list_moments
   ├─ weekly_review
   ├─ save_post_draft
   ├─ list_post_drafts
   ├─ get_voice_profile
   ├─ update_voice_profile
   └─ account
          │ RLS: auth.uid() = user_id
          ▼
    Supabase Postgres
          ▲
          │ signed-in browser client
          │
     Codexiary Journal and Content Studio
```

## One-time provisioning (manual)

**1. Create a NEW Supabase project named Codexiary.**

Do not reuse your Accfikole or any unrelated app's database.

**2. Run** `supabase/migrations/20261008_codexiary_mcp.sql` **in its SQL Editor.**

The tables enable row-level security: `journal_entries`, `content_drafts`, `voice_profiles`. Each row is scoped to `auth.uid()`. Never use a Supabase secret/service-role key in browser variables or GitHub.

**3. Enable Supabase Auth's OAuth 2.1 Server.**

- In Supabase Dashboard: **Authentication → OAuth Server**.
- Enable OAuth 2.1 and **Dynamic Client Registration (DCR)** (you can instead register ChatGPT as a public client with its exact redirect URI).
- Set **Authorization Path** to `/oauth/consent`.
- Set **Authentication → URL Configuration → Site URL** to the canonical Vercel domain (`https://...`).
- Use an asymmetric JWT signing key (Supabase Auth settings) because OpenID Connect's `openid` scope requires it.
- Review OAuth client registrations and require user approval. Do not accept clients you don't recognize.

**4. Add Vercel project environment variables.**

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=https://<your-canonical-codexiary-domain>
```

All 3 are public configuration values; **never** add `SUPABASE_SERVICE_ROLE_KEY` or OAuth client secrets to the browser.

**5. Deploy / redeploy, then sign in.**

Open your Vercel app → Settings → Sign in to cloud, create/log in to a Supabase Auth user using email and password. Depending on your Supabase email configuration, a newly created user might need to confirm their email before signing in. You can import existing local journal entries explicitly from the Settings panel.

**6. Connect ChatGPT's MCP plugin.**

Open ChatGPT on the web → Plugins → Add custom MCP server (availability depends on plan/workspace permissions).

- Server URL: `https://<your-canonical-codexiary-domain>/mcp`
- Authentication: **OAuth**
- ChatGPT should discover Supabase via `/.well-known/oauth-protected-resource`.
- Use **Scan Tools**, approve the OAuth consent in Codexiary, then create/install the plugin.

If ChatGPT shows an OAuth callback URI, ensure it is accepted by the Supabase OAuth client registration. DCR registers clients automatically where available; otherwise register the public client with the exact URI and use that configuration.

You can test the MCP protocol using MCP Inspector, but private tool calls must be authorized; anonymous requests should receive HTTP 401 with the OAuth metadata challenge.

## What you can say to ChatGPT

- **Save:** “Save the implementation challenges and lessons from this conversation to Codexiary, associated with project DevDoc AI. Only include details we actually discussed.”
- **Course:** “Save our discussion of this networking lecture to Codexiary as a FUOYE lecture note.”
- **Weekly:** “Review my past seven days in Codexiary, identify two strong LinkedIn stories, and tell me the supporting entry IDs. Don't publish.”
- **Voice:** “Use my saved Codexiary voice profile to draft a thoughtful LinkedIn update based on entry XYZ.”
- **Draft:** “Save that final draft to Codexiary so I can edit it in Content Studio.”

ChatGPT may ask for confirmation for write tools. The plugin does not automatically access unrelated conversations or publish anything to LinkedIn.

## Security and privacy

- **No-auth write endpoints are intentionally disabled.** Every MCP method verifies a Supabase OAuth bearer token and its user. Tokens without an OAuth client ID are rejected.
- All database read/write operations use the user's OAuth token; RLS isolates accounts. Service-role keys are not used.
- Never send employer/customer confidential material, credentials, proprietary code, or privileged information to the journal without permission.
- The app's own optional `/api/ai` endpoint is still separate. Leave `OPENAI_API_KEY` unset if you want ChatGPT to do the AI writing and use Codexiary simply as storage.

## Scheduling and automation limitation

A ChatGPT scheduled task **may not be able to inspect other chats or invoke custom MCP write tools** in every plan/runtime. Do not assume autonomous “read all my conversations every evening.” The reliable workflow is to tell ChatGPT to save relevant context *during the current working chat*, and optionally use a scheduled reminder to prompt a review. Test whether scheduled plugin actions are supported in your account before promising automatic capture.

## Product status

- V1 browser-only notes remain usable with no Supabase setup.
- Cloud notes and ChatGPT drafts appear in the journal/content studio after you sign in and refresh.
- Local notes are imported to the cloud **only when you choose** Import local notes.
- App-created local-mode drafts work as before; signed-in users can also save drafts to the cloud.
- Full automation of cross-chat collection, GitHub ingestion, semantic search, and LinkedIn publishing is **not part of this version**.
