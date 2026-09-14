-- Tree Service Phase 3: scheduling buffers, lineage invariants, estimate photos, and stronger scheduling enforcement.

alter table public.services
  add column if not exists travel_buffer_minutes integer not null default 0
  check (travel_buffer_minutes between 0 and 240);

alter table public.appointments
  add column if not exists travel_buffer_minutes integer not null default 0
  check (travel_buffer_minutes between 0 and 240);

create unique index if not exists jobs_workspace_estimate_unique_idx
  on public.jobs(workspace_id, estimate_id)
  where estimate_id is not null;

create or replace function public.set_operate_appointment_occupied_during()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.occupied_during := tstzrange(
    new.starts_at - (new.travel_buffer_minutes + new.preparation_buffer_minutes) * interval '1 minute',
    new.ends_at + new.cleanup_buffer_minutes * interval '1 minute',
    '[)'
  );
  return new;
end;
$$;

create table if not exists public.operate_estimate_media (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  estimate_id uuid not null,
  property_id uuid,
  uploaded_by uuid references auth.users(id) on delete set null,
  category text not null default 'general' check (category in ('site','scope','hazard','general')),
  storage_bucket text not null default 'operate-media' check (storage_bucket = 'operate-media'),
  storage_path text not null,
  display_name text not null,
  mime_type text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  constraint operate_estimate_media_estimate_workspace_fk
    foreign key (estimate_id, workspace_id)
    references public.estimates(id, workspace_id)
    on delete cascade,
  constraint operate_estimate_media_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict
);

create index if not exists operate_estimate_media_estimate_created_idx
  on public.operate_estimate_media(workspace_id, estimate_id, created_at desc);
create index if not exists operate_estimate_media_uploaded_by_idx
  on public.operate_estimate_media(uploaded_by) where uploaded_by is not null;

create trigger operate_estimate_media_set_updated_at
before update on public.operate_estimate_media
for each row execute function public.set_updated_at();

alter table public.operate_estimate_media enable row level security;

create policy "Workspace members can read estimate media"
on public.operate_estimate_media for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can add estimate media"
on public.operate_estimate_media for insert to authenticated
with check (public.is_workspace_member(workspace_id) and uploaded_by = auth.uid());

create policy "Workspace members can update estimate media"
on public.operate_estimate_media for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can delete estimate media"
on public.operate_estimate_media for delete to authenticated
using (public.is_workspace_member(workspace_id));

-- Rebuild estimate scheduling so appointment occupancy includes travel/prep/cleanup
-- and workspace/user blocks are honored before insertion.
create or replace function public.convert_operate_lead_to_estimate(
  p_lead_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_duration_minutes integer default 60
) returns table(customer_id uuid, property_id uuid, estimate_id uuid, appointment_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads%rowtype;
  v_customer_id uuid;
  v_property_id uuid;
  v_estimate_id uuid;
  v_appointment_id uuid;
  v_title text;
  v_email text;
  v_phone_digits text;
  v_identity_key text;
  v_duration integer;
  v_travel integer := 0;
  v_prep integer := 0;
  v_cleanup integer := 0;
  v_ends_at timestamptz;
  v_occupied_start timestamptz;
  v_occupied_end timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_duration_minutes < 15 or p_duration_minutes > 1440 then raise exception 'Estimate appointment duration must be between 15 and 1440 minutes.'; end if;

  v_title := trim(coalesce(p_title, ''));
  if char_length(v_title) < 1 or char_length(v_title) > 180 then raise exception 'Estimate title must be between 1 and 180 characters.'; end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead not found.'; end if;
  if not public.is_workspace_member(v_lead.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_lead.status in ('lost','spam') then raise exception 'This lead cannot be converted in its current status.'; end if;

  v_duration := p_duration_minutes;
  if v_lead.service_id is not null then
    select
      coalesce(s.travel_buffer_minutes, 0),
      coalesce(s.preparation_buffer_minutes, 0),
      coalesce(s.cleanup_buffer_minutes, 0)
    into v_travel, v_prep, v_cleanup
    from public.services s
    where s.id = v_lead.service_id and s.workspace_id = v_lead.workspace_id;
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_occupied_start := p_starts_at - make_interval(mins => v_travel + v_prep);
  v_occupied_end := v_ends_at + make_interval(mins => v_cleanup);

  if exists (
    select 1 from public.schedule_overrides so
    where so.workspace_id = v_lead.workspace_id
      and so.mode = 'block'
      and (
        so.resource_type = 'workspace'
        or (so.resource_type = 'user' and so.resource_user_id = auth.uid())
      )
      and tstzrange(so.starts_at, so.ends_at, '[)') && tstzrange(v_occupied_start, v_occupied_end, '[)')
  ) then raise exception 'The selected estimate time is blocked by a schedule exception.'; end if;

  v_email := nullif(lower(trim(coalesce(v_lead.email, ''))), '');
  v_phone_digits := nullif(regexp_replace(coalesce(v_lead.phone, ''), '[^0-9]', '', 'g'), '');
  v_identity_key := coalesce('e:' || v_email, 'p:' || v_phone_digits, 'lead:' || v_lead.id::text);
  perform pg_advisory_xact_lock(hashtextextended(v_lead.workspace_id::text || ':' || v_identity_key, 0));

  v_customer_id := v_lead.customer_id;
  if v_customer_id is null then
    select c.id into v_customer_id
    from public.customers c
    where c.workspace_id = v_lead.workspace_id
      and c.deleted_at is null
      and (
        (v_email is not null and lower(trim(coalesce(c.email, ''))) = v_email)
        or (v_phone_digits is not null and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_digits)
      )
    order by c.created_at asc
    limit 1;

    if v_customer_id is null then
      insert into public.customers(display_name,email,phone,notes,sms_consent,sms_consent_at,workspace_id)
      values(v_lead.contact_name,v_lead.email,v_lead.phone,nullif(v_lead.message,''),v_lead.sms_consent,
        case when v_lead.sms_consent then v_lead.sms_consent_at else null end,v_lead.workspace_id)
      returning id into v_customer_id;
    end if;
  end if;

  v_property_id := v_lead.property_id;
  if v_property_id is null and nullif(trim(coalesce(v_lead.service_address, '')), '') is not null then
    select p.id into v_property_id
    from public.properties p
    where p.workspace_id = v_lead.workspace_id
      and p.customer_id = v_customer_id
      and p.deleted_at is null
      and lower(regexp_replace(trim(p.address_line_1), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_lead.service_address), '\s+', ' ', 'g'))
    order by p.created_at asc
    limit 1;

    if v_property_id is null then
      insert into public.properties(workspace_id,customer_id,label,address_line_1)
      values(v_lead.workspace_id,v_customer_id,'Service property',trim(v_lead.service_address))
      returning id into v_property_id;
    end if;
  end if;

  insert into public.estimates(workspace_id,customer_id,property_id,lead_id,service_id,estimator_user_id,title,notes,status,scheduled_at)
  values(v_lead.workspace_id,v_customer_id,v_property_id,v_lead.id,v_lead.service_id,auth.uid(),v_title,nullif(v_lead.message,''),'scheduled',p_starts_at)
  returning id into v_estimate_id;

  insert into public.appointments(
    workspace_id,customer_id,property_id,lead_id,service_id,estimate_id,assigned_user_id,
    appointment_type,status,title,notes,starts_at,ends_at,
    travel_buffer_minutes,preparation_buffer_minutes,cleanup_buffer_minutes
  ) values(
    v_lead.workspace_id,v_customer_id,v_property_id,v_lead.id,v_lead.service_id,v_estimate_id,auth.uid(),
    'estimate','confirmed',v_title,nullif(v_lead.message,''),p_starts_at,v_ends_at,
    v_travel,v_prep,v_cleanup
  ) returning id into v_appointment_id;

  update public.leads set customer_id=v_customer_id, property_id=v_property_id, status='estimate_scheduled', updated_at=now() where id=v_lead.id;
  return query select v_customer_id,v_property_id,v_estimate_id,v_appointment_id;
end;
$$;

-- Rebuild job scheduling so service-level travel/prep/cleanup buffers are enforced
-- against blocks, working hours, and GIST overlap constraints.
create or replace function public.schedule_operate_job(
  p_job_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_crew_id uuid default null,
  p_assigned_user_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
  v_appointment_id uuid;
  v_user_id uuid;
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_day smallint;
  v_ends_at timestamptz;
  v_occupied_start timestamptz;
  v_occupied_end timestamptz;
  v_special_open boolean := false;
  v_travel integer := 0;
  v_prep integer := 0;
  v_cleanup integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_duration_minutes < 15 or p_duration_minutes > 1440 then raise exception 'Job duration must be between 15 and 1440 minutes.'; end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then raise exception 'Job not found.'; end if;
  if not public.is_workspace_member(v_job.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_job.status in ('completed','canceled') then raise exception 'This job cannot be scheduled.'; end if;

  v_user_id := coalesce(p_assigned_user_id, v_job.assigned_owner_user_id, auth.uid());
  v_ends_at := p_starts_at + make_interval(mins => p_duration_minutes);

  if v_job.service_id is not null then
    select coalesce(s.travel_buffer_minutes,0), coalesce(s.preparation_buffer_minutes,0), coalesce(s.cleanup_buffer_minutes,0)
    into v_travel, v_prep, v_cleanup
    from public.services s
    where s.id = v_job.service_id and s.workspace_id = v_job.workspace_id;
  end if;
  v_occupied_start := p_starts_at - make_interval(mins => v_travel + v_prep);
  v_occupied_end := v_ends_at + make_interval(mins => v_cleanup);

  if p_crew_id is not null and not exists (
    select 1 from public.crews c where c.id = p_crew_id and c.workspace_id = v_job.workspace_id and c.active
  ) then raise exception 'Crew not found or inactive.'; end if;

  if not exists (
    select 1 from public.workspace_members wm where wm.workspace_id = v_job.workspace_id and wm.user_id = v_user_id
  ) then raise exception 'Assigned user is not a workspace member.'; end if;

  if exists (
    select 1 from public.schedule_overrides so
    where so.workspace_id = v_job.workspace_id
      and so.mode = 'block'
      and (
        so.resource_type = 'workspace'
        or (so.resource_type = 'crew' and p_crew_id is not null and so.resource_crew_id = p_crew_id)
        or (so.resource_type = 'user' and so.resource_user_id = v_user_id)
      )
      and tstzrange(so.starts_at, so.ends_at, '[)') && tstzrange(v_occupied_start, v_occupied_end, '[)')
  ) then raise exception 'The selected time is blocked by a schedule exception.'; end if;

  select exists (
    select 1 from public.schedule_overrides so
    where so.workspace_id = v_job.workspace_id
      and so.mode = 'open'
      and (
        so.resource_type = 'workspace'
        or (so.resource_type = 'crew' and p_crew_id is not null and so.resource_crew_id = p_crew_id)
        or (so.resource_type = 'user' and so.resource_user_id = v_user_id)
      )
      and so.starts_at <= v_occupied_start
      and so.ends_at >= v_occupied_end
  ) into v_special_open;

  select w.timezone into v_timezone from public.workspaces w where w.id = v_job.workspace_id;

  if not v_special_open
     and p_crew_id is not null
     and v_timezone is not null
     and exists (
       select 1 from public.availability_rules ar
       where ar.workspace_id = v_job.workspace_id and ar.resource_type = 'crew'
         and ar.resource_crew_id = p_crew_id and ar.active
     ) then
    if not exists (select 1 from pg_timezone_names where name = v_timezone) then raise exception 'Business timezone is invalid.'; end if;

    v_local_start := v_occupied_start at time zone v_timezone;
    v_local_end := v_occupied_end at time zone v_timezone;
    v_day := extract(dow from v_local_start)::smallint;

    if v_local_start::date <> v_local_end::date then raise exception 'This job including travel/setup/cleanup extends past midnight and does not fit crew working hours.'; end if;

    if not exists (
      select 1 from public.availability_rules ar
      where ar.workspace_id = v_job.workspace_id
        and ar.resource_type = 'crew'
        and ar.resource_crew_id = p_crew_id
        and ar.active
        and ar.day_of_week = v_day
        and (ar.effective_from is null or ar.effective_from <= v_local_start::date)
        and (ar.effective_until is null or ar.effective_until >= v_local_start::date)
        and v_local_start::time >= ar.starts_at_local
        and v_local_end::time <= ar.ends_at_local
    ) then raise exception 'The selected time including travel/setup/cleanup falls outside this crew''s configured working hours.'; end if;
  end if;

  update public.jobs
  set assigned_crew_id = p_crew_id,
      assigned_owner_user_id = v_user_id,
      planned_start_at = p_starts_at,
      planned_end_at = v_ends_at,
      status = 'scheduled'
  where id = v_job.id;

  select a.id into v_appointment_id
  from public.appointments a
  where a.workspace_id = v_job.workspace_id and a.job_id = v_job.id and a.status <> 'canceled'
  order by a.created_at asc limit 1;

  if v_appointment_id is null then
    insert into public.appointments(
      workspace_id,customer_id,property_id,lead_id,service_id,job_id,
      assigned_user_id,assigned_crew_id,appointment_type,status,title,notes,
      starts_at,ends_at,travel_buffer_minutes,preparation_buffer_minutes,cleanup_buffer_minutes
    ) values(
      v_job.workspace_id,v_job.customer_id,v_job.property_id,v_job.lead_id,v_job.service_id,v_job.id,
      v_user_id,p_crew_id,'job','confirmed',v_job.title,v_job.description,
      p_starts_at,v_ends_at,v_travel,v_prep,v_cleanup
    ) returning id into v_appointment_id;
  else
    update public.appointments
    set assigned_user_id = v_user_id,
        assigned_crew_id = p_crew_id,
        status = 'confirmed',
        title = v_job.title,
        notes = v_job.description,
        starts_at = p_starts_at,
        ends_at = v_ends_at,
        travel_buffer_minutes = v_travel,
        preparation_buffer_minutes = v_prep,
        cleanup_buffer_minutes = v_cleanup
    where id = v_appointment_id;
  end if;

  return v_appointment_id;
end;
$$;

revoke all on function public.schedule_operate_job(uuid,timestamptz,integer,uuid,uuid) from public, anon;
grant execute on function public.schedule_operate_job(uuid,timestamptz,integer,uuid,uuid) to authenticated;
