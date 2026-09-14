create or replace function public.set_project_scan_state(
  p_project_id uuid,
  p_scan_status text,
  p_last_scanned_at timestamptz default null,
  p_website_health jsonb default null
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  if p_scan_status not in ('pending', 'scanning', 'complete', 'failed', 'not_scanned') then
    raise exception 'Invalid scan status';
  end if;

  update public.projects
  set scan_status = p_scan_status,
      last_scanned_at = case
        when p_scan_status = 'complete' then coalesce(p_last_scanned_at, now())
        else last_scanned_at
      end,
      website_health = case
        when p_scan_status = 'complete' then p_website_health
        else website_health
      end,
      updated_at = now()
  where id = p_project_id
  returning * into v_project;

  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  return v_project;
end;
$$;

revoke all on function public.set_project_scan_state(uuid, text, timestamptz, jsonb)
from public, anon;
grant execute on function public.set_project_scan_state(uuid, text, timestamptz, jsonb)
to authenticated, service_role;
