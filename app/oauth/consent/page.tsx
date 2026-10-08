"use client";

import { useEffect, useState } from "react";
import { Check, LockKeyhole, NotebookPen, Shield, X } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type ConsentInfo = {
  authorization_id?: string;
  redirect_url?: string;
  client?: { name?: string; description?: string };
  redirect_uri?: string;
  scope?: string;
};

export default function OAuthConsent() {
  const [id, setId] = useState("");
  const [details, setDetails] = useState<ConsentInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getBrowserSupabase();
      const url = new URL(window.location.href);
      const authorizationId = url.searchParams.get("authorization_id");
      if (!supabase || !authorizationId) {
        setError("Authorization request is missing or cloud sync is not configured.");
        return;
      }
      setId(authorizationId);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.assign(
          `/login?redirect=${encodeURIComponent("/oauth/consent?authorization_id=" + authorizationId)}`,
        );
        return;
      }

      const { data, error: issue } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (issue || !data) {
        setError(issue?.message || "This authorization request is invalid or expired.");
        return;
      }
      const info = data as ConsentInfo;
      if (!info.authorization_id && info.redirect_url) {
        window.location.assign(info.redirect_url);
        return;
      }
      setDetails(info);
    }
    void load();
  }, []);

  async function decide(approve: boolean) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    const result = approve
      ? await supabase.auth.oauth.approveAuthorization(id)
      : await supabase.auth.oauth.denyAuthorization(id);
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      return;
    }
    window.location.assign(result.data.redirect_url);
  }

  return (
    <main className="auth-screen">
      <div className="auth-card consent-card">
        <div className="auth-brand"><NotebookPen size={21} /> Codexiary</div>
        <div className="auth-icon"><Shield size={24} /></div>
        <h1>Connect your journal.</h1>
        <p>Give ChatGPT permission to read and save work in your private Codexiary account.</p>
        {details ? (
          <>
            <div className="consent-details">
              <strong>{details.client?.name || "Connected application"}</strong>
              <span>Requests access to your Codexiary account</span>
              <small>Redirect: {details.redirect_uri || "Authorized client"}</small>
              <small>OAuth permissions: {details.scope || "openid"}</small>
              <small>Codexiary tools can read and create journal entries, writing preferences, and drafts. They cannot publish to LinkedIn.</small>
            </div>
            <div className="consent-actions">
              <button className="secondary-button" disabled={busy} onClick={() => decide(false)}><X size={16}/> Deny</button>
              <button className="primary-button" disabled={busy} onClick={() => decide(true)}><Check size={16}/> Allow access</button>
            </div>
          </>
        ) : !error ? <p>Checking your authorization request...</p> : null}
        {error && <p role="alert" className="auth-message">{error}</p>}
        <p className="consent-footer"><LockKeyhole size={14}/> Protected with Supabase OAuth 2.1</p>
      </div>
    </main>
  );
}
