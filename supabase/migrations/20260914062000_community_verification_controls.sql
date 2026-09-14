-- ZLife Contribution Ledger verification controls.
-- Verification remains a maintainer-controlled server action. Browser roles
-- cannot execute these functions or update the underlying ledger tables.

create table if not exists public.contribution_review_events (
  id uuid primary key default gen_random_uuid(),
  contribution_event_id uuid not null references public.contribution_events(id) on delete restrict,
  action text not null check (action in ('verified', 'rejected')),
  previous_status text not null,
  new_status text not null,
  previous_verified_score integer null,
  new_verified_score integer null,
  reason text not null,
  reviewed_by uuid not null references public.community_contributors(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists contribution_review_events_event_idx
  on public.contribution_review_events (contribution_event_id, created_at desc);

alter table public.contribution_review_events enable row level security;
revoke all on table public.contribution_review_events from anon, authenticated;

create or replace function public.guard_contribution_verification_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    old.status is distinct from new.status
    or old.verified_score is distinct from new.verified_score
    or old.verified_by is distinct from new.verified_by
    or old.verified_at is distinct from new.verified_at
  ) and coalesce(current_setting('app.community_verification_write', true), '') <> 'allowed' then
    raise exception 'Contribution verification fields must be changed through an audited verification function.';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_contribution_verification_fields() from public, anon, authenticated;
grant execute on function public.guard_contribution_verification_fields() to service_role;

drop trigger if exists contribution_events_guard_verification on public.contribution_events;
create trigger contribution_events_guard_verification
before update on public.contribution_events
for each row
execute function public.guard_contribution_verification_fields();

create or replace function public.verify_contribution_event(
  p_event_id uuid,
  p_verifier_contributor_id uuid,
  p_verified_score integer,
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

  if nullif(btrim(p_reason), '') is null then
    raise exception 'A verification reason is required.';
  end if;

  select *
  into v_verifier
  from public.community_contributors
  where id = p_verifier_contributor_id;

  if v_verifier.id is null
    or not v_verifier.is_verified
    or v_verifier.status not in ('module_maintainer', 'core_contributor', 'core_team') then
    raise exception 'Verifier is not authorized to verify contribution events.';
  end if;

  select *
  into v_event
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
    adjusted_by
  ) values (
    p_event_id,
    v_previous_score,
    p_verified_score,
    btrim(p_reason),
    p_verifier_contributor_id
  );

  insert into public.contribution_review_events (
    contribution_event_id,
    action,
    previous_status,
    new_status,
    previous_verified_score,
    new_verified_score,
    reason,
    reviewed_by
  ) values (
    p_event_id,
    'verified',
    v_previous_status,
    'verified',
    v_previous_score,
    p_verified_score,
    btrim(p_reason),
    p_verifier_contributor_id
  );

  return v_event;
end;
$$;

revoke execute on function public.verify_contribution_event(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.verify_contribution_event(uuid, uuid, integer, text) to service_role;

create or replace function public.reject_contribution_event(
  p_event_id uuid,
  p_verifier_contributor_id uuid,
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
  if nullif(btrim(p_reason), '') is null then
    raise exception 'A rejection reason is required.';
  end if;

  select *
  into v_verifier
  from public.community_contributors
  where id = p_verifier_contributor_id;

  if v_verifier.id is null
    or not v_verifier.is_verified
    or v_verifier.status not in ('module_maintainer', 'core_contributor', 'core_team') then
    raise exception 'Verifier is not authorized to reject contribution events.';
  end if;

  select *
  into v_event
  from public.contribution_events
  where id = p_event_id
  for update;

  if v_event.id is null then
    raise exception 'Contribution event not found.';
  end if;

  if v_event.status = 'verified' then
    raise exception 'Verified contribution events must not be silently rejected.';
  end if;

  if v_event.status = 'superseded' then
    raise exception 'Superseded contribution events cannot be rejected.';
  end if;

  v_previous_status := v_event.status;
  v_previous_score := v_event.verified_score;

  perform set_config('app.community_verification_write', 'allowed', true);

  update public.contribution_events
  set status = 'rejected',
      verified_score = null,
      verified_by = p_verifier_contributor_id,
      verified_at = now(),
      updated_at = now()
  where id = p_event_id
  returning * into v_event;

  insert into public.contribution_review_events (
    contribution_event_id,
    action,
    previous_status,
    new_status,
    previous_verified_score,
    new_verified_score,
    reason,
    reviewed_by
  ) values (
    p_event_id,
    'rejected',
    v_previous_status,
    'rejected',
    v_previous_score,
    null,
    btrim(p_reason),
    p_verifier_contributor_id
  );

  return v_event;
end;
$$;

revoke execute on function public.reject_contribution_event(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_contribution_event(uuid, uuid, text) to service_role;

comment on table public.contribution_review_events is
  'Append-only audit history for contribution verification and rejection decisions.';
comment on function public.verify_contribution_event(uuid, uuid, integer, text) is
  'Maintainer-only audited transition from pending contribution evidence to verified contribution value.';
comment on function public.reject_contribution_event(uuid, uuid, text) is
  'Maintainer-only audited rejection of unverified contribution evidence.';
