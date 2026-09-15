import Link from "next/link";
import { redirect } from "next/navigation";

import { ZLifeAssistantRouter } from "@/components/zlife-assistant-router";
import { ZLifeHeartbeat } from "@/components/zlife-heartbeat";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const card: React.CSSProperties = {
  border: "1px solid rgba(78,234,221,.24)",
  borderRadius: 22,
  background: "linear-gradient(145deg,rgba(7,43,46,.84),rgba(3,22,25,.94))",
  boxShadow: "0 18px 55px rgba(0,0,0,.24)"
};

export default async function AssistantPage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <main style={{ minHeight: "100vh", color: "#f6fffd", background: "radial-gradient(circle at 72% 5%,rgba(56,224,243,.16),transparent 25%),radial-gradient(circle at 12% 18%,rgba(16,217,129,.09),transparent 28%),linear-gradient(180deg,#02090b,#041315 52%,#02090b)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 18px 70px" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(78,234,221,.16)", background: "rgba(2,9,11,.88)", backdropFilter: "blur(18px)" }}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
            <div className="brand">
              <div className="brand-mark" style={{ background: "linear-gradient(135deg,#38e0f3,#10d981)", color: "#001112" }}>Z</div>
              <div>
                <div className="brand-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><span>Z</span><ZLifeHeartbeat width={32} height={12} /><span>LIFE</span></div>
                <div className="brand-subtitle">ASK Z-LIFE</div>
              </div>
            </div>
          </Link>
          <Link className="button" href="/dashboard">Home</Link>
        </header>

        <section style={{ ...card, marginTop: 32, padding: "34px clamp(22px,5vw,52px)", background: "linear-gradient(120deg,rgba(2,15,18,.96),rgba(7,45,47,.78)),radial-gradient(circle at 84% 20%,rgba(56,224,243,.20),transparent 28%)" }}>
          <p style={{ margin: 0, color: "#7fffd4", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase" }}>One place to start</p>
          <h1 style={{ margin: "10px 0", fontSize: "clamp(40px,6vw,68px)", lineHeight: .98, letterSpacing: "-.045em" }}>What do you need help with?</h1>
          <p style={{ maxWidth: 720, margin: "0 0 22px", color: "#b0cac7", lineHeight: 1.65 }}>You should not have to learn where every feature lives. Say what you need and Z-Life will point you to the simplest working next step.</p>
          <ZLifeAssistantRouter />
        </section>

        <p style={{ margin: "14px 6px 0", color: "#789b97", lineHeight: 1.55, fontSize: 12 }}>Routing here does not spend paid AI tokens. Optional paid AI explanation remains approval-gated and cannot silently message customers, charge cards, publish ads, or change production.</p>
      </div>
    </main>
  );
}
