"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";
import { ArrowRight, NotebookPen } from "lucide-react";

export default function LoginPage() {
  const [signup, setSignup] = useState(false);
  const ready = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  );
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <a href="/" className="auth-brand"><NotebookPen size={21}/> Codexiary</a>
        <h1>{signup ? "Create your account." : "Welcome back."}</h1>
        <p>Use a single secure account in Codexiary and ChatGPT.</p>
        {!ready ? (
          <p className="auth-message">
            Convex + Clerk authentication isn't configured on this deployment yet.
            Local journal mode is still available.
          </p>
        ) : signup ? <SignUp routing="hash" /> : <SignIn routing="hash" />}
        {ready && <button className="auth-switch" onClick={() => setSignup(!signup)}>
          {signup ? "Already have an account? Sign in" : "Need an account? Sign up"}
          <ArrowRight size={15}/>
        </button>}
      </div>
    </main>
  );
}
