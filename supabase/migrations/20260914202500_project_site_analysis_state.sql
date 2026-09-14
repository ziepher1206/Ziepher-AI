create or replace function public.set_project_site_analysis(
  p_project_id uuid,
  p_analysis jsonb,
  p_provider text,
  p_model text
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
    raise exception 'Authentication required.';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception 'Project not found.';
  end if;

  if not public.is_workspace_member(v_project.workspace_id) then
    raise exception 'Workspace access required.';
  end if;

  if p_analysis is null or jsonb_typeof(p_analysis) <> 'object' then
    raise exception 'Site analysis must be a JSON object.';
  end if;

  update public.projects
  set website_health = coalesce(website_health, '{}'::jsonb) || jsonb_build_object(
        'deepAnalysis', p_analysis,
        'deepAnalysisProvider', nullif(trim(p_provider), ''),
        'deepAnalysisModel', nullif(trim(p_model), ''),
        'deepAnalyzedAt', now()
      ),
      updated_at = now()
  where id = p_project_id
  returning * into v_project;

  return v_project;
end;
$$;

revoke all on function public.set_project_site_analysis(uuid, jsonb, text, text) from public, anon;
grant execute on function public.set_project_site_analysis(uuid, jsonb, text, text) to authenticated;
