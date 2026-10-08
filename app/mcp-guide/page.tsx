import { ArrowLeft, ArrowRight, LockKeyhole, NotebookPen } from "lucide-react";

export default function MCPGuide() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://YOUR-VERCEL-DOMAIN";
  const endpoint = appUrl.replace(/\/$/, "") + "/mcp";
  return (
    <main className="guide-page">
      <a href="/" className="auth-brand"><NotebookPen size={21} /> Codexiary</a>
      <p className="eyebrow accent">CHATGPT CONNECTION</p>
      <h1>Build while ChatGPT remembers.</h1>
      <p>
        Codexiary exposes a private MCP server so you can save useful work,
        retrieve lessons, and prepare weekly LinkedIn drafts from ChatGPT.
        It does not need an OpenAI API key for these ChatGPT-powered actions.
      </p>
      <h2>First-time setup</h2>
      <ol>
        <li>Set up a dedicated Supabase project using the repository instructions. Enable OAuth 2.1 and configure the authorization path as <code>/oauth/consent</code>.</li>
        <li>Sign in to Codexiary with your Supabase account. In Settings, import previous local notes if you want to sync them.</li>
        <li>Open ChatGPT on the web. In Plugins, use <strong>Add custom MCP server</strong> (if your account/workspace allows it).</li>
        <li>Use the server address shown below. Choose <strong>OAuth</strong>, scan tools, then authorize your Codexiary account.</li>
        <li>In a chat, select or @mention Codexiary and ask ChatGPT to save a useful work moment or review the past week.</li>
      </ol>
      <code className="guide-code">{endpoint}</code>
      <h2>Try these prompts</h2>
      <p><strong>During a coding session:</strong> “Save a concise, factual note about the debugging problem we just solved to Codexiary. Include the lesson and project.”</p>
      <p><strong>At the end of the week:</strong> “Use Codexiary to review my last 7 days, suggest two LinkedIn angles, and write one in my saved writing voice.”</p>
      <p><strong>After drafting:</strong> “Save the draft to Codexiary. Do not publish it.”</p>
      <h2>Privacy and limitations</h2>
      <p><LockKeyhole size={15} style={{ verticalAlign: "middle" }} /> Your data is protected by account authentication and Supabase row-level security. Only save material you are permitted to store, especially from PAMA or other workplaces.</p>
      <p>Codexiary cannot silently read every ChatGPT conversation. You choose what to save. Scheduled tasks may not automatically have access to custom MCP plugins; verify their behavior in your ChatGPT account before relying on daily autonomous capture.</p>
      <a href="/" className="secondary-pill"><ArrowLeft size={15}/> Return to Codexiary</a>
      <a href="/login" className="primary-button" style={{ marginLeft: 12 }}>Sign in <ArrowRight size={15}/></a>
    </main>
  );
}
