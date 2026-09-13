create table if not exists public.site_change_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  source_type text not null default 'manual',
  source_reference text,
  title text not null,
  instructions text not null,
  status text not null default 'draft',
  ai_generation_approved boolean not null default false,
  ai_generation_approved_by uuid references auth.users(id) on delete set null,
  ai_generation_approved_at timestamptz,
  spec_version_id uuid references public.app_spec_versions(id) on delete set null,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  source_control_run_id uuid references public.source_control_runs(id) on delete set null,
  preview_url text,
  published_at timestamptz,
  change_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_change_requests_source_type_check check (
    source_type in ('manual','scan_recommendation','campaign')
  ),
  constraint site_change_requests_status_check check (
    status in (
      'draft','awaiting_ai_approval','ready_for_ai','generating',
      'proposal_ready','build_queued','building','qa_pending',
      'preview_ready','approved','publishing','published','failed','cancelled'
    )
  ),
  constraint site_change_requests_ai_approval_shape check (
    (ai_generation_approved = false and ai_generation_approved_by is null and ai_generation_approved_at is null)
    or
    (ai_generation_approved = true and ai_generation_approved_by is not null and ai_generation_approved_at is not null)
  )
);

alter table public.site_change_requests enable row level security;

create index if not exists site_change_requests_project_created_idx
  on public.site_change_requests (project_id, created_at desc);
create index if not exists site_change_requests_project_status_idx
  on public.site_change_requests (project_id, status, updated_at desc);

create policy site_change_requests_select_member on public.site_change_requests
  for select to authenticated
  using (public.is_project_member(project_id));

grant select on public.site_change_requests to authenticated;
revoke insert, update, delete on public.site_change_requests from authenticated;
revoke all on public.site_change_requests from anon;

drop trigger if exists site_change_requests_set_updated_at on public.site_change_requests;
create trigger site_change_requests_set_updated_at
  before update on public.site_change_requests
  for each row execute function public.set_updated_at();