# Codexiary on Convex: ChatGPT MCP

Codexiary now uses **Convex for all cloud data** and **Clerk for login/OAuth**. Supabase is not used. The existing browser-only journal stays functional until you set up the cloud.

## Your existing Convex project

- Team: `ifeoluwa-tomiwa`
- Project: `codexiary`
- Dashboard deployment selected: `fantastic-panda-480`
- Dashboard: https://dashboard.convex.dev/t/ifeoluwa-tomiwa/codexiary/fantastic-panda-480

**Important:** That is a dashboard page, not a database API endpoint or API credential. The GitHub and Convex connectors available here cannot inspect or deploy directly to this URL. Copy the actual **Deployment URL** shown in the Convex dashboard's settings (it normally ends in `.convex.cloud`).

## Architecture

```text
Codexiary (Next.js + Vercel)      ChatGPT
    │ Clerk login                    │ OAuth consent (Clerk)
    │ ConvexProviderWithClerk        │
    ▼                                ▼
Convex authenticated             Vercel /mcp
queries and mutations            │ Clerk OAuth validation
    │                             │ validated user ID
    │                             │ separate 32+ char secret
    ▼                             ▼
       Existing Codexiary Convex deployment
       ├─ moments
       ├─ drafts
       └─ voiceProfiles
```

Clerk stores authentication identities, not journal entries. The ChatGPT MCP proxy validates Clerk OAuth tokens on Vercel and uses a **separate server-to-server secret** validated by the Convex backend. No public or client-side function accepts arbitrary owners without authentication.

### 1. Link this repository to the *existing* Convex project

On a development machine with Node 20+:

```bash
git clone https://github.com/paleotommytechy/codexiary.git
cd codexiary
npm install
npx convex dev --once
```

In the Convex CLI, sign in and **select the existing project `ifeoluwa-tomiwa/codexiary`** rather than creating a duplicate project. Confirm the deployment it selects. Do not paste a deploy key into a chat.

Running `npx convex dev --once` will regenerate the checked-in bootstrap file under `convex/_generated/` with actual Convex data model types and deploy the schema/functions. If you need to deploy to the **production** deployment rather than the linked development one, configure a production deploy key and use `npx convex deploy`. Never assume the dashboard deployment is production.

### 2. Set up Clerk login

Create a Clerk app for Codexiary at https://dashboard.clerk.com and enable the Convex integration. You need:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

In the Convex deployment's **Environment Variables**, configure:

```env
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-frontend-api-host>
```

See [Convex + Clerk](https://docs.convex.dev/auth/clerk). This issuer must match the Clerk app connected to your Vercel deployment. Sync Convex after setting the env var.

In the Clerk Dashboard, enable OAuth applications and client registration for ChatGPT. Prefer **Client ID Metadata Documents (CIMD)** for supported clients; enable **Dynamic Client Registration (DCR)** only if ChatGPT requires it, since DCR admits new OAuth clients to the registration endpoint. Check Clerk's [MCP connection instructions](https://clerk.com/docs/guides/ai/mcp/connect-mcp-client).

### 3. Configure the MCP bridge shared secret

Generate a random 32-byte secret **locally**:

```bash
openssl rand -hex 32
```

Set the identical value as `CODEXIARY_MCP_BRIDGE_SECRET` in:
- Convex deployment → Settings → Environment Variables
- Vercel project → Settings → Environment Variables

**Never** use a `NEXT_PUBLIC_` prefix or commit the value to GitHub. The browser must not receive it.

### 4. Add Vercel variables

```env
NEXT_PUBLIC_CONVEX_URL=<your exact Convex deployment URL>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CODEXIARY_MCP_BRIDGE_SECRET=<identical secret set in Convex>
NEXT_PUBLIC_APP_URL=https://<your-canonical-vercel-domain>
```

Don't set Supabase variables. You do not need `OPENAI_API_KEY` for any ChatGPT MCP action. It remains optional for the separate *in-app* AI generation endpoint.

Redeploy Vercel after setting these variables.

### 5. Test your browser journal

1. Open Codexiary and select Settings.
2. Sign in via Clerk.
3. Confirm the cloud connection reads `Up to date`.
4. Capture a safe test journal entry.
5. Reload and confirm it remains saved.
6. Use **Import local notes** only when you're ready to migrate the browser-only entries.

Avoid saving customer secrets, passwords, or confidential work material.

### 6. Connect ChatGPT through OAuth

Custom MCP connections require access to the applicable ChatGPT feature. When available, add:

```
https://<your-canonical-vercel-domain>/mcp
```

Choose OAuth authorization, approve the Clerk consent screen, then scan tools.

Available tools: `account`, `save_moment`, `list_moments`, `weekly_review`, `save_post_draft`, `list_post_drafts`, `get_voice_profile`, `update_voice_profile`.

Examples:

- “Save what we learned while fixing this TypeScript issue to Codexiary. Only use details from this conversation.”
- “Summarize the last 7 days of my Codexiary journal. Suggest two strong post angles and cite the source entries.”
- “Use my Codexiary voice profile to write a reflective LinkedIn post from my journal; save the draft there. Do not publish.”

### Privacy and automation limitations

- Cloud entries are segregated by authenticated Clerk user ID in every Convex function. Server-side MCP calls use separately validated Clerk OAuth identity plus the bridge secret.
- The app does not silently read all of your other ChatGPT chats. You instruct ChatGPT to save relevant moments.
- Scheduled ChatGPT tasks may or may not be able to call your custom MCP connection. Verify this explicitly; otherwise automate a **reminder**, not a claim of guaranteed background ingestion.
- LinkedIn publishing is not implemented. Drafts always require your review.

### What was removed

The old Supabase SQL migration, login/consent implementation, JavaScript client and package dependencies have been removed from this branch.

### Deployment verification still required

GitHub CI can validate the Next.js code and TypeScript, but cannot prove that the existing Convex deployment has received the backend schema or that the Clerk OAuth flow works until the external configuration above is completed. Test `/mcp` with an authorized MCP client before using it for real records.
