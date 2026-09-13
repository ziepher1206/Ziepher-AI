import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentTeamConsole } from "@/components/agent-team-console";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AgentTeamPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-title">ZIEPHER TECH</div>
            <div className="brand-subtitle">AGENT TEAM</div>
          </div>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/operate">
            Operate
          </Link>
          <Link className="button" href="/projects">
            Projects
          </Link>
          <Link className="button" href="/settings">
            Settings
          </Link>
        </div>
      </header>

      <AgentTeamConsole />
    </main>
  );
}
