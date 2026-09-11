-- Make validated build publication retry-safe and hand off to source control
-- transactionally. The AI/build worker publishes once; GitHub side effects are
-- handled later from the durable source_control_runs ledger.

create unique index if not exists artifacts_build_primary_output_uidx
  on public.artifacts(build_job_id, artifact_type)
  where build_job_id is not null
    and artifact_type in ('source_archive', 'preview');

create unique index if not exists source_control_runs_build_job_uidx
  on public.source_control_runs(build_job_id)
  where build_job_id is not null;

create or replace function public.publish_build_artifacts(
  p_project_id uuid,
  p_build_job_id uuid,
  p_source_path text,
  p_source_sha256 text,
  p_preview_path text,
  p_preview_sha256 text,
  p_summary text,
  p_created_by uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version integer;
  v_existing_version_text text;
  v_repository_full_name text;
  v_repository_default_branch text;
  v_working_branch text;
begin
  -- Serialize publication for a project so concurrent/retried workers cannot
  -- allocate the same or multiple versions for one validated build.
  select
    current_version,
    repository_full_name,
    repository_default_branch
  into
    v_version,
    v_repository_full_name,
    v_repository_default_branch
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if not exists (
    select 1
    from public.build_jobs
    where id = p_build_job_id
      and project_id = p_project_id
  ) then
    raise exception 'Build job does not belong to project';
  end if;

  -- A reclaimed worker may reach this checkpoint again. The source archive is
  -- the authoritative marker that this build was already published.
  select metadata ->> 'version'
  into v_existing_version_text
  from public.artifacts
  where project_id = p_project_id
    and build_job_id = p_build_job_id
    and artifact_type = 'source_archive'
  limit 1;

  if v_existing_version_text is not null then
    if v_existing_version_text !~ '^[1-9][0-9]*$' then
      raise exception 'Published build has invalid version metadata';
    end if;
    return v_existing_version_text::integer;
  end if;

  v_version := v_version + 1;

  insert into public.project_versions (
    project_id,
    version,
    source_snapshot_path,
    summary,
    created_by
  )
  values (
    p_project_id,
    v_version,
    p_source_path,
    p_summary,
    p_created_by
  );

  insert into public.artifacts (
    project_id,
    build_job_id,
    artifact_type,
    storage_path,
    sha256,
    metadata
  )
  values
    (
      p_project_id,
      p_build_job_id,
      'source_archive',
      p_source_path,
      p_source_sha256,
      jsonb_build_object('version', v_version)
    ),
    (
      p_project_id,
      p_build_job_id,
      'preview',
      p_preview_path,
      p_preview_sha256,
      jsonb_build_object('version', v_version, 'content_type', 'text/html')
    );

  update public.projects
  set current_version = v_version,
      preview_artifact_path = p_preview_path,
      preview_url = '/api/projects/' || p_project_id::text || '/preview'
  where id = p_project_id;

  -- Snapshot repository identity at publication time. A later project rebind
  -- must not redirect an already-built artifact to a different repository.
  if v_repository_full_name is not null
     and v_repository_default_branch is not null then
    v_working_branch :=
      'ziepher/' ||
      left(regexp_replace(lower(p_project_id::text), '[^a-z0-9]+', '', 'g'), 12) ||
      '/' ||
      left(regexp_replace(lower(p_build_job_id::text), '[^a-z0-9]+', '', 'g'), 12);

    insert into public.source_control_runs (
      project_id,
      build_job_id,
      repository_full_name,
      base_branch,
      working_branch,
      stage
    )
    values (
      p_project_id,
      p_build_job_id,
      v_repository_full_name,
      v_repository_default_branch,
      v_working_branch,
      'queued'
    )
    on conflict (build_job_id) where build_job_id is not null do nothing;
  end if;

  return v_version;
end;
$$;

revoke all on function public.publish_build_artifacts(
  uuid, uuid, text, text, text, text, text, uuid
) from public, anon, authenticated;

grant execute on function public.publish_build_artifacts(
  uuid, uuid, text, text, text, text, text, uuid
) to service_role;
