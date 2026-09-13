import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!isSupabaseConfigured()) redirect("/auth/sign-in");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  redirect(user ? "/projects" : "/auth/sign-in");
}
