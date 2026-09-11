import Link from "next/link";
import { redirect } from "next/navigation";
import { BillingControls } from "./billing-controls";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function BillingPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <main className="settings-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER AI</div>
            <div className="brand-subtitle">BILLING & CREDITS</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/settings/connections">
            Connections
          </Link>
          <Link className="button" href="/">
            Return to studio
          </Link>
        </div>
      </header>

      <section className="settings-intro">
        <span className="panel-label">Final integration stage</span>
        <h1>Plan freely. Pay only when Ziepher writes the app.</h1>
        <p>
          Stripe remains disabled until the core builder and test-mode financial
          gates are verified. Subscription payments never run inside generated
          applications unless their owners explicitly add them at the end.
        </p>
      </section>

      <BillingControls />
    </main>
  );
}
