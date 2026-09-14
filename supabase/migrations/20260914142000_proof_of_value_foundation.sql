-- ZLife Proof of Value foundation.
-- Attribution, lineage, measurements, and hypothetical simulation only.
-- This migration does NOT create compensation, equity, token, payout,
-- profit-sharing, or transferable economic rights.

create table if not exists public.value_assets (
  id uuid primary key default gen_random_uuid(),
  module_id text null references public.community_modules(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text null,
  asset_type text not null check (asset_type in (
    'component',
    'workflow',
    'module_feature',
    'ai_capability',
    'design_system',
    'dataset',
    'evaluation',
    'translation',
    'security_control',
    'documentation',
    'other'
  )),
  status text not null default 'active'
    check (status in ('proposed', 'active', 'maintenance', 'deprecated', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists value_assets_module_idx
  on public.value_assets (module_id, status);

create table if not exists public.value_asset_contribution_events (
  id uuid primary key default gen_random_uuid(),
  value_asset_id uuid not null references public.value_assets(id) on delete restrict,
  contributor_id uuid not null references public.community_contributors(id) on delete restrict,
  contribution_event_id uuid null references public.contribution_events(id) on delete restrict,
  share_class text not null check (share_class in (
    'creation',
    'improvement',
    'maintenance',
    'quality',
    'security',
    'adoption'
  )),
  share_delta numeric(20, 6) not null check (share_delta <> 0),
  effective_at timestamptz not null default now(),
  decay_policy jsonb not null default '{}'::jsonb,
  reason text not null,
  recorded_by uuid null references public.community_contributors(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists value_asset_contribution_asset_idx
  on public.value_asset_contribution_events (value_asset_id, share_class, effective_at desc);

create index if not exists value_asset_contribution_contributor_idx
  on public.value_asset_contribution_events (contributor_id, effective_at desc);

create unique index if not exists value_asset_contribution_source_unique
  on public.value_asset_contribution_events (value_asset_id, contribution_event_id, share_class)
  where contribution_event_id is not null;

create table if not exists public.value_lineage_edges (
  id uuid primary key default gen_random_uuid(),
  upstream_asset_id uuid not null references public.value_assets(id) on delete restrict,
  downstream_asset_id uuid not null references public.value_assets(id) on delete restrict,
  relationship_type text not null default 'depends_on'
    check (relationship_type in ('depends_on', 'derives_from', 'extends', 'embeds', 'enables')),
  weight numeric(9, 6) not null default 1.0 check (weight > 0 and weight <= 1),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'superseded')),
  evidence jsonb not null default '{}'::jsonb,
  verified_by uuid null references public.community_contributors(id) on delete set null,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_lineage_no_self_edge check (upstream_asset_id <> downstream_asset_id)
);

create unique index if not exists value_lineage_active_unique
  on public.value_lineage_edges (upstream_asset_id, downstream_asset_id, relationship_type)
  where status in ('pending', 'verified');

create index if not exists value_lineage_downstream_idx
  on public.value_lineage_edges (downstream_asset_id, status);

create table if not exists public.value_measurements (
  id uuid primary key default gen_random_uuid(),
  value_asset_id uuid not null references public.value_assets(id) on delete cascade,
  metric_key text not null,
  metric_value numeric(24, 8) not null,
  unit text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  source text not null,
  confidence numeric(5, 4) not null default 1.0 check (confidence >= 0 and confidence <= 1),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint value_measurements_window_check check (window_end > window_start)
);

create index if not exists value_measurements_asset_window_idx
  on public.value_measurements (value_asset_id, metric_key, window_end desc);

create table if not exists public.value_policy_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'simulation', 'retired')),
  policy jsonb not null,
  notes text null,
  created_by uuid null references public.community_contributors(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.value_reward_simulations (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.value_policy_versions(id) on delete restrict,
  module_id text null references public.community_modules(id) on delete set null,
  hypothetical_pool_amount numeric(24, 8) not null check (hypothetical_pool_amount >= 0),
  hypothetical_currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  created_by uuid null references public.community_contributors(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create table if not exists public.value_reward_simulation_allocations (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.value_reward_simulations(id) on delete cascade,
  contributor_id uuid not null references public.community_contributors(id) on delete restrict,
  value_asset_id uuid null references public.value_assets(id) on delete set null,
  direct_amount numeric(24, 8) not null default 0,
  lineage_amount numeric(24, 8) not null default 0,
  total_amount numeric(24, 8) generated always as (direct_amount + lineage_amount) stored,
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists value_reward_allocations_simulation_idx
  on public.value_reward_simulation_allocations (simulation_id, total_amount desc);

create index if not exists value_reward_allocations_contributor_idx
  on public.value_reward_simulation_allocations (contributor_id, simulation_id);

-- Keep the economic-model foundation server-only. Public transparency should be
-- exposed through reviewed read models/API routes containing verified data only.
alter table public.value_assets enable row level security;
alter table public.value_asset_contribution_events enable row level security;
alter table public.value_lineage_edges enable row level security;
alter table public.value_measurements enable row level security;
alter table public.value_policy_versions enable row level security;
alter table public.value_reward_simulations enable row level security;
alter table public.value_reward_simulation_allocations enable row level security;

revoke all on table public.value_assets from anon, authenticated;
revoke all on table public.value_asset_contribution_events from anon, authenticated;
revoke all on table public.value_lineage_edges from anon, authenticated;
revoke all on table public.value_measurements from anon, authenticated;
revoke all on table public.value_policy_versions from anon, authenticated;
revoke all on table public.value_reward_simulations from anon, authenticated;
revoke all on table public.value_reward_simulation_allocations from anon, authenticated;

comment on table public.value_assets is
  'Durable ZLife units of functionality or intellectual work used for value attribution.';
comment on table public.value_asset_contribution_events is
  'Append-only internal Contribution Share ledger; not legal equity or a transferable asset.';
comment on table public.value_lineage_edges is
  'Verified dependency/derivation graph for tracing downstream value lineage.';
comment on table public.value_measurements is
  'Time-windowed value evidence with source, confidence, and provenance.';
comment on table public.value_reward_simulations is
  'Hypothetical reward allocation simulations only; never represents a payout obligation.';
