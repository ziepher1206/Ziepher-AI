-- Audited contributor requests for a second look at a maintainer decision.
-- Requests never change contribution status or score by themselves.

create table if not exists public.contribution_rereview_requests (
  id uuid primary key default gen_random_uuid(),
  contribution_review_event_id uuid not null references public.contribution_review_events(id) on delete restrict,
  contribution_event_id uuid not null references public.contribution_events(id) on delete restrict,
  contributor_id uuid not null references public.community_contributors(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution text null,
  resolved_by uuid null references public.community_contributors(id) on delete restrict,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists contribution_rereview_requests_one_open_per_review
  on public.contribution_rereview_requests (contribution_review_event_id, contributor_id)
  where status = 'open';

create index if not exists contribution_rereview_requests_contributor_idx
  on public.contribution_rereview_requests (contributor_id, created_at desc);

create index if not exists contribution_rereview_requests_status_idx
  on public.contribution_rereview_requests (status, created_at asc);

alter table public.contribution_rereview_requests enable row level security;
revoke all on table public.contribution_rereview_requests from anon, authenticated;

comment on table public.contribution_rereview_requests is
  'Protected audit ledger for contributor requests to re-review verified or rejected contribution decisions. Requests cannot alter scores or statuses directly.';
