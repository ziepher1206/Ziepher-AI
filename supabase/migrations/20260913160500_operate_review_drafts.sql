alter table public.workspace_business_profiles
  add column if not exists review_url text;

create table if not exists public.operate_review_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_id uuid not null,
  customer_id uuid not null,
  channel text not null default 'manual' check (channel in ('manual','email','sms')),
  status text not null default 'draft' check (status in ('draft','ready','sent','dismissed')),
  subject text,
  message text not null check (char_length(trim(message)) between 1 and 5000),
  review_url text,
  created_by uuid not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, job_id),
  constraint operate_review_requests_job_workspace_fk
    foreign key (job_id, workspace_id)
    references public.jobs(id, workspace_id)
    on delete cascade,
  constraint operate_review_requests_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete cascade,
  constraint operate_review_requests_creator_workspace_fk
    foreign key (workspace_id, created_by)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict
);

create index if not exists operate_review_requests_workspace_status_idx
  on public.operate_review_requests (workspace_id, status, created_at desc);

create trigger operate_review_requests_set_updated_at
before update on public.operate_review_requests
for each row execute function public.set_updated_at();

alter table public.operate_review_requests enable row level security;

create policy "Workspace members can read review requests"
on public.operate_review_requests for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create review request drafts"
on public.operate_review_requests for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "Workspace members can update review request drafts"
on public.operate_review_requests for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
