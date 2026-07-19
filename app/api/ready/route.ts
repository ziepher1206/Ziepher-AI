import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        status: "not_ready",
        reason: "Supabase is not configured."
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("projects")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) throw error;

    return NextResponse.json(
      { status: "ready", timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "not_ready",
        reason:
          error instanceof Error ? error.message : "Database check failed."
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
