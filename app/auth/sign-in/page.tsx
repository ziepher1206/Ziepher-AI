import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function SignInPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand auth-brand">
            <div className="brand-mark">Z</div>
            <div>
              <div className="brand-title">ZIEPHER AI</div>
              <div className="brand-subtitle">BUILD YOUR DREAMS</div>
            </div>
          </div>
          <h1>Connect Supabase first</h1>
          <p className="auth-copy">
            Add the Supabase URL and publishable key to your environment, then
            run the migrations before signing in.
          </p>
          <Link className="button primary auth-submit" href="/">
            Return to local studio
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="auth-page">
      <AuthForm />
    </main>
  );
}
