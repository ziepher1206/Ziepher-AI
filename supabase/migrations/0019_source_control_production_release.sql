-- Link production deployments to the exact merged source-control run.
-- Production remains opt-in at the application layer and is never queued by merge.

alter table public.source_control_runs
  add column if not exists production_deployment_id uuid references public.deployments(id) on delete set null,
  add column if not exists production_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists production_requested_at timestamptz,
  add column if not exists production_url text;

create unique index if not exists source_control_runs_production_deployment_uidx
  on public.source_control_runs(production_deployment_id)
  where production_deployment_id is not null;

create index if not exists source_control_runs_production_requested_by_idx
  on public.source_control_runs(production_requested_by)
  where production_requested_by is not null;

alter table public.source_control_runs
  drop constraint if exists source_control_runs_production_url_check;
alter table public.source_control_runs
  add constraint source_control_runs_production_url_check
  check (production_url is null or production_url ~ '^https://[^[:space:]]+$');

create or replace function public.request_source_control_production_release(
  p_run_id uuid,
  p_expected_revision bigint,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.source_control_runs;
  v_project public.projects;
  v_role text;
  v_version_text text;
  v_version integer;
  v_project_version_id uuid;
  v_existing public.deployments;
  v_deployment_id uuid;
begin
  select * into v_run
  from public.source_control_runs
  where id = p_run_id
    and stage = 'merged'
    and revision = p_expected_revision
  for update;

  if v_run.id is null then
    raise exception 'Source-control run changed concurrently or is not merged';
  end if;
  if v_run.merged_sha is null or v_run.merged_sha !~ '^[A-Fa-f0-9]{40}$' then
    raise exception 'Merged run is missing a valid merge SHA';
  end if;
  if v_run.merged_at is null or v_run.build_job_id is null then
    raise exception 'Merged run is missing durable build or merge identity';
  end if;

  select * into v_project
  from public.projects
  where id = v_run.project_id;
  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  if v_project.owner_id <> p_user_id then
    if v_project.workspace_id is null then
      raise exception 'Production release access denied';
    end if;

    select wm.role into v_role
    from public.workspace_members wm
    where wm.workspace_id = v_project.workspace_id
      and wm.user_id = p_user_id;

    if v_role is null or v_role not in ('owner', 'admin') then
      raise exception 'Production release access denied';
    end if;
  end if;

  -- Normal production releases are forward-only. A deliberate rollback should
  -- use a separate recovery flow rather than silently releasing a stale merge.
  if exists (
    select 1
    from public.source_control_runs newer
    where newer.project_id = v_run.project_id
      and newer.id <> v_run.id
      and newer.merged_at is not null
      and newer.merged_at > v_run.merged_at
      and newer.stage in ('merged', 'production_verified')
  ) then
    raise exception 'A newer merged build exists; refusing to release a stale source-control run';
  end if;

  if v_run.production_deployment_id is not null then
    select * into v_existing
    from public.deployments
    where id = v_run.production_deployment_id
      and project_id = v_run.project_id;

    if v_existing.id is not null
       and v_existing.provider = 'vercel'
       and v_existing.environment = 'production'
       and v_existing.status in (
         'queued'::public.deployment_status,
         'building'::public.deployment_status,
         'deploying'::public.deployment_status,
         'ready'::public.deployment_status
       ) then
      return v_existing.id;
    end if;
  end if;

  if exists (
    select 1
    from public.integration_gates
    where project_id = v_run.project_id
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

  select a.metadata ->> 'version'
  into v_version_text
  from public.artifacts a
  where a.project_id = v_run.project_id
    and a.build_job_id = v_run.build_job_id
    and a.artifact_type = 'source_archive'
  limit 1;

  if v_version_text is null or v_version_text !~ '^[1-9][0-9]*$' then
    raise exception 'Merged build has no valid published project version';
  end if;
  v_version := v_version_text::integer;

  select pv.id into v_project_version_id
  from public.project_versions pv
  where pv.project_id = v_run.project_id
    and pv.version = v_version;

  if v_project_version_id is null then
    raise exception 'Merged build project version not found';
  end if;

  insert into public.deployments (
    project_id,
    project_version_id,
    requested_by,
    provider,
    environment,
    status
  ) values (
    v_run.project_id,
    v_project_version_id,
    p_user_id,
    'vercel',
    'production',
    'queued'
  )
  returning id into v_deployment_id;

  update public.source_control_runs
  set revision = revision + 1,
      production_deployment_id = v_deployment_id,
      production_requested_by = p_user_id,
      production_requested_at = now(),
      production_url = null,
      last_error = null,
      updated_at = now()
  where id = v_run.id;

  return v_deployment_id;
end;
$$;

create or replace function public.complete_deployment_worker(
  p_deployment_id uuid,
  p_worker_id text,
  p_success boolean,
  p_provider_deployment_id text default null,
  p_url text default null,
  p_failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_environment text;
  v_source_control_run_id uuid;
begin
  if p_success and p_url is not null and p_url !~ '^https://[^[:space:]]+$' then
    raise exception 'Successful deployment returned an invalid HTTPS URL';
  end if;

  update public.deployments
  set status = case when p_success then 'ready'::public.deployment_status
                    else 'failed'::public.deployment_status end,
      provider_deployment_id = p_provider_deployment_id,
      url = p_url,
      failure_message = p_failure_message,
      completed_at = now(),
      heartbeat_at = now(),
      lease_expires_at = null
  where id = p_deployment_id
    and worker_id = p_worker_id
    and status in ('building', 'deploying')
  returning project_id, environment into v_project_id, v_environment;

  if v_project_id is null then
    raise exception 'Deployment lease not owned by worker';
  end if;

  if v_environment = 'production' then
    select scr.id into v_source_control_run_id
    from public.source_control_runs scr
    where scr.production_deployment_id = p_deployment_id
      and scr.project_id = v_project_id
    for update;

    if p_success then
      if p_url is null or p_url !~ '^https://[^[:space:]]+$' then
        raise exception 'Successful production deployment must return an HTTPS URL';
      end if;

      update public.projects
      set status = 'deployed',
          preview_url = coalesce(p_url, preview_url),
          updated_at = now()
      where id = v_project_id;

      if v_source_control_run_id is not null then
        update public.source_control_runs
        set stage = 'production_verified',
            revision = revision + 1,
            production_url = p_url,
            production_verified_at = now(),
            last_error = null,
            updated_at = now()
        where id = v_source_control_run_id
          and stage = 'merged'
          and merged_sha is not null
          and merged_at is not null;

        if not found then
          raise exception 'Linked source-control run is not eligible for production verification';
        end if;
      end if;
    elsif v_source_control_run_id is not null then
      update public.source_control_runs
      set last_error = left(
            coalesce(nullif(trim(p_failure_message), ''), 'Production deployment failed.'),
            2000
          ),
          updated_at = now()
      where id = v_source_control_run_id
        and stage = 'merged';
    end if;
  end if;
end;
$$;

revoke all on function public.request_source_control_production_release(uuid, bigint, uuid)
from public, anon, authenticated;
revoke all on function public.complete_deployment_worker(uuid, text, boolean, text, text, text)
from public, anon, authenticated;

grant execute on function public.request_source_control_production_release(uuid, bigint, uuid)
to service_role;
grant execute on function public.complete_deployment_worker(uuid, text, boolean, text, text, text)
to service_role;
