-- ZLife community contribution ledger foundation.
-- This migration creates attribution and audit structures only. It does not
-- create compensation, equity, profit-sharing, payout, or charitable-payment behavior.

create table if not exists public.community_contributors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  github_login text null,
  display_name text null,
  status text not null default 'community_member'
    check (status in (
      'community_member',
      'contributor',
      'verified_contributor',
      'zlife_developer',
      'module_maintainer',
      'core_contributor',
      'core_team'
    )),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_contributors_identity_check
    check (user_id is not null or github_login is not null)
);

create unique index if not exists community_contributors_user_unique
  on public.community_contributors (user_id)
  where user_id is not null;

create unique index if not exists community_contributors_github_unique
  on public.community_contributors (lower(github_login))
  where github_login is not null;

create table if not exists public.community_modules (
  id text primary key,
  name text not null,
  description text null,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'maintenance', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contribution_events (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.community_contributors(id) on delete restrict,
  source text not null,
  repository text not null,
  module_id text null references public.community_modules(id) on delete set null,
  contribution_type text not null,
  github_pr_id bigint null,
  github_issue_id bigint null,
  description text not null,
  impact_score integer not null default 0 check (impact_score between 0 and 100),
  difficulty_score integer not null default 0 check (difficulty_score between 0 and 100),
  scope_score integer not null default 0 check (scope_score between 0 and 100),
  maintenance_score integer not null default 0 check (maintenance_score between 0 and 100),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  verified_score integer null check (verified_score is null or verified_score >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'superseded')),
  verified_by uuid null references public.community_contributors(id) on delete set null,
  verified_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contribution_verification_consistency check (
    (status = 'verified' and verified_score is not null and verified_by is not null and verified_at is not null)
    or status <> 'verified'
  )
);

create unique index if not exists contribution_events_pr_unique
  on public.contribution_events (repository, github_pr_id, contributor_id)
  where github_pr_id is not null and status <> 'superseded';

create index if not exists contribution_events_contributor_created_idx
  on public.contribution_events (contributor_id, created_at desc);

create index if not exists contribution_events_module_created_idx
  on public.contribution_events (module_id, created_at desc)
  where module_id is not null;

create index if not exists contribution_events_verified_idx
  on public.contribution_events (status, verified_at desc)
  where status = 'verified';

create table if not exists public.contribution_score_adjustments (
  id uuid primary key default gen_random_uuid(),
  contribution_event_id uuid not null references public.contribution_events(id) on delete restrict,
  previous_verified_score integer null,
  new_verified_score integer not null check (new_verified_score >= 0),
  reason text not null,
  adjusted_by uuid not null references public.community_contributors(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists contribution_score_adjustments_event_idx
  on public.contribution_score_adjustments (contribution_event_id, created_at desc);

create table if not exists public.contributor_status_events (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.community_contributors(id) on delete restrict,
  previous_status text null,
  new_status text not null,
  reason text not null,
  changed_by uuid not null references public.community_contributors(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists contributor_status_events_contributor_idx
  on public.contributor_status_events (contributor_id, created_at desc);

create table if not exists public.module_maintainers (
  module_id text not null references public.community_modules(id) on delete cascade,
  contributor_id uuid not null references public.community_contributors(id) on delete restrict,
  responsibility text not null default 'maintainer',
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  assigned_by uuid null references public.community_contributors(id) on delete set null,
  primary key (module_id, contributor_id, started_at)
);

create index if not exists module_maintainers_active_idx
  on public.module_maintainers (module_id, contributor_id)
  where ended_at is null;

-- Defense-in-depth: no community ledger table is directly exposed to browser roles
-- in this foundation. Future public transparency should go through reviewed,
-- verified-only views/API routes rather than broad table grants.
alter table public.community_contributors enable row level security;
alter table public.community_modules enable row level security;
alter table public.contribution_events enable row level security;
alter table public.contribution_score_adjustments enable row level security;
alter table public.contributor_status_events enable row level security;
alter table public.module_maintainers enable row level security;

revoke all on table public.community_contributors from anon, authenticated;
revoke all on table public.community_modules from anon, authenticated;
revoke all on table public.contribution_events from anon, authenticated;
revoke all on table public.contribution_score_adjustments from anon, authenticated;
revoke all on table public.contributor_status_events from anon, authenticated;
revoke all on table public.module_maintainers from anon, authenticated;

comment on table public.contribution_events is
  'Verified ZLife contribution ledger. Raw activity alone must not determine value.';
comment on table public.contribution_score_adjustments is
  'Append-only audit history for manual verified-score adjustments.';
comment on table public.contributor_status_events is
  'Append-only audit history for community role/status changes.';
