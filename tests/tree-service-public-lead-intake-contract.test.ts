import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const intake = read("supabase/migrations/20260913235500_tree_service_phase2_public_lead_intake.sql");
const publicLock = read("supabase/migrations/20260913235700_tree_service_phase2_lock_public_lead_rpc.sql");
const route = read("app/api/public/operate/leads/[token]/route.ts");

describe("Tree Service public lead intake contract", () => {
  it("requires a valid active intake token and enforces allowed origin when configured", () => {
    expect(intake).toContain("where token = p_token");
    expect(intake).toContain("and revoked_at is null");
    expect(intake).toContain("expires_at is null or expires_at > now()");
    expect(intake).toContain("v_token.allowed_origin is not null");
    expect(intake).toContain("This website is not allowed to submit through this intake link.");
  });

  it("derives origin from the request header rather than request JSON", () => {
    expect(route).toContain('const origin = request.headers.get("origin")');
    expect(route).toContain("p_origin: origin");
    expect(route).not.toContain("p_origin: input.");
  });

  it("requires a stable submission id and returns the existing lead on retries", () => {
    expect(intake).toContain("if p_submission_id is null then raise exception 'Submission ID is required.'");
    expect(intake).toContain("where workspace_id = v_token.workspace_id and public_submission_id = p_submission_id");
    expect(intake).toContain("if v_existing is not null then return v_existing; end if;");
    expect(intake).toContain("when unique_violation then");
  });

  it("requires usable contact information and bounds public input lengths", () => {
    expect(intake).toContain("if v_email is null and v_phone is null then raise exception 'Add an email address or phone number.'");
    expect(intake).toContain("char_length(v_name) < 1 or char_length(v_name) > 160");
    expect(intake).toContain("char_length(v_message) > 5000");
    expect(intake).toContain("char_length(v_detail) > 500");
  });

  it("rate limits each intake token before inserting new leads", () => {
    expect(intake).toContain("where public_intake_token_id = v_token.id");
    expect(intake).toContain("received_at > now() - interval '1 hour'");
    expect(intake).toContain(">= 120 then raise exception 'This intake form is temporarily rate limited.'");
  });

  it("preserves workspace, project, source, consent and intake attribution", () => {
    expect(intake).toContain("workspace_id, project_id, contact_name, email, phone, service_address, message");
    expect(intake).toContain("source, source_detail, status, sms_consent, sms_consent_at");
    expect(intake).toContain("public_submission_id, public_intake_token_id");
    expect(intake).toContain("v_token.workspace_id, v_token.project_id");
    expect(intake).toContain("p_submission_id, v_token.id");
  });

  it("keeps token management admin-only and forces public lead submission through the server", () => {
    expect(intake).toContain("Workspace administrator access required.");
    expect(intake).toContain("grant execute on function public.create_operate_lead_intake_token");
    expect(publicLock).toContain("submit_public_operate_lead(uuid,uuid,text,text,text,text,text,text,text,text,boolean) from public, anon, authenticated");
    expect(publicLock).toContain("submit_public_operate_lead(uuid,uuid,text,text,text,text,text,text,text,text,boolean) to service_role");
    expect(route).toContain("createAdminClient");
    expect(route).toContain('supabase.rpc("submit_public_operate_lead"');
  });
});
