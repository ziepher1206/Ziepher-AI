-- Safe deployment queue. Generated applications are deployed only after a
-- successful version exists. Live financial connections remain governed by
-- integration_gates and are never activated by this worker.

alter table public.deployments
  add column if not exists worker_id text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz;

create index if not exists deployments_claim_idx
  on public.deployments(status, created_at)
  where status = 'queued';

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
  v_project_version_id uuid;
  v_deployment_id uuid;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  if p_provider not in ('vercel', 'manual') then
    raise exception 'Unsupported deployment provider';
  end if;

  if p_environment not in ('preview', 'production') then
    raise exception 'Unsupported deployment environment';
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

create or replace function public.claim_next_deployment(
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns setof public.deployments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.deployments
  where status = 'queued'
     or (
       status in ('building', 'deploying')
       and lease_expires_at < now()
     )
  order by created_at
  for update skip locked
  limit 1;

  if v_id is null then
    return;
  end if;

  return query
  update public.deployments
  set status = 'building',
      worker_id = p_worker_id,
      started_at = coalesce(started_at, now()),
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60))
  where id = v_id
  returning *;
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
begin
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

  if p_success and v_environment = 'production' then
    update public.projects
    set status = 'deployed',
        preview_url = coalesce(p_url, preview_url)
    where id = v_project_id;
  end if;
end;
$$;

revoke all on function public.claim_next_deployment(text, integer)
from public, anon, authenticated;
revoke all on function public.complete_deployment_worker(
  uuid, text, boolean, text, text, text
) from public, anon, authenticated;

grant execute on function public.claim_next_deployment(text, integer)
to service_role;
grant execute on function public.complete_deployment_worker(
  uuid, text, boolean, text, text, text
) to service_role;

grant execute on function public.request_project_deployment(uuid, integer, text, text)
to authenticated;
