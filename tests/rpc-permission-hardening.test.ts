import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/0010_rpc_permission_hardening.sql"),
  "utf8",
).toLowerCase();

function expectAuthenticatedOnly(signature: string) {
  expect(migration).toContain(`revoke execute on function ${signature} from public;`);
  expect(migration).toContain(`revoke execute on function ${signature} from anon;`);
  expect(migration).toContain(`grant execute on function ${signature} to authenticated;`);
}

function expectInternalOnly(signature: string) {
  expect(migration).toContain(`revoke execute on function ${signature} from public;`);
  expect(migration).toContain(`revoke execute on function ${signature} from anon;`);
  expect(migration).toContain(`revoke execute on function ${signature} from authenticated;`);
}

describe("Supabase privileged RPC permission hardening", () => {
  it("keeps membership helpers authenticated-only", () => {
    expectAuthenticatedOnly("public.is_workspace_member(uuid)");
    expectAuthenticatedOnly("public.is_project_member(uuid)");
  });

  it("keeps core application RPCs unavailable to anonymous callers", () => {
    const authenticatedRpcs = [
      "public.ensure_personal_workspace()",
      "public.create_project_with_workspace(text, text)",
      "public.save_project_plan(uuid, text, jsonb, text, text)",
      "public.select_visual_concept(uuid, uuid)",
      "public.approve_project_spec(uuid, uuid)",
      "public.queue_build_job(uuid, uuid, public.quality_mode)",
      "public.restore_project_version(uuid, integer)",
      "public.request_project_deployment(uuid, integer, text, text)",
      "public.get_project_sync_state(uuid)",
      "public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb)",
      "public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb)",
    ];

    for (const signature of authenticatedRpcs) {
      expectAuthenticatedOnly(signature);
    }
  });

  it("keeps privileged internal helpers unavailable to browser roles", () => {
    expectInternalOnly("public.finalize_build_job(uuid, boolean, integer, text)");
    expectInternalOnly("public.handle_new_user()");
    expectInternalOnly("public.initialize_project_sync_state()");
  });
});
