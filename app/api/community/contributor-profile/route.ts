import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { displayName?: unknown } | null;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing, error: selectError } = await admin
    .from("community_contributors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (selectError) return NextResponse.json({ error: "Could not load contributor identity." }, { status: 500 });

  const result = existing
    ? await admin
        .from("community_contributors")
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("id, display_name, status, is_verified")
        .single()
    : await admin
        .from("community_contributors")
        .insert({ user_id: user.id, display_name: displayName, status: "community_member", is_verified: false })
        .select("id, display_name, status, is_verified")
        .single();

  if (result.error) return NextResponse.json({ error: "Could not save contributor identity." }, { status: 500 });
  return NextResponse.json({ contributor: result.data });
}
