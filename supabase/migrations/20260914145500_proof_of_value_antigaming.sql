-- ZLife Proof of Value anti-gaming and anomaly controls.
-- Detection/review only. No payouts, equity, tokens, or binding compensation rights.

create table if not exists public.value_integrity_flags (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid null references public.community_contributors(id) on delete restrict,
  value_asset_id uuid null references public.value_assets(id) on delete restrict,
  contribution_event_id uuid null references public.contribution_events(id) on delete restrict,
  lineage_edge_id uuid null references public.value_lineage_edges(id) on delete restrict,
  measurement_id uuid null references public.value_measurements(id) on delete restrict,
  flag_type text not null check (flag_type in (
    'self_attribution','duplicate_value','usage_spike','measurement_conflict',
    'circular_lineage','lineage_concentration','share_spike','reviewer_conflict',
    'low_confidence','suspicious_velocity','manual_review','other'
  )),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  risk_score numeric(6,3) not null default 0 check (risk_score >= 0 and risk_score <= 100),
  status text not null default 'open' check (status in ('open','reviewing','cleared','confirmed','suppressed')),
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  detected_by text not null default 'system',
  reviewed_by uuid null references public.community_contributors(id) on delete set null,
  reviewed_at timestamptz null,
  resolution_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists value_integrity_flags_open_idx
  on public.value_integrity_flags (status, severity, created_at desc)
  where status in ('open','reviewing');
create index if not exists value_integrity_flags_contributor_idx
  on public.value_integrity_flags (contributor_id, status, created_at desc)
  where contributor_id is not null;
create index if not exists value_integrity_flags_asset_idx
  on public.value_integrity_flags (value_asset_id, status, created_at desc)
  where value_asset_id is not null;

create table if not exists public.value_integrity_reviews (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.value_integrity_flags(id) on delete cascade,
  reviewer_id uuid not null references public.community_contributors(id) on delete restrict,
  decision text not null check (decision in ('clear','confirm','needs_more_evidence','suppress')),
  note text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists value_integrity_reviews_flag_idx
  on public.value_integrity_reviews (flag_id, created_at desc);

-- Open high/critical integrity flags reduce confidence in simulated value but never mutate
-- the source contribution ledger. Confirmed critical flags quarantine value from simulations.
create or replace function public.value_integrity_multiplier(
  p_contributor_id uuid,
  p_value_asset_id uuid
) returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with f as (
    select severity, status
    from public.value_integrity_flags
    where (contributor_id is null or contributor_id = p_contributor_id)
      and (value_asset_id is null or value_asset_id = p_value_asset_id)
      and status in ('open','reviewing','confirmed')
  )
  select case
    when exists(select 1 from f where status='confirmed' and severity='critical') then 0
    when exists(select 1 from f where severity='critical') then 0.25
    when exists(select 1 from f where severity='high') then 0.60
    when exists(select 1 from f where severity='medium') then 0.85
    when exists(select 1 from f where severity='low') then 0.95
    else 1.0
  end::numeric;
$$;

-- Detect suspicious direct-share concentration and velocity. This is intentionally conservative:
-- it creates review flags instead of automatically accusing or penalizing contributors.
create or replace function public.scan_value_share_anomalies(
  p_window interval default interval '24 hours'
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  insert into public.value_integrity_flags (
    contributor_id, value_asset_id, flag_type, severity, risk_score, reason, evidence
  )
  select
    e.contributor_id,
    e.value_asset_id,
    'share_spike',
    case when sum(abs(e.share_delta)) >= 10000 then 'high' else 'medium' end,
    least(100, sum(abs(e.share_delta)) / 100)::numeric,
    'Unusually large Contribution Share movement inside the review window.',
    jsonb_build_object('window', p_window::text, 'absolute_share_delta', sum(abs(e.share_delta)), 'event_count', count(*))
  from public.value_asset_contribution_events e
  where e.created_at >= now() - p_window
  group by e.contributor_id, e.value_asset_id
  having sum(abs(e.share_delta)) >= 2500
     or count(*) >= 25
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Usage/revenue measurements can be gamed. Flag abrupt jumps relative to prior observations
-- while preserving the original evidence for audit/review.
create or replace function public.scan_value_measurement_anomalies(
  p_multiplier numeric default 10
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  with ranked as (
    select m.*,
      lag(m.metric_value) over (
        partition by m.value_asset_id, m.metric_key
        order by m.window_end, m.created_at
      ) as previous_value
    from public.value_measurements m
  )
  insert into public.value_integrity_flags (
    value_asset_id, measurement_id, flag_type, severity, risk_score, reason, evidence
  )
  select
    r.value_asset_id,
    r.id,
    case when r.confidence < 0.5 then 'low_confidence' else 'usage_spike' end,
    case when r.confidence < 0.25 then 'high' else 'medium' end,
    least(100, greatest(20, coalesce((r.metric_value / nullif(r.previous_value,0)) * 5, 20)))::numeric,
    'Measurement requires integrity review before it should materially influence simulated rewards.',
    jsonb_build_object(
      'metric_key', r.metric_key,
      'metric_value', r.metric_value,
      'previous_value', r.previous_value,
      'confidence', r.confidence,
      'source', r.source
    )
  from ranked r
  where r.confidence < 0.5
     or (
       r.previous_value is not null and r.previous_value > 0 and r.metric_value > r.previous_value * p_multiplier
     )
  and not exists (
    select 1 from public.value_integrity_flags f
    where f.measurement_id = r.id
      and f.flag_type in ('usage_spike','low_confidence')
      and f.status in ('open','reviewing','confirmed')
  );
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Detect contributor/reviewer conflicts where the same person is materially involved in the
-- contribution and its approval path. The system flags it for independent review.
create or replace function public.scan_value_reviewer_conflicts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  insert into public.value_integrity_flags (
    contributor_id, value_asset_id, contribution_event_id, flag_type,
    severity, risk_score, reason, evidence
  )
  select
    vae.contributor_id,
    vae.value_asset_id,
    ce.id,
    'reviewer_conflict',
    'high',
    80,
    'Contributor appears in the verification path for their own linked contribution.',
    jsonb_build_object('verified_by', ce.verified_by)
  from public.value_asset_contribution_events vae
  join public.contribution_events ce on ce.id = vae.contribution_event_id
  where ce.status = 'verified'
    and ce.verified_by = vae.contributor_id
    and not exists (
      select 1 from public.value_integrity_flags f
      where f.contribution_event_id = ce.id
        and f.flag_type = 'reviewer_conflict'
        and f.status in ('open','reviewing','confirmed')
    );
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Defensive trigger: verified lineage cannot directly create a two-node cycle.
create or replace function public.prevent_verified_lineage_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'verified' and exists (
    select 1
    from public.value_lineage_edges e
    where e.upstream_asset_id = new.downstream_asset_id
      and e.downstream_asset_id = new.upstream_asset_id
      and e.status = 'verified'
      and e.id <> new.id
  ) then
    raise exception 'Verified Value Lineage would create a direct cycle';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_verified_lineage_cycle_trigger on public.value_lineage_edges;
create trigger prevent_verified_lineage_cycle_trigger
before insert or update of upstream_asset_id, downstream_asset_id, status
on public.value_lineage_edges
for each row execute function public.prevent_verified_lineage_cycle();

create or replace view public.value_integrity_queue as
select
  f.id,
  f.flag_type,
  f.severity,
  f.risk_score,
  f.status,
  f.contributor_id,
  f.value_asset_id,
  f.reason,
  f.evidence,
  f.created_at,
  f.updated_at
from public.value_integrity_flags f
where f.status in ('open','reviewing')
order by
  case f.severity when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end desc,
  f.risk_score desc,
  f.created_at asc;

alter table public.value_integrity_flags enable row level security;
alter table public.value_integrity_reviews enable row level security;
revoke all on table public.value_integrity_flags from anon, authenticated;
revoke all on table public.value_integrity_reviews from anon, authenticated;
revoke all on public.value_integrity_queue from anon, authenticated;
revoke execute on function public.value_integrity_multiplier(uuid, uuid) from anon, authenticated;
revoke execute on function public.scan_value_share_anomalies(interval) from anon, authenticated;
revoke execute on function public.scan_value_measurement_anomalies(numeric) from anon, authenticated;
revoke execute on function public.scan_value_reviewer_conflicts() from anon, authenticated;

comment on table public.value_integrity_flags is
  'Server-only Proof of Value anomaly flags requiring auditable review; flags are not accusations.';
comment on table public.value_integrity_reviews is
  'Append-only human review trail for Proof of Value integrity flags.';
comment on function public.value_integrity_multiplier(uuid, uuid) is
  'Simulation-only confidence multiplier derived from unresolved integrity flags.';
