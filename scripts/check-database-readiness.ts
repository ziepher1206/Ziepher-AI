import { createClient } from "@supabase/supabase-js";
import { LAUNCH_CRITICAL_RELATIONS } from "../lib/db/readiness-contract";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const failures: Array<{ name: string; area: string; message: string }> = [];

  for (const relation of LAUNCH_CRITICAL_RELATIONS) {
    const { error } = await supabase
      .from(relation.name)
      .select("*", { head: true, count: "exact" });

    if (error) {
      failures.push({ name: relation.name, area: relation.area, message: error.message });
      console.error(`✗ ${relation.area}: ${relation.name} — ${error.message}`);
    } else {
      console.log(`✓ ${relation.area}: ${relation.name}`);
    }
  }

  if (failures.length) {
    console.error(`\nDatabase readiness failed: ${failures.length} launch-critical relation(s) unavailable.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nDatabase readiness passed: ${LAUNCH_CRITICAL_RELATIONS.length} launch-critical relations available.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
