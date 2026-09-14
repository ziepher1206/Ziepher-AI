-- Require every verified contribution score to carry an inspectable breakdown.

alter table public.contribution_score_adjustments
  add column if not exists scoring_breakdown jsonb not null default '{}'::jsonb;

alter table public.contribution_review_events
  add column if not exists scoring_breakdown jsonb not null default '{}'::jsonb;

drop function if exists public.verify_contribution_event(uuid, uuid, integer, text);

create function public.verify_contribution_event(
  p_event_id uuid,
  p_verifier_contributor_id uuid,
  p_verified_score integer,
  p_scoring_breakdown jsonb,
  p_reason text
)
returns public.contribution_events
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event public.contribution_events;
  v_verifier public.community_contributors;
  v_previous_status text;
  v_previous_score integer;
begin
  if p_verified_score < 0 then
    raise exception 'Verified score cannot be negative.';
  end if;

  if jsonb_typeof(p_scoring_breakdown) is distinct from 'object'
    or p_scoring_breakdown = '{}'::jsonb then
    raise exception 'A non-empty scoring breakdown object is required.';
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise exception 'A verification reason is required.';
  end if;

  select * into v_verifier
  from public.community_contributors
  where id = p_verifier_contributor_id;

  if v_verifier.id is null
    or not v_verifier.is_verified
    or v_verifier.status not in ('module_maintainer', 'core_contributor', 'core_team') then
    raise exception 'Verifier is not authorized to verify contribution events.';
  end if;

  select * into v_event
  from public.contribution_events
  where id = p_event_id
  for update;

  if v_event.id is null then
    raise exception 'Contribution event not found.';
  end if;

  if v_event.status in ('rejected', 'superseded') then
    raise exception 'Rejected or superseded contribution events cannot be verified.';
  end if;

  v_previous_status := v_event.status;
  v_previous_score := v_event.verified_score;

  perform set_config('app.community_verification_write', 'allowed', true);

  update public.contribution_events
  set status = 'verified',
      verified_score = p_verified_score,
      verified_by = p_verifier_contributor_id,
      verified_at = now(),
      updated_at = now()
  where id = p_event_id
  returning * into v_event;

  insert into public.contribution_score_adjustments (
    contribution_event_id,
    previous_verified_score,
    new_verified_score,
    reason,
    adjusted_by,
    scoring_breakdown
  ) values (
    p_event_id,
    v_previous_score,
    p_verified_score,
    btrim(p_reason),
    p_verifier_contributor_id,
    p_scoring_breakdown
  );

  insert into public.contribution_review_events (
    contribution_event_id,
    action,
    previous_status,
    new_status,
    previous_verified_score,
    new_verified_score,
    reason,
    reviewed_by,
    scoring_breakdown
  ) values (
    p_event_id,
    'verified',
    v_previous_status,
    'verified',
    v_previous_score,
    p_verified_score,
    btrim(p_reason),
    p_verifier_contributor_id,
    p_scoring_breakdown
  );

  return v_event;
end;
$$;

revoke execute on function public.verify_contribution_event(uuid, uuid, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.verify_contribution_event(uuid, uuid, integer, jsonb, text) to service_role;

comment on function public.verify_contribution_event(uuid, uuid, integer, jsonb, text) is
  'Maintainer-only audited verification requiring an explicit scoring breakdown.';
