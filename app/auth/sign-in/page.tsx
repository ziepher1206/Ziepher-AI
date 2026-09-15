import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ next?: string }> };

function safeNext(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = safeNext(next);

  if (!isSupabaseConfigured()) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand auth-brand">
            <div className="brand-mark">Z</div>
            <div>
              <div className="brand-title">Z-LIFE</div>
              <div className="brand-subtitle">BUILT BY ZIEPHER TECH</div>
            </div>
          </div>
          <h1>Builder setup is not connected yet</h1>
          <p className="auth-copy">
            The account system needs its Supabase connection before Z-Life can open the builder.
          </p>
          <Link className="button primary auth-submit" href="/">
            Return home
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) redirect(nextPath);

  return (
    <main className="auth-page">
      <AuthForm nextPath={nextPath} />
    </main>
  );
}
