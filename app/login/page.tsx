"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, NotebookPen } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client) return;
    client.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (data.user) {
        const url = new URL(window.location.href);
        window.location.assign(safeRedirect(url.searchParams.get("redirect")));
      }
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setMessage("Cloud connection has not been configured by the owner.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm the new account, then sign in.");
    } else {
      const url = new URL(window.location.href);
      window.location.assign(safeRedirect(url.searchParams.get("redirect")));
    }
    setBusy(false);
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <a href="/" className="auth-brand"><NotebookPen size={21} /> Codexiary</a>
        <div className="auth-icon"><LockKeyhole size={22} /></div>
        <h1>{mode === "login" ? "Welcome back." : "Create your account."}</h1>
        <p>Sign in to connect your private journal across ChatGPT and Codexiary.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {message && <p role="alert" className="auth-message">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16}/></button>
        </form>
        <button className="auth-switch" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
