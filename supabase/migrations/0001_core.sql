-- Ziepher AI production foundation
-- Run with the Supabase CLI against development first.
-- Financial activation is intentionally not included in this migration.

create extension if not exists pgcrypto;

create type public.project_status as enum (
  'planning',
  'ready_to_build',
  'building',
  'testing',
  'ready_to_deploy',
  'deployed',
  'archived'
);

create type public.build_status as enum (
  'queued',
  'planning',
  'generating',
  'installing',
  'building',
  'testing',
  'repairing',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled'
);

create type public.quality_mode as enum ('economy', 'balanced', 'best');
create type public.credit_entry_kind as enum (
  'grant',
  'reservation',
  'release',
  'charge',
  'refund',
  'adjustment'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  default_quality_mode public.quality_mode not null default 'balanced',
  platform_learning_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'builder', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 100),
  original_idea text not null,
  status public.project_status not null default 'planning',
  selected_visual_concept_id uuid,
  preview_url text,
  repository_url text,
  current_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects(owner_id);
create index projects_workspace_id_idx on public.projects(workspace_id);
create index projects_status_idx on public.projects(status);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null default 'Project conversation',
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  input_mode text not null default 'text' check (input_mode in ('text', 'voice', 'system')),
  model_provider text,
  model_name text,
  charged_build_credits integer not null default 0 check (charged_build_credits >= 0),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages(conversation_id, created_at);

create table public.app_spec_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null,
  spec jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table public.visual_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  spec_version_id uuid not null references public.app_spec_versions(id) on delete cascade,
  name text not null,
  description text not null,
  tokens jsonb not null default '{}'::jsonb,
  preview_artifact_path text,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.projects
  add constraint projects_selected_visual_concept_fk
  foreign key (selected_visual_concept_id)
  references public.visual_concepts(id)
  on delete set null;

create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null,
  source_snapshot_path text not null,
  commit_sha text,
  summary text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table public.build_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  spec_version_id uuid not null references public.app_spec_versions(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  quality_mode public.quality_mode not null default 'balanced',
  status public.build_status not null default 'queued',
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  finalized_credits integer check (finalized_credits >= 0),
  runner_provider text,
  runner_id text,
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now()
);

create index build_jobs_project_created_idx
  on public.build_jobs(project_id, created_at desc);
create index build_jobs_status_idx on public.build_jobs(status);

create table public.build_steps (
  id uuid primary key default gen_random_uuid(),
  build_job_id uuid not null references public.build_jobs(id) on delete cascade,
  sequence integer not null,
  step_type text not null check (
    step_type in (
      'retrieve_context',
      'generate',
      'patch',
      'install',
      'typecheck',
      'lint',
      'test',
      'security_scan',
      'visual_check',
      'repair',
      'checkpoint',
      'deploy'
    )
  ),
  status public.build_status not null default 'queued',
  model_provider text,
  model_name text,
  estimated_cost_usd numeric(12, 6) not null default 0,
  actual_cost_usd numeric(12, 6) not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  unique (build_job_id, sequence)
);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  artifact_type text not null check (
    artifact_type in (
      'source_archive',
      'preview',
      'test_report',
      'security_report',
      'visual_diff',
      'deployment_manifest',
      'documentation'
    )
  ),
  storage_path text not null,
  sha256 text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.credit_accounts (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  kind public.credit_entry_kind not null,
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.model_usage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  operation text not null,
  billable_to_user boolean not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  provider_cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index model_usage_operation_idx on public.model_usage(operation, created_at desc);

create table public.build_experiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  task_type text not null,
  request_fingerprint text not null,
  strategy_version text not null,
  framework text,
  build_passed boolean not null,
  tests_passed boolean not null,
  security_passed boolean not null,
  visual_score numeric(5, 2),
  user_outcome text check (user_outcome in ('accepted', 'edited', 'rejected', 'reverted')),
  failure_category text,
  repair_count integer not null default 0,
  provider_cost_usd numeric(12, 6) not null default 0,
  anonymized_for_learning boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.learned_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern_type text not null,
  problem_signature text not null,
  recommended_strategy jsonb not null,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  average_quality_score numeric(5, 2),
  average_cost_usd numeric(12, 6),
  status text not null default 'candidate'
    check (status in ('candidate', 'evaluating', 'approved', 'retired')),
  created_at timestamptz not null default now(),
  promoted_at timestamptz
);

create table public.integration_gates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  integration_type text not null check (
    integration_type in ('stripe', 'banking', 'payouts', 'production_secrets')
  ),
  requested_early boolean not null default false,
  test_mode_verified boolean not null default false,
  auth_verified boolean not null default false,
  authorization_verified boolean not null default false,
  rls_verified boolean not null default false,
  webhook_verified boolean not null default false,
  idempotency_verified boolean not null default false,
  user_live_approval_at timestamptz,
  enabled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, integration_type)
);

-- Helper functions

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
      and wm.user_id = auth.uid()
    where w.id = p_workspace_id
      and (w.owner_id = auth.uid() or wm.user_id is not null)
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    left join public.workspace_members wm
      on wm.workspace_id = p.workspace_id
      and wm.user_id = auth.uid()
    where p.id = p_project_id
      and (p.owner_id = auth.uid() or wm.user_id is not null)
  );
$$;

create or replace function public.queue_build_job(
  p_project_id uuid,
  p_spec_version_id uuid,
  p_quality_mode public.quality_mode
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid := gen_random_uuid();
  v_workspace_id uuid;
  v_reservation integer;
  v_available_after integer;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  if not exists (
    select 1 from public.app_spec_versions
    where id = p_spec_version_id
      and project_id = p_project_id
      and approved_at is not null
  ) then
    raise exception 'An approved specification is required before building';
  end if;

  select workspace_id into v_workspace_id
  from public.projects where id = p_project_id;

  v_reservation := case p_quality_mode
    when 'economy' then 20
    when 'balanced' then 40
    when 'best' then 80
  end;

  if v_workspace_id is not null then
    update public.credit_accounts
    set reserved = reserved + v_reservation,
        updated_at = now()
    where workspace_id = v_workspace_id
      and balance - reserved >= v_reservation
    returning balance - reserved into v_available_after;

    if not found then
      raise exception 'Insufficient available build credits';
    end if;
  else
    -- Personal credit accounts are added in a later migration.
    v_reservation := 0;
  end if;

  insert into public.build_jobs (
    id,
    project_id,
    spec_version_id,
    requested_by,
    quality_mode,
    reserved_credits,
    status
  )
  values (
    v_job_id,
    p_project_id,
    p_spec_version_id,
    auth.uid(),
    p_quality_mode,
    v_reservation,
    'queued'
  );

  if v_workspace_id is not null and v_reservation > 0 then
    insert into public.credit_ledger (
      workspace_id,
      build_job_id,
      kind,
      amount,
      balance_after,
      reason,
      idempotency_key
    )
    values (
      v_workspace_id,
      v_job_id,
      'reservation',
      -v_reservation,
      v_available_after,
      'Reserved maximum credits for build job',
      'reserve:' || v_job_id::text
    );
  end if;

  return v_job_id;
end;
$$;

create or replace function public.finalize_build_job(
  p_build_job_id uuid,
  p_success boolean,
  p_final_credits integer,
  p_failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.build_jobs%rowtype;
  v_workspace_id uuid;
  v_charge integer;
  v_available_after integer;
begin
  select * into v_job
  from public.build_jobs
  where id = p_build_job_id
  for update;

  if not found then
    raise exception 'Build job not found';
  end if;

  if v_job.status in ('completed', 'failed', 'cancelled') then
    return;
  end if;

  select workspace_id into v_workspace_id
  from public.projects
  where id = v_job.project_id;

  v_charge := case
    when p_success then least(greatest(p_final_credits, 0), v_job.reserved_credits)
    else 0
  end;

  if v_workspace_id is not null and v_job.reserved_credits > 0 then
    update public.credit_accounts
    set balance = balance - v_charge,
        reserved = reserved - v_job.reserved_credits,
        updated_at = now()
    where workspace_id = v_workspace_id
    returning balance - reserved into v_available_after;

    insert into public.credit_ledger (
      workspace_id,
      build_job_id,
      kind,
      amount,
      balance_after,
      reason,
      idempotency_key
    )
    values (
      v_workspace_id,
      p_build_job_id,
      case when v_charge > 0 then 'charge' else 'release' end,
      -v_charge,
      v_available_after,
      case
        when p_success then 'Finalized successful build checkpoint'
        else 'Released reservation after failed system build'
      end,
      'finalize:' || p_build_job_id::text
    );
  end if;

  update public.build_jobs
  set status = case when p_success then 'completed' else 'failed' end,
      finalized_credits = v_charge,
      failure_message = case when p_success then null else p_failure_message end,
      completed_at = now()
  where id = p_build_job_id;
end;
$$;

-- Profile bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.app_spec_versions enable row level security;
alter table public.visual_concepts enable row level security;
alter table public.project_versions enable row level security;
alter table public.build_jobs enable row level security;
alter table public.build_steps enable row level security;
alter table public.artifacts enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.model_usage enable row level security;
alter table public.build_experiences enable row level security;
alter table public.learned_patterns enable row level security;
alter table public.integration_gates enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "workspaces_select_member"
on public.workspaces for select
using (public.is_workspace_member(id));

create policy "workspaces_insert_owner"
on public.workspaces for insert
with check (owner_id = auth.uid());

create policy "workspaces_update_owner"
on public.workspaces for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "workspace_members_select_member"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_manage_owner"
on public.workspace_members for all
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
);

create policy "projects_select_member"
on public.projects for select
using (public.is_project_member(id));

create policy "projects_insert_owner"
on public.projects for insert
with check (owner_id = auth.uid());

create policy "projects_update_member"
on public.projects for update
using (public.is_project_member(id))
with check (public.is_project_member(id));

create policy "conversations_project_member"
on public.conversations for all
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "messages_project_member"
on public.messages for all
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and public.is_project_member(c.project_id)
  )
)
with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and public.is_project_member(c.project_id)
  )
);

create policy "specs_project_member"
on public.app_spec_versions for all
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "visual_concepts_project_member"
on public.visual_concepts for all
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "project_versions_project_member"
on public.project_versions for select
using (public.is_project_member(project_id));

create policy "build_jobs_project_member"
on public.build_jobs for select
using (public.is_project_member(project_id));

create policy "build_steps_project_member"
on public.build_steps for select
using (
  exists (
    select 1 from public.build_jobs b
    where b.id = build_job_id and public.is_project_member(b.project_id)
  )
);

create policy "artifacts_project_member"
on public.artifacts for select
using (public.is_project_member(project_id));

create policy "integration_gates_project_member"
on public.integration_gates for select
using (public.is_project_member(project_id));

-- Internal-only learning, usage, and billing tables have RLS enabled but no
-- direct client policies. Access them through audited server functions.
