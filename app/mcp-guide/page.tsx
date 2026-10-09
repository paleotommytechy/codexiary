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
        Codexiary uses Convex to store your private professional journal, and
        Clerk to securely connect ChatGPT over OAuth. No OpenAI API key is
        required to save and organize the work you discuss inside ChatGPT.
      </p>
      <h2>First-time setup</h2>
      <ol>
        <li>Link this repository to your existing Convex project, <strong>ifeoluwa-tomiwa / codexiary</strong>, and confirm the correct deployment in its Dashboard settings.</li>
        <li>Configure Clerk for Convex sign-in and enable Clerk OAuth client onboarding (Client ID Metadata or dynamic registration, only if needed).</li>
        <li>Deploy the backend functions using the Convex CLI, and add the environment variables from the repository instructions to Convex and Vercel.</li>
        <li>Open Codexiary and sign in. Import existing browser notes from Settings if you choose to.</li>
        <li>In ChatGPT, add a custom MCP connection where supported; choose OAuth and use the address below.</li>
      </ol>
      <code className="guide-code">{endpoint}</code>
      <h2>Try these prompts</h2>
      <p><strong>During a coding session:</strong> “Save a factual summary of the debugging issue we just solved to Codexiary, with the technical lesson and project name.”</p>
      <p><strong>At the end of the week:</strong> “Review my last seven days in Codexiary, suggest two post angles, and write one using my saved writing voice.”</p>
      <p><strong>After drafting:</strong> “Save the final draft to Codexiary for review. Don't publish it.”</p>
      <h2>Privacy and limitations</h2>
      <p><LockKeyhole size={15} style={{ verticalAlign: "middle" }} /> Every journal and draft function requires a verified account; the server bridge requires an additional secret. Don't save confidential employer code or credentials.</p>
      <p>Codexiary cannot silently read all your ChatGPT conversations. You explicitly choose what to store. Scheduled tasks may not have access to a custom MCP server, so check your plan's capabilities before relying on daily automatic capture.</p>
      <a href="/" className="secondary-pill"><ArrowLeft size={15}/> Return to Codexiary</a>
      <a href="/login" className="primary-button" style={{ marginLeft: 12 }}>Sign in <ArrowRight size={15}/></a>
    </main>
  );
}
