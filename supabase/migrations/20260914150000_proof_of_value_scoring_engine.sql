-- ZLife Proof of Value scoring engine.
-- Simulation and attribution only. This does not create legal compensation,
-- equity, token, payout, wage, profit-sharing, or transferable rights.

create or replace function public.value_effective_share(
  p_share_delta numeric,
  p_share_class text,
  p_effective_at timestamptz,
  p_decay_policy jsonb,
  p_as_of timestamptz default now()
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_mode text := coalesce(p_decay_policy->>'mode', case when p_share_class = 'maintenance' then 'half_life' else 'none' end);
  v_age_days numeric := greatest(0, extract(epoch from (p_as_of - p_effective_at)) / 86400.0);
  v_half_life_days numeric := greatest(1, coalesce((p_decay_policy->>'half_life_days')::numeric, 180));
  v_lifetime_days numeric := greatest(1, coalesce((p_decay_policy->>'lifetime_days')::numeric, 365));
  v_floor numeric := greatest(0, least(1, coalesce((p_decay_policy->>'floor')::numeric, 0)));
  v_factor numeric := 1;
begin
  if p_as_of < p_effective_at then
    return 0;
  end if;

  if v_mode = 'none' then
    v_factor := 1;
  elsif v_mode = 'half_life' then
    v_factor := power(0.5::numeric, v_age_days / v_half_life_days);
  elsif v_mode = 'linear' then
    v_factor := greatest(v_floor, 1 - (v_age_days / v_lifetime_days));
  else
    raise exception 'Unsupported value share decay mode: %', v_mode;
  end if;

  v_factor := greatest(v_floor, least(1, v_factor));
  return p_share_delta * v_factor;
end;
$$;

comment on function public.value_effective_share is
  'Calculates simulation-only effective Contribution Shares at a point in time using explicit decay rules.';

create or replace view public.value_verified_effective_shares as
select
  e.id as contribution_share_event_id,
  e.value_asset_id,
  e.contributor_id,
  e.share_class,
  e.share_delta,
  e.effective_at,
  public.value_effective_share(
    e.share_delta,
    e.share_class,
    e.effective_at,
    e.decay_policy,
    now()
  ) as effective_share,
  e.contribution_event_id,
  e.reason,
  e.metadata
from public.value_asset_contribution_events e
left join public.contribution_events c on c.id = e.contribution_event_id
where e.contribution_event_id is null
   or c.status = 'verified';

revoke all on table public.value_verified_effective_shares from anon, authenticated;

create or replace function public.value_metric_score(
  p_metric_key text,
  p_metric_value numeric,
  p_confidence numeric,
  p_policy jsonb
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_metric jsonb := coalesce(p_policy->'metrics'->p_metric_key, '{}'::jsonb);
  v_weight numeric := coalesce((v_metric->>'weight')::numeric, 0);
  v_target numeric := nullif((v_metric->>'target')::numeric, 0);
  v_cap numeric := greatest(0, coalesce((v_metric->>'cap')::numeric, 1));
  v_direction text := coalesce(v_metric->>'direction', 'higher');
  v_normalized numeric := 0;
begin
  if v_weight = 0 or v_target is null then
    return 0;
  end if;

  if v_direction = 'lower' then
    if p_metric_value <= 0 then
      v_normalized := v_cap;
    else
      v_normalized := least(v_cap, v_target / p_metric_value);
    end if;
  else
    v_normalized := least(v_cap, greatest(0, p_metric_value / v_target));
  end if;

  return v_weight * v_normalized * greatest(0, least(1, coalesce(p_confidence, 1)));
end;
$$;

create or replace function public.value_asset_direct_score(
  p_value_asset_id uuid,
  p_policy jsonb,
  p_as_of timestamptz default now()
)
returns numeric
language sql
stable
as $$
  with latest as (
    select distinct on (m.metric_key)
      m.metric_key,
      m.metric_value,
      m.confidence
    from public.value_measurements m
    where m.value_asset_id = p_value_asset_id
      and m.window_end <= p_as_of
      and m.window_end >= p_as_of - make_interval(days => coalesce((p_policy->>'measurement_lookback_days')::int, 90))
    order by m.metric_key, m.window_end desc, m.created_at desc
  )
  select coalesce(sum(public.value_metric_score(metric_key, metric_value, confidence, p_policy)), 0)
  from latest;
$$;

create or replace function public.value_asset_lineage_score(
  p_value_asset_id uuid,
  p_policy jsonb,
  p_as_of timestamptz default now()
)
returns numeric
language sql
stable
as $$
  with recursive downstream as (
    select
      l.downstream_asset_id,
      l.weight::numeric as path_weight,
      1 as depth,
      array[p_value_asset_id, l.downstream_asset_id]::uuid[] as visited
    from public.value_lineage_edges l
    where l.upstream_asset_id = p_value_asset_id
      and l.status = 'verified'

    union all

    select
      l.downstream_asset_id,
      d.path_weight * l.weight,
      d.depth + 1,
      d.visited || l.downstream_asset_id
    from downstream d
    join public.value_lineage_edges l on l.upstream_asset_id = d.downstream_asset_id
    where l.status = 'verified'
      and d.depth < greatest(1, least(8, coalesce((p_policy->>'lineage_max_depth')::int, 3)))
      and not l.downstream_asset_id = any(d.visited)
  )
  select coalesce(sum(
    public.value_asset_direct_score(d.downstream_asset_id, p_policy, p_as_of)
    * d.path_weight
    * power(coalesce((p_policy->>'lineage_depth_decay')::numeric, 0.5), d.depth)
  ), 0)
  from downstream d;
$$;

create or replace function public.value_contributor_asset_score(
  p_contributor_id uuid,
  p_value_asset_id uuid,
  p_policy jsonb,
  p_as_of timestamptz default now()
)
returns table (
  effective_shares numeric,
  asset_total_effective_shares numeric,
  ownership_fraction numeric,
  direct_score numeric,
  lineage_score numeric,
  total_value_score numeric
)
language sql
stable
as $$
  with shares as (
    select
      e.contributor_id,
      sum(
        public.value_effective_share(
          e.share_delta,
          e.share_class,
          e.effective_at,
          e.decay_policy,
          p_as_of
        ) * coalesce((p_policy->'share_class_multipliers'->>e.share_class)::numeric, 1)
      ) as effective_share
    from public.value_asset_contribution_events e
    left join public.contribution_events c on c.id = e.contribution_event_id
    where e.value_asset_id = p_value_asset_id
      and (e.contribution_event_id is null or c.status = 'verified')
    group by e.contributor_id
  ), totals as (
    select coalesce(sum(greatest(effective_share, 0)), 0) as asset_total from shares
  ), mine as (
    select coalesce((select greatest(effective_share, 0) from shares where contributor_id = p_contributor_id), 0) as contributor_total
  ), scores as (
    select
      public.value_asset_direct_score(p_value_asset_id, p_policy, p_as_of) as direct_score,
      public.value_asset_lineage_score(p_value_asset_id, p_policy, p_as_of) as lineage_score
  )
  select
    mine.contributor_total,
    totals.asset_total,
    case when totals.asset_total > 0 then mine.contributor_total / totals.asset_total else 0 end,
    scores.direct_score,
    scores.lineage_score,
    (scores.direct_score + scores.lineage_score)
      * case when totals.asset_total > 0 then mine.contributor_total / totals.asset_total else 0 end
  from mine, totals, scores;
$$;

create or replace function public.run_value_reward_simulation(
  p_simulation_id uuid,
  p_as_of timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sim public.value_reward_simulations%rowtype;
  v_policy jsonb;
  v_total_score numeric := 0;
  v_allocated numeric := 0;
begin
  select * into v_sim
  from public.value_reward_simulations
  where id = p_simulation_id
  for update;

  if not found then
    raise exception 'Simulation % not found', p_simulation_id;
  end if;

  if v_sim.status not in ('pending', 'failed') then
    raise exception 'Simulation % is not runnable from status %', p_simulation_id, v_sim.status;
  end if;

  select policy into v_policy
  from public.value_policy_versions
  where id = v_sim.policy_version_id
    and status in ('draft', 'simulation');

  if v_policy is null then
    raise exception 'Simulation policy % is unavailable', v_sim.policy_version_id;
  end if;

  update public.value_reward_simulations
  set status = 'running', completed_at = null
  where id = p_simulation_id;

  delete from public.value_reward_simulation_allocations
  where simulation_id = p_simulation_id;

  create temporary table if not exists tmp_value_scores (
    contributor_id uuid,
    value_asset_id uuid,
    direct_value numeric,
    lineage_value numeric,
    total_value numeric
  ) on commit drop;

  truncate tmp_value_scores;

  insert into tmp_value_scores (contributor_id, value_asset_id, direct_value, lineage_value, total_value)
  select
    s.contributor_id,
    a.id,
    greatest(v.direct_score * v.ownership_fraction, 0),
    greatest(v.lineage_score * v.ownership_fraction, 0),
    greatest(v.total_value_score, 0)
  from public.value_assets a
  join (
    select distinct contributor_id, value_asset_id
    from public.value_asset_contribution_events
  ) s on s.value_asset_id = a.id
  cross join lateral public.value_contributor_asset_score(s.contributor_id, a.id, v_policy, p_as_of) v
  where a.status in ('active', 'maintenance')
    and (v_sim.module_id is null or a.module_id = v_sim.module_id)
    and v.total_value_score > 0;

  select coalesce(sum(total_value), 0) into v_total_score from tmp_value_scores;

  if v_total_score > 0 then
    insert into public.value_reward_simulation_allocations (
      simulation_id,
      contributor_id,
      value_asset_id,
      direct_amount,
      lineage_amount,
      explanation
    )
    select
      p_simulation_id,
      contributor_id,
      value_asset_id,
      v_sim.hypothetical_pool_amount * direct_value / v_total_score,
      v_sim.hypothetical_pool_amount * lineage_value / v_total_score,
      jsonb_build_object(
        'simulation_only', true,
        'as_of', p_as_of,
        'direct_value_score', direct_value,
        'lineage_value_score', lineage_value,
        'total_value_score', total_value,
        'global_total_value_score', v_total_score
      )
    from tmp_value_scores;
  end if;

  select coalesce(sum(total_amount), 0)
  into v_allocated
  from public.value_reward_simulation_allocations
  where simulation_id = p_simulation_id;

  update public.value_reward_simulations
  set
    status = 'completed',
    completed_at = now(),
    input_snapshot = input_snapshot || jsonb_build_object(
      'as_of', p_as_of,
      'policy', v_policy,
      'simulation_only', true
    ),
    output_summary = jsonb_build_object(
      'total_value_score', v_total_score,
      'hypothetical_pool_amount', v_sim.hypothetical_pool_amount,
      'allocated_amount', v_allocated,
      'unallocated_amount', greatest(v_sim.hypothetical_pool_amount - v_allocated, 0),
      'allocation_count', (select count(*) from public.value_reward_simulation_allocations where simulation_id = p_simulation_id)
    )
  where id = p_simulation_id;
exception
  when others then
    update public.value_reward_simulations
    set status = 'failed', output_summary = jsonb_build_object('error', sqlerrm, 'simulation_only', true)
    where id = p_simulation_id;
    raise;
end;
$$;

revoke all on function public.run_value_reward_simulation(uuid, timestamptz) from public, anon, authenticated;

insert into public.value_policy_versions (version, status, policy, notes)
values (
  'pov-v1-simulation',
  'simulation',
  jsonb_build_object(
    'measurement_lookback_days', 90,
    'lineage_max_depth', 3,
    'lineage_depth_decay', 0.5,
    'share_class_multipliers', jsonb_build_object(
      'creation', 1.25,
      'improvement', 1.0,
      'maintenance', 1.0,
      'quality', 1.1,
      'security', 1.2,
      'adoption', 0.9
    ),
    'metrics', jsonb_build_object(
      'verified_usage', jsonb_build_object('weight', 1.0, 'target', 1000, 'cap', 4, 'direction', 'higher'),
      'successful_outcomes', jsonb_build_object('weight', 1.5, 'target', 100, 'cap', 4, 'direction', 'higher'),
      'revenue_influence_usd', jsonb_build_object('weight', 1.0, 'target', 10000, 'cap', 5, 'direction', 'higher'),
      'cost_savings_usd', jsonb_build_object('weight', 1.0, 'target', 5000, 'cap', 5, 'direction', 'higher'),
      'reliability_percent', jsonb_build_object('weight', 1.2, 'target', 99.9, 'cap', 1.2, 'direction', 'higher'),
      'incident_rate', jsonb_build_object('weight', 0.8, 'target', 1, 'cap', 1, 'direction', 'lower')
    )
  ),
  'First simulation policy. Values are intentionally inspectable and changeable before any real-world economic use.'
)
on conflict (version) do nothing;

comment on function public.run_value_reward_simulation is
  'Runs a hypothetical Proof of Value allocation only. It never creates a payout or binding economic entitlement.';
