-- Shared project state, live synchronization, durable AI context, and
-- desktop bridge device registration. Apply after 0006_billing_hardening.sql.

create table public.project_sync_states (
  project_id uuid primary key references public.projects(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null default jsonb_build_object(
    'schemaVersion', 1,
    'studio', '{}'::jsonb,
    'aiContext', '{}'::jsonb,
    'bridge', '{}'::jsonb
  ) check (jsonb_typeof(state) = 'object'),
  last_event_id uuid,
  updated_by uuid references auth.users(id) on delete set null,
  updated_from_device text,
  updated_at timestamptz not null default now()
);

create table public.project_sync_events (
  sequence bigserial primary key,
  event_id uuid not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  base_revision bigint not null check (base_revision >= 0),
  revision bigint not null check (revision > 0),
  event_type text not null default 'state.patch'
    check (event_type in ('state.patch', 'context.patch', 'bridge.checkpoint')),
  patch jsonb not null check (jsonb_typeof(patch) = 'object'),
  actor_id uuid references auth.users(id) on delete set null,
  device_id text,
  created_at timestamptz not null default now(),
  unique (project_id, revision)
);

create index project_sync_events_project_revision_idx
  on public.project_sync_events(project_id, revision);

create table public.project_bridge_devices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text not null,
  platform text not null check (platform in ('windows', 'macos', 'linux', 'unknown')),
  bridge_version text not null,
  workspace_hint text,
  capabilities jsonb not null default '[]'::jsonb
    check (jsonb_typeof(capabilities) = 'array'),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, device_id)
);

create index project_bridge_devices_project_last_seen_idx
  on public.project_bridge_devices(project_id, last_seen_at desc);

create or replace function public.initialize_project_sync_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_sync_states (project_id, state)
  values (
    new.id,
    jsonb_build_object(
      'schemaVersion', 1,
      'studio', jsonb_build_object(
        'prompt', new.original_idea,
        'projectName', new.name,
        'status', new.status
      ),
      'aiContext', jsonb_build_object(
        'vision', new.original_idea,
        'targetUsers', '[]'::jsonb,
        'requirements', '[]'::jsonb,
        'decisions', '[]'::jsonb,
        'constraints', '[]'::jsonb,
        'integrations', '[]'::jsonb,
        'notes', '[]'::jsonb
      ),
      'bridge', '{}'::jsonb
    )
  )
  on conflict (project_id) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_initialize_sync_state on public.projects;
create trigger projects_initialize_sync_state
  after insert on public.projects
  for each row execute function public.initialize_project_sync_state();

-- Backfill existing projects without changing project records.
insert into public.project_sync_states (project_id, state)
select
  p.id,
  jsonb_build_object(
    'schemaVersion', 1,
    'studio', jsonb_build_object(
      'prompt', p.original_idea,
      'projectName', p.name,
      'status', p.status
    ),
    'aiContext', jsonb_build_object(
      'vision', p.original_idea,
      'targetUsers', '[]'::jsonb,
      'requirements', '[]'::jsonb,
      'decisions', '[]'::jsonb,
      'constraints', '[]'::jsonb,
      'integrations', '[]'::jsonb,
      'notes', '[]'::jsonb
    ),
    'bridge', '{}'::jsonb
  )
from public.projects p
on conflict (project_id) do nothing;

create or replace function public.get_project_sync_state(p_project_id uuid)
returns table (
  project_id uuid,
  revision bigint,
  state jsonb,
  last_event_id uuid,
  updated_from_device text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  insert into public.project_sync_states (project_id)
  values (p_project_id)
  on conflict do nothing;

  return query
  select
    s.project_id,
    s.revision,
    s.state,
    s.last_event_id,
    s.updated_from_device,
    s.updated_at
  from public.project_sync_states s
  where s.project_id = p_project_id;
end;
$$;

create or replace function public.apply_project_sync_patch(
  p_project_id uuid,
  p_base_revision bigint,
  p_event_id uuid,
  p_device_id text,
  p_event_type text,
  p_patch jsonb
)
returns table (
  project_id uuid,
  revision bigint,
  state jsonb,
  last_event_id uuid,
  updated_from_device text,
  updated_at timestamptz,
  replayed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.project_sync_states%rowtype;
  v_existing public.project_sync_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;
  if p_event_id is null then
    raise exception 'A sync event id is required';
  end if;
  if p_base_revision < 0 then
    raise exception 'Base revision must be zero or greater';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Sync patch must be a JSON object';
  end if;
  if p_event_type not in ('state.patch', 'context.patch', 'bridge.checkpoint') then
    raise exception 'Unsupported sync event type';
  end if;

  select * into v_existing
  from public.project_sync_events e
  where e.event_id = p_event_id;

  if found then
    if v_existing.project_id <> p_project_id then
      raise exception 'Sync event belongs to another project';
    end if;
    select * into v_state
    from public.project_sync_states s
    where s.project_id = p_project_id;
    return query select
      v_state.project_id,
      v_state.revision,
      v_state.state,
      v_state.last_event_id,
      v_state.updated_from_device,
      v_state.updated_at,
      true;
    return;
  end if;

  insert into public.project_sync_states (project_id)
  values (p_project_id)
  on conflict do nothing;

  select * into v_state
  from public.project_sync_states s
  where s.project_id = p_project_id
  for update;

  if v_state.revision <> p_base_revision then
    raise exception 'SYNC_CONFLICT:%', v_state.revision;
  end if;

  update public.project_sync_states s
  set revision = s.revision + 1,
      state = jsonb_build_object(
        'schemaVersion', coalesce(
          p_patch -> 'schemaVersion',
          s.state -> 'schemaVersion',
          '1'::jsonb
        ),
        'studio', coalesce(s.state -> 'studio', '{}'::jsonb)
          || coalesce(p_patch -> 'studio', '{}'::jsonb),
        'aiContext', coalesce(s.state -> 'aiContext', '{}'::jsonb)
          || coalesce(p_patch -> 'aiContext', '{}'::jsonb),
        'bridge', coalesce(s.state -> 'bridge', '{}'::jsonb)
          || coalesce(p_patch -> 'bridge', '{}'::jsonb)
      ),
      last_event_id = p_event_id,
      updated_by = auth.uid(),
      updated_from_device = nullif(trim(p_device_id), ''),
      updated_at = now()
  where s.project_id = p_project_id
  returning * into v_state;

  insert into public.project_sync_events (
    event_id,
    project_id,
    base_revision,
    revision,
    event_type,
    patch,
    actor_id,
    device_id
  )
  values (
    p_event_id,
    p_project_id,
    p_base_revision,
    v_state.revision,
    p_event_type,
    p_patch,
    auth.uid(),
    nullif(trim(p_device_id), '')
  );

  return query select
    v_state.project_id,
    v_state.revision,
    v_state.state,
    v_state.last_event_id,
    v_state.updated_from_device,
    v_state.updated_at,
    false;
end;
$$;

create or replace function public.register_project_bridge_device(
  p_project_id uuid,
  p_device_id text,
  p_device_name text,
  p_platform text,
  p_bridge_version text,
  p_workspace_hint text,
  p_capabilities jsonb
)
returns public.project_bridge_devices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.project_bridge_devices;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;
  if char_length(trim(p_device_id)) not between 8 and 200 then
    raise exception 'Invalid device id';
  end if;
  if p_platform not in ('windows', 'macos', 'linux', 'unknown') then
    raise exception 'Invalid bridge platform';
  end if;
  if jsonb_typeof(coalesce(p_capabilities, '[]'::jsonb)) <> 'array' then
    raise exception 'Bridge capabilities must be an array';
  end if;

  insert into public.project_bridge_devices (
    project_id,
    owner_id,
    device_id,
    device_name,
    platform,
    bridge_version,
    workspace_hint,
    capabilities,
    last_seen_at
  )
  values (
    p_project_id,
    auth.uid(),
    trim(p_device_id),
    left(trim(p_device_name), 120),
    p_platform,
    left(trim(p_bridge_version), 40),
    nullif(left(trim(p_workspace_hint), 500), ''),
    coalesce(p_capabilities, '[]'::jsonb),
    now()
  )
  on conflict (project_id, device_id) do update
  set device_name = excluded.device_name,
      platform = excluded.platform,
      bridge_version = excluded.bridge_version,
      workspace_hint = excluded.workspace_hint,
      capabilities = excluded.capabilities,
      last_seen_at = now()
  returning * into v_device;

  return v_device;
end;
$$;

alter table public.project_sync_states enable row level security;
alter table public.project_sync_events enable row level security;
alter table public.project_bridge_devices enable row level security;

create policy "project_sync_states_select_member"
on public.project_sync_states for select
using (public.is_project_member(project_id));

create policy "project_sync_events_select_member"
on public.project_sync_events for select
using (public.is_project_member(project_id));

create policy "project_bridge_devices_select_member"
on public.project_bridge_devices for select
using (public.is_project_member(project_id));

revoke all on function public.get_project_sync_state(uuid)
from public, anon;
revoke all on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb)
from public, anon;
revoke all on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb)
from public, anon;

grant execute on function public.get_project_sync_state(uuid) to authenticated;
grant execute on function public.apply_project_sync_patch(uuid, bigint, uuid, text, text, jsonb) to authenticated;
grant execute on function public.register_project_bridge_device(uuid, text, text, text, text, text, jsonb) to authenticated;

-- Supabase Realtime publishes state snapshots. The append-only event table is
-- fetched through the authenticated sync API for reconnect/catch-up.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'project_sync_states'
     ) then
    alter publication supabase_realtime add table public.project_sync_states;
  end if;
end;
$$;
