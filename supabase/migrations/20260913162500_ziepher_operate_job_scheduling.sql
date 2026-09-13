-- Schedule an accepted-estimate job with an optional crew and conflict-safe appointment.

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
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_duration_minutes < 15 or p_duration_minutes > 1440 then
    raise exception 'Job duration must be between 15 and 1440 minutes.';
  end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then raise exception 'Job not found.'; end if;
  if not public.is_workspace_member(v_job.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_job.status in ('completed','canceled') then raise exception 'This job cannot be scheduled.'; end if;

  v_user_id := coalesce(p_assigned_user_id, v_job.assigned_owner_user_id, auth.uid());

  if p_crew_id is not null and not exists (
    select 1 from public.crews c
    where c.id = p_crew_id and c.workspace_id = v_job.workspace_id and c.active
  ) then raise exception 'Crew not found or inactive.'; end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = v_job.workspace_id and wm.user_id = v_user_id
  ) then raise exception 'Assigned user is not a workspace member.'; end if;

  update public.jobs
  set assigned_crew_id = p_crew_id,
      assigned_owner_user_id = v_user_id,
      planned_start_at = p_starts_at,
      planned_end_at = p_starts_at + make_interval(mins => p_duration_minutes),
      status = 'scheduled'
  where id = v_job.id;

  select a.id into v_appointment_id
  from public.appointments a
  where a.workspace_id = v_job.workspace_id and a.job_id = v_job.id and a.status <> 'canceled'
  order by a.created_at asc limit 1;

  if v_appointment_id is null then
    insert into public.appointments(
      workspace_id, customer_id, property_id, lead_id, service_id, job_id,
      assigned_user_id, assigned_crew_id, appointment_type, status, title, notes,
      starts_at, ends_at
    ) values (
      v_job.workspace_id, v_job.customer_id, v_job.property_id, v_job.lead_id, v_job.service_id, v_job.id,
      v_user_id, p_crew_id, 'job', 'confirmed', v_job.title, v_job.description,
      p_starts_at, p_starts_at + make_interval(mins => p_duration_minutes)
    ) returning id into v_appointment_id;
  else
    update public.appointments
    set assigned_user_id = v_user_id,
        assigned_crew_id = p_crew_id,
        status = 'confirmed',
        title = v_job.title,
        notes = v_job.description,
        starts_at = p_starts_at,
        ends_at = p_starts_at + make_interval(mins => p_duration_minutes)
    where id = v_appointment_id;
  end if;

  return v_appointment_id;
end;
$$;

grant execute on function public.schedule_operate_job(uuid,timestamptz,integer,uuid,uuid) to authenticated;
revoke all on function public.schedule_operate_job(uuid,timestamptz,integer,uuid,uuid) from anon;
