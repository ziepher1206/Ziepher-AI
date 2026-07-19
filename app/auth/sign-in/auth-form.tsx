"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const supabase = createClient();
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        setMessage(
          "Account created. Check your email if confirmation is enabled."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        window.location.assign("/");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }


  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start Google sign-in."
      );
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      setMessage("A secure sign-in link has been sent to your email.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to send sign-in link."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="brand auth-brand">
        <div className="brand-mark">Z</div>
        <div>
          <div className="brand-title">ZIEPHER AI</div>
          <div className="brand-subtitle">BUILD YOUR DREAMS</div>
        </div>
      </div>

      <div>
        <p className="panel-label">Secure workspace</p>
        <h1>{mode === "sign-in" ? "Welcome back" : "Create your studio"}</h1>
        <p className="auth-copy">
          Plan for free, compare visual directions, and build complete
          applications in an isolated workspace.
        </p>
      </div>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
      </label>

      {message ? <div className="auth-message">{message}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy
          ? "Working…"
          : mode === "sign-in"
            ? "Sign in"
            : "Create account"}
      </button>

      <button
        className="button"
        type="button"
        onClick={sendMagicLink}
        disabled={busy || !email}
      >
        Email me a sign-in link
      </button>

      <button
        className="button"
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        Continue with Google
      </button>

      <button
        className="text-button"
        type="button"
        onClick={() =>
          setMode((current) =>
            current === "sign-in" ? "sign-up" : "sign-in"
          )
        }
      >
        {mode === "sign-in"
          ? "New to Ziepher? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
