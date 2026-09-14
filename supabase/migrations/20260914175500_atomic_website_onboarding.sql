create or replace function public.create_website_project_with_workspace(
  p_name text,
  p_idea text,
  p_business_name text,
  p_domain text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_project public.projects;
  v_business_name text;
  v_domain text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(p_name)) not between 2 and 100 then
    raise exception 'Project name must be between 2 and 100 characters';
  end if;

  if char_length(trim(p_idea)) not between 10 and 12000 then
    raise exception 'Project idea must be between 10 and 12000 characters';
  end if;

  v_business_name := coalesce(nullif(trim(p_business_name), ''), trim(p_name));
  if char_length(v_business_name) not between 2 and 160 then
    raise exception 'Business name must be between 2 and 160 characters';
  end if;

  v_domain := lower(trim(p_domain));
  if v_domain = '' or v_domain !~ '^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?$' then
    raise exception 'Invalid website domain';
  end if;

  v_workspace_id := public.ensure_personal_workspace();

  insert into public.projects (
    workspace_id,
    owner_id,
    name,
    original_idea,
    status,
    business_name,
    source_domain,
    primary_domain,
    website_connection_mode,
    scan_status
  )
  values (
    v_workspace_id,
    auth.uid(),
    trim(p_name),
    trim(p_idea),
    'planning',
    v_business_name,
    v_domain,
    v_domain,
    'public_import',
    'pending'
  )
  returning * into v_project;

  insert into public.conversations (project_id, created_by, title)
  values (v_project.id, auth.uid(), 'Project planning');

  return v_project;
end;
$$;

revoke all on function public.create_website_project_with_workspace(text, text, text, text)
from public, anon;
grant execute on function public.create_website_project_with_workspace(text, text, text, text)
to authenticated, service_role;
