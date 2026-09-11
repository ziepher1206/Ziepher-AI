-- Restrict privileged RPC execution to the roles that actually use each function.
-- Client-facing functions remain authenticated-only. Worker and trigger helpers
-- are not directly callable by browser roles.

alter function public.set_updated_at() set search_path = public, pg_temp;

-- Membership helpers are required by authenticated RLS policies, but anonymous
-- callers do not need direct RPC access.
revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_member(uuid) from anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

revoke execute on function public.is_project_member(uuid) from public;
revoke execute on function public.is_project_member(uuid) from anon;
grant execute on function public.is_project_member(uuid) to authenticated;

-- Authenticated application RPCs.
revoke execute on function public.ensure_personal_workspace() from public;
revoke execute on function public.ensure_personal_workspace() from anon;
grant execute on function public.ensure_personal_workspace() to authenticated;

revoke execute on function public.create_project_with_workspace(text, text) from public;
revoke execute on function public.create_project_with_workspace(text, text) from anon;
grant execute on function public.create_project_with_workspace(text, text) to authenticated;

revoke execute on function public.save_project_plan(uuid, text, jsonb, text, text) from public;
revoke execute on function public.save_project_plan(uuid, text, jsonb, text, text) from anon;
grant execute on function public.save_project_plan(uuid, text, jsonb, text, text) to authenticated;

revoke execute on function public.select_visual_concept(uuid, uuid) from public;
revoke execute on function public.select_visual_concept(uuid, uuid) from anon;
grant execute on function public.select_visual_concept(uuid, uuid) to authenticated;

revoke execute on function public.approve_project_spec(uuid, uuid) from public;
revoke execute on function public.approve_project_spec(uuid, uuid) from anon;
grant execute on function public.approve_project_spec(uuid, uuid) to authenticated;

revoke execute on function public.queue_build_job(uuid, uuid, public.quality_mode) from public;
revoke execute on function public.queue_build_job(uuid, uuid, public.quality_mode) from anon;
grant execute on function public.queue_build_job(uuid, uuid, public.quality_mode) to authenticated;

revoke execute on function public.restore_project_version(uuid, integer) from public;
revoke execute on function public.restore_project_version(uuid, integer) from anon;
grant execute on function public.restore_project_version(uuid, integer) to authenticated;

revoke execute on function public.request_project_deployment(uuid, integer, text, text) from public;
revoke execute on function public.request_project_deployment(uuid, integer, text, text) from anon;
grant execute on function public.request_project_deployment(uuid, integer, text, text) to authenticated;

-- Sync/bridge RPCs already had explicit authenticated grants. Remove PUBLIC too
-- so their ACLs remain fail-closed if default privileges change later.
revoke execute on function public.get_project_sync_state(uuid) from public;
revoke execute on function public.get_project_sync_state(uuid) from anon;
grant execute on function public.get_project_sync_state(uuid) to authenticated;

revoke execute on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb) from public;
revoke execute on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb) from anon;
grant execute on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb) to authenticated;

revoke execute on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb) from public;
revoke execute on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb) from anon;
grant execute on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb) to authenticated;

-- Internal helpers must not be directly callable by browser roles.
revoke execute on function public.finalize_build_job(uuid, boolean, integer, text) from public;
revoke execute on function public.finalize_build_job(uuid, boolean, integer, text) from anon;
revoke execute on function public.finalize_build_job(uuid, boolean, integer, text) from authenticated;
grant execute on function public.finalize_build_job(uuid, boolean, integer, text) to service_role;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.initialize_project_sync_state() from public;
revoke execute on function public.initialize_project_sync_state() from anon;
revoke execute on function public.initialize_project_sync_state() from authenticated;
