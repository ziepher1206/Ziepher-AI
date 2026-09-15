-- ZLife Services foundation.
-- ZLife owns the user's request record. Marketplace execution stays behind an explicit provider boundary.

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  category text not null check (char_length(trim(category)) between 2 and 80),
  title text not null check (char_length(trim(title)) between 2 and 180),
  description text,
  service_address text,
  status text not null default 'requested' check (status in ('requested','matched','inspection_scheduled','closed','canceled')),
  source text not null default 'zlife' check (source in ('zlife','home','business','assistant','imported')),
  external_provider text,
  external_request_id text,
  existing_relationship boolean not null default false,
  billable_event_confirmed boolean not null default false,
  inspection_scheduled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, external_provider, external_request_id)
);

create index if not exists service_requests_workspace_status_idx
  on public.service_requests (workspace_id, status, created_at desc);

create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

alter table public.service_requests enable row level security;

create policy "Workspace members can read service requests"
on public.service_requests for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create their service requests"
on public.service_requests for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and requested_by = auth.uid()
  and external_provider is null
  and external_request_id is null
  and billable_event_confirmed = false
  and inspection_scheduled_at is null
);

create policy "Workspace members can update service requests"
on public.service_requests for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

revoke all on public.service_requests from anon;
grant select, insert, update on public.service_requests to authenticated;
