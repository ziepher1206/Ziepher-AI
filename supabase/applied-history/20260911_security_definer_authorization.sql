-- HISTORICAL ARCHIVE ONLY.
--
-- These statements were recovered verbatim from the production Supabase
-- migration ledger on 2026-09-14. They were already applied to production as
-- the migrations identified below. This file exists so GitHub retains the
-- authorization changes that production currently depends on.
--
-- DO NOT run this file as a new migration. Future changes must be introduced by
-- a new migration committed to GitHub before it is applied.

-- Applied migration: 20260911104345_harden_production_deployment_authorization
-- Restrict production deployment requests to project owners or workspace
-- owner/admin members. Preview deployments remain available to project members.

create or replace function public.request_project_deployment(
  p_project_id uuid,
  p_version integer,
  p_provider text,
  p_environment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects;
  v_project_version_id uuid;
  v_deployment_id uuid;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  if p_provider not in ('vercel', 'manual') then
    raise exception 'Unsupported deployment provider';
  end if;

  if p_environment not in ('preview', 'production') then
    raise exception 'Unsupported deployment environment';
  end if;

  if p_environment = 'production' and v_project.owner_id <> auth.uid() then
    if v_project.workspace_id is null then
      raise exception 'Production deployment access denied';
    end if;

    select wm.role into v_role
    from public.workspace_members wm
    where wm.workspace_id = v_project.workspace_id
      and wm.user_id = auth.uid();

    if v_role is null or v_role not in ('owner', 'admin') then
      raise exception 'Production deployment access denied';
    end if;
  end if;

  select id into v_project_version_id
  from public.project_versions
  where project_id = p_project_id
    and version = p_version;

  if v_project_version_id is null then
    raise exception 'Project version not found';
  end if;

  if exists (
    select 1
    from public.integration_gates
    where project_id = p_project_id
      and enabled_at is not null
      and (
        test_mode_verified is false
        or auth_verified is false
        or authorization_verified is false
        or rls_verified is false
        or (
          integration_type in ('stripe', 'banking', 'payouts')
          and (
            webhook_verified is false
            or idempotency_verified is false
            or user_live_approval_at is null
          )
        )
      )
  ) then
    raise exception 'A financial or production-secret integration gate is incomplete';
  end if;

  insert into public.deployments (
    project_id,
    project_version_id,
    requested_by,
    provider,
    environment,
    status
  )
  values (
    p_project_id,
    v_project_version_id,
    auth.uid(),
    p_provider,
    p_environment,
    'queued'
  )
  returning id into v_deployment_id;

  return v_deployment_id;
end;
$$;

revoke all on function public.request_project_deployment(uuid, integer, text, text)
from public, anon;
grant execute on function public.request_project_deployment(uuid, integer, text, text)
to authenticated, service_role;

-- Applied migration: 20260911134951_project_repository_binding_authorization
-- Restrict GitHub repository binding to project owners and workspace admins.
-- Generic project members may still update the user-editable name/status fields,
-- but cannot redirect source-control automation by writing repository columns.

revoke update on table public.projects from anon, authenticated;
grant update (name, status) on table public.projects to authenticated;

create or replace function public.set_project_repository_binding(
  p_project_id uuid,
  p_repository_full_name text,
  p_repository_default_branch text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_role text;
  v_repository_full_name text;
  v_repository_default_branch text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if v_project.owner_id <> auth.uid() then
    if v_project.workspace_id is null then
      raise exception 'Repository binding access denied';
    end if;

    select wm.role
    into v_role
    from public.workspace_members wm
    where wm.workspace_id = v_project.workspace_id
      and wm.user_id = auth.uid();

    if v_role is null or v_role not in ('owner', 'admin') then
      raise exception 'Repository binding access denied';
    end if;
  end if;

  if p_repository_full_name is null and p_repository_default_branch is null then
    update public.projects
    set repository_full_name = null,
        repository_default_branch = null,
        repository_url = null,
        updated_at = now()
    where id = p_project_id;
    return;
  end if;

  if p_repository_full_name is null or p_repository_default_branch is null then
    raise exception 'Repository and default branch must be set together';
  end if;

  v_repository_full_name := trim(p_repository_full_name);
  v_repository_default_branch := trim(p_repository_default_branch);

  if v_repository_full_name !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' then
    raise exception 'Invalid GitHub repository name';
  end if;

  if char_length(v_repository_default_branch) < 1
     or char_length(v_repository_default_branch) > 255
     or v_repository_default_branch ~ '[[:cntrl:]]' then
    raise exception 'Invalid GitHub default branch';
  end if;

  update public.projects
  set repository_full_name = v_repository_full_name,
      repository_default_branch = v_repository_default_branch,
      repository_url = 'https://github.com/' || v_repository_full_name,
      updated_at = now()
  where id = p_project_id;
end;
$$;

revoke all on function public.set_project_repository_binding(uuid, text, text)
  from public, anon;
grant execute on function public.set_project_repository_binding(uuid, text, text)
  to authenticated;
