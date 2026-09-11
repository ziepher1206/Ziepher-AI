-- Make provider deployment attempts durable before any Vercel side effect.
-- Once provider_attempted_at is set, workers must reconcile provider metadata
-- instead of blindly issuing another deployment request.

alter table public.deployments
  add column if not exists provider_attempted_at timestamptz,
  add column if not exists provider_reconcile_attempts integer not null default 0,
  add column if not exists provider_last_observed_state text;

alter table public.deployments
  drop constraint if exists deployments_provider_reconcile_attempts_check;
alter table public.deployments
  add constraint deployments_provider_reconcile_attempts_check
  check (provider_reconcile_attempts >= 0);

alter table public.deployments
  drop constraint if exists deployments_provider_last_observed_state_check;
alter table public.deployments
  add constraint deployments_provider_last_observed_state_check
  check (
    provider_last_observed_state is null
    or provider_last_observed_state in (
      'BLOCKED','BUILDING','CANCELED','DELETED',
      'ERROR','INITIALIZING','QUEUED','READY','NOT_FOUND'
    )
  );

drop index if exists public.deployments_claim_idx;
create index deployments_claim_idx
  on public.deployments(status, lease_expires_at, created_at)
  where status in ('queued', 'building', 'deploying');

create or replace function public.mark_deployment_provider_attempt(
  p_deployment_id uuid,
  p_worker_id text
)
returns public.deployments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deployment public.deployments;
begin
  update public.deployments
  set status = 'deploying'::public.deployment_status,
      provider_attempted_at = now(),
      heartbeat_at = now(),
      failure_message = null
  where id = p_deployment_id
    and provider = 'vercel'
    and status = 'building'::public.deployment_status
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and provider_attempted_at is null
    and vercel_project_id is not null
    and vercel_org_id is not null
  returning * into v_deployment;

  if v_deployment.id is null then
    raise exception 'Deployment provider attempt could not be marked for the active lease';
  end if;

  return v_deployment;
end;
$$;

create or replace function public.reschedule_deployment_reconciliation(
  p_deployment_id uuid,
  p_worker_id text,
  p_delay_seconds integer default 30,
  p_observed_state text default null,
  p_failure_message text default null
)
returns public.deployments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deployment public.deployments;
  v_state text;
begin
  v_state := case
    when p_observed_state is null then null
    else upper(trim(p_observed_state))
  end;

  if v_state is not null and v_state not in (
    'BLOCKED','BUILDING','CANCELED','DELETED',
    'ERROR','INITIALIZING','QUEUED','READY','NOT_FOUND'
  ) then
    raise exception 'Unexpected Vercel reconciliation state';
  end if;

  update public.deployments
  set status = 'deploying'::public.deployment_status,
      provider_reconcile_attempts = provider_reconcile_attempts + 1,
      provider_last_observed_state = v_state,
      worker_id = null,
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_delay_seconds, 15)),
      failure_message = case
        when p_failure_message is null then failure_message
        else left(p_failure_message, 30000)
      end
  where id = p_deployment_id
    and provider = 'vercel'
    and status in (
      'building'::public.deployment_status,
      'deploying'::public.deployment_status
    )
    and worker_id = p_worker_id
    and lease_expires_at >= now()
    and provider_attempted_at is not null
  returning * into v_deployment;

  if v_deployment.id is null then
    raise exception 'Deployment reconciliation lease changed or expired';
  end if;

  return v_deployment;
end;
$$;

revoke all on function public.mark_deployment_provider_attempt(uuid, text)
from public, anon, authenticated;
revoke all on function public.reschedule_deployment_reconciliation(
  uuid, text, integer, text, text
) from public, anon, authenticated;

grant execute on function public.mark_deployment_provider_attempt(uuid, text)
to service_role;
grant execute on function public.reschedule_deployment_reconciliation(
  uuid, text, integer, text, text
) to service_role;
