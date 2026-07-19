-- Version recovery, deployment records, and the final billing layer.
-- Billing remains inert until STRIPE_ENABLED=true in the application.

create type public.subscription_plan as enum ('explore', 'builder', 'pro', 'studio');
create type public.deployment_status as enum (
  'queued',
  'building',
  'deploying',
  'ready',
  'failed',
  'cancelled'
);

create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan public.subscription_plan not null default 'explore',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.billing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  failure_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_version_id uuid not null references public.project_versions(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  provider text not null check (provider in ('cloudflare', 'vercel', 'manual')),
  environment text not null check (environment in ('preview', 'production')),
  status public.deployment_status not null default 'queued',
  provider_deployment_id text,
  url text,
  failure_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index deployments_project_created_idx
  on public.deployments(project_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.deployments enable row level security;

create policy "subscriptions_select_member"
on public.subscriptions for select
using (public.is_workspace_member(workspace_id));

create policy "deployments_select_project_member"
on public.deployments for select
using (public.is_project_member(project_id));

-- No client policies are created for webhook events or subscription writes.

create or replace function public.grant_workspace_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'Credit grant must be positive';
  end if;

  if exists (
    select 1 from public.credit_ledger
    where idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  update public.credit_accounts
  set balance = balance + p_amount
  where workspace_id = p_workspace_id
  returning balance - reserved into v_balance;

  if not found then
    raise exception 'Credit account not found';
  end if;

  insert into public.credit_ledger (
    workspace_id,
    kind,
    amount,
    balance_after,
    reason,
    idempotency_key
  )
  values (
    p_workspace_id,
    'grant',
    p_amount,
    v_balance,
    p_reason,
    p_idempotency_key
  );
end;
$$;

create or replace function public.restore_project_version(
  p_project_id uuid,
  p_target_version integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_path text;
  v_preview_path text;
  v_summary text;
  v_new_version integer;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  select source_snapshot_path, summary
    into v_source_path, v_summary
  from public.project_versions
  where project_id = p_project_id
    and version = p_target_version;

  if v_source_path is null then
    raise exception 'Project version not found';
  end if;

  select storage_path into v_preview_path
  from public.artifacts
  where project_id = p_project_id
    and artifact_type = 'preview'
    and (metadata ->> 'version')::integer = p_target_version
  order by created_at desc
  limit 1;

  select coalesce(max(version), 0) + 1 into v_new_version
  from public.project_versions
  where project_id = p_project_id;

  insert into public.project_versions (
    project_id,
    version,
    source_snapshot_path,
    summary,
    created_by
  )
  values (
    p_project_id,
    v_new_version,
    v_source_path,
    'Restored version ' || p_target_version::text || ': ' || v_summary,
    auth.uid()
  );

  update public.projects
  set current_version = v_new_version,
      preview_artifact_path = coalesce(v_preview_path, preview_artifact_path),
      status = 'ready_to_deploy'
  where id = p_project_id;

  return v_new_version;
end;
$$;

revoke all on function public.grant_workspace_credits(uuid, integer, text, text)
from public, anon, authenticated;
grant execute on function public.grant_workspace_credits(uuid, integer, text, text)
to service_role;
