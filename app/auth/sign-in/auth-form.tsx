"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REMEMBERED_EMAIL_KEY = "z-life.remembered-email";

export function AuthForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? window.localStorage.getItem("ziepher.remembered-email");
    if (!remembered) return;

    queueMicrotask(() => {
      setEmail(remembered);
      setRememberEmail(true);
    });
  }, []);

  function persistRememberedEmail() {
    if (rememberEmail && email) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      window.localStorage.removeItem("ziepher.remembered-email");
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      window.localStorage.removeItem("ziepher.remembered-email");
    }
  }

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
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          }
        });
        if (error) throw error;
        persistRememberedEmail();
        setMessage("Account created. Check your email if confirmation is enabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        persistRememberedEmail();
        router.push(nextPath);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      persistRememberedEmail();
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        }
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    setBusy(true);
    setMessage(null);
    try {
      persistRememberedEmail();
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        }
      });
      if (error) throw error;
      setMessage("A secure sign-in link has been sent to your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="brand auth-brand">
        <div className="brand-mark">Z</div>
        <div>
          <div className="brand-title">Z-LIFE BUILD</div>
          <div className="brand-subtitle">AI WEBSITE & APP BUILDER</div>
        </div>
      </div>

      <div>
        <p className="panel-label">One simple build flow</p>
        <h1>{mode === "sign-in" ? "Continue your build" : "Create your Z-Life account"}</h1>
        <p className="auth-copy">
          Sign in once, then go straight to the builder. Describe it, upload references, preview it, refine it, and publish only when you approve it.
        </p>
      </div>

      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
      </label>

      <label>
        Password
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
          <button className="button" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {mode === "sign-in" ? (
        <label style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} style={{ width: 16, height: 16 }} />
          Remember my email on this device
        </label>
      ) : null}

      {message ? <div className="auth-message">{message}</div> : null}

      <button className="button primary auth-submit" disabled={busy}>
        {busy ? "Working…" : mode === "sign-in" ? "Continue to Builder" : "Create account"}
      </button>

      <button className="button" type="button" onClick={sendMagicLink} disabled={busy || !email}>
        Email me a sign-in link
      </button>

      <button className="button" type="button" onClick={signInWithGoogle} disabled={busy}>
        Continue with Google
      </button>

      <button className="text-button" type="button" onClick={() => {
        setShowPassword(false);
        setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
      }}>
        {mode === "sign-in" ? "New to Z-Life? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
