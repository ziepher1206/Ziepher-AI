alter table public.projects add column if not exists business_name text;
alter table public.projects add column if not exists source_domain text;
alter table public.projects add column if not exists primary_domain text;
alter table public.projects add column if not exists website_platform text;
alter table public.projects add column if not exists website_connection_mode text;
alter table public.projects add column if not exists scan_status text not null default 'not_scanned';
alter table public.projects add column if not exists last_scanned_at timestamptz;
alter table public.projects add column if not exists website_health jsonb not null default '{}'::jsonb;

create index if not exists projects_primary_domain_idx on public.projects (primary_domain) where primary_domain is not null;
create index if not exists projects_source_domain_idx on public.projects (source_domain) where source_domain is not null;
