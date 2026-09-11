-- Tighten SECURITY DEFINER and helper-function execution privileges.
--
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Several
-- application RPCs authenticate and authorize internally, but they should not
-- be invokable by anonymous callers. Trigger-only and worker-only functions
-- should never be exposed as browser RPCs.

alter function public.set_updated_at()
  set search_path = public;

-- Trigger-only functions. They continue to run as trigger functions owned by
-- postgres; browser roles do not need direct EXECUTE access.
revoke all on function public.handle_new_user()
  from public, anon, authenticated;
revoke all on function public.initialize_project_sync_state()
  from public, anon, authenticated;

-- Worker-only finalization. complete_build_job_worker() remains the guarded
-- service-role entry point and calls this function under its definer context.
revoke all on function public.finalize_build_job(uuid, boolean, integer, text)
  from public, anon, authenticated;
grant execute on function public.finalize_build_job(uuid, boolean, integer, text)
  to service_role;

-- Authenticated application RPCs. Remove the implicit PUBLIC/anon execution
-- path while preserving the signed-in flows already used by the application.
revoke all on function public.is_workspace_member(uuid)
  from public, anon;
revoke all on function public.is_project_member(uuid)
  from public, anon;
revoke all on function public.ensure_personal_workspace()
  from public, anon;
revoke all on function public.create_project_with_workspace(text, text)
  from public, anon;
revoke all on function public.save_project_plan(uuid, text, jsonb, text, text)
  from public, anon;
revoke all on function public.select_visual_concept(uuid, uuid)
  from public, anon;
revoke all on function public.approve_project_spec(uuid, uuid)
  from public, anon;
revoke all on function public.queue_build_job(uuid, uuid, public.quality_mode)
  from public, anon;
revoke all on function public.request_project_deployment(uuid, integer, text, text)
  from public, anon;
revoke all on function public.restore_project_version(uuid, integer)
  from public, anon;
revoke all on function public.get_project_sync_state(uuid)
  from public, anon;
revoke all on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb)
  from public, anon;
revoke all on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb)
  from public, anon;

grant execute on function public.is_workspace_member(uuid)
  to authenticated, service_role;
grant execute on function public.is_project_member(uuid)
  to authenticated, service_role;
grant execute on function public.ensure_personal_workspace()
  to authenticated, service_role;
grant execute on function public.create_project_with_workspace(text, text)
  to authenticated, service_role;
grant execute on function public.save_project_plan(uuid, text, jsonb, text, text)
  to authenticated, service_role;
grant execute on function public.select_visual_concept(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.approve_project_spec(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.queue_build_job(uuid, uuid, public.quality_mode)
  to authenticated, service_role;
grant execute on function public.request_project_deployment(uuid, integer, text, text)
  to authenticated, service_role;
grant execute on function public.restore_project_version(uuid, integer)
  to authenticated, service_role;
grant execute on function public.get_project_sync_state(uuid)
  to authenticated, service_role;
grant execute on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb)
  to authenticated, service_role;
grant execute on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb)
  to authenticated, service_role;
