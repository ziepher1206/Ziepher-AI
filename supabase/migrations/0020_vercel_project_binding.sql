-- Bind each Ziepher project to one canonical Vercel project and snapshot that
-- identity into every new Vercel deployment. Deployment workers must use the
-- snapshot rather than inferring a target from the temporary filesystem.

alter table public.projects
  add column if not exists vercel_project_id text,
  add column if not exists vercel_project_name text,
  add column if not exists vercel_org_id text;

alter table public.projects
  drop constraint if exists projects_vercel_binding_check;
alter table public.projects
  add constraint projects_vercel_binding_check
  check (
    (vercel_project_id is null and vercel_project_name is null and vercel_org_id is null)
    or (
      vercel_project_id ~ '^prj_[A-Za-z0-9]+$'
      and nullif(trim(vercel_project_name), '') is not null
      and nullif(trim(vercel_org_id), '') is not null
      and length(vercel_project_id) <= 255
      and length(vercel_project_name) <= 255
      and length(vercel_org_id) <= 255
    )
  );

create unique index if not exists projects_vercel_target_uidx
  on public.projects(vercel_org_id, vercel_project_id)
  where vercel_org_id is not null and vercel_project_id is not null;

alter table public.deployments
  add column if not exists vercel_project_id text,
  add column if not exists vercel_project_name text,
  add column if not exists vercel_org_id text;

alter table public.deployments
  drop constraint if exists deployments_vercel_binding_check;
alter table public.deployments
  add constraint deployments_vercel_binding_check
  check (
    (vercel_project_id is null and vercel_project_name is null and vercel_org_id is null)
    or (
      vercel_project_id ~ '^prj_[A-Za-z0-9]+$'
      and nullif(trim(vercel_project_name), '') is not null
      and nullif(trim(vercel_org_id), '') is not null
      and length(vercel_project_id) <= 255
      and length(vercel_project_name) <= 255
      and length(vercel_org_id) <= 255
    )
  );

create index if not exists deployments_vercel_target_idx
  on public.deployments(vercel_org_id, vercel_project_id, created_at desc)
  where vercel_project_id is not null;

create or replace function public.snapshot_vercel_deployment_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id text;
  v_project_name text;
  v_org_id text;
begin
  if tg_op = 'UPDATE' then
    if new.project_id is distinct from old.project_id
       or new.provider is distinct from old.provider
       or new.vercel_project_id is distinct from old.vercel_project_id
       or new.vercel_project_name is distinct from old.vercel_project_name
       or new.vercel_org_id is distinct from old.vercel_org_id then
      raise exception 'Deployment provider target identity is immutable';
    end if;
    return new;
  end if;

  if new.provider <> 'vercel' then
    new.vercel_project_id := null;
    new.vercel_project_name := null;
    new.vercel_org_id := null;
    return new;
  end if;

  select p.vercel_project_id, p.vercel_project_name, p.vercel_org_id
  into v_project_id, v_project_name, v_org_id
  from public.projects p
  where p.id = new.project_id;

  if v_project_id is null or v_project_name is null or v_org_id is null then
    raise exception 'Project must have a validated Vercel deployment target before queueing a Vercel deployment';
  end if;

  new.vercel_project_id := v_project_id;
  new.vercel_project_name := v_project_name;
  new.vercel_org_id := v_org_id;
  return new;
end;
$$;

drop trigger if exists deployments_snapshot_vercel_target on public.deployments;
create trigger deployments_snapshot_vercel_target
before insert or update on public.deployments
for each row execute function public.snapshot_vercel_deployment_target();

revoke all on function public.snapshot_vercel_deployment_target()
from public, anon, authenticated;
grant execute on function public.snapshot_vercel_deployment_target()
to service_role;
