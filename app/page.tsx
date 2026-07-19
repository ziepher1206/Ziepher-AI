import { StudioShell } from "@/components/studio-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let userEmail: string | undefined;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    userEmail = user?.email;
  }

  return (
    <StudioShell
      authenticated={Boolean(userEmail)}
      userEmail={userEmail}
    />
  );
}
