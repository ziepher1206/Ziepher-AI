-- Persistent project workflow and production build orchestration.
-- Apply after 0001_core.sql and 0002_storage.sql.

alter table public.projects
  add column if not exists preview_artifact_path text,
  add column if not exists active_spec_version_id uuid
    references public.app_spec_versions(id) on delete set null;

alter table public.build_jobs
  add column if not exists worker_id text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists model_provider text,
  add column if not exists model_name text;

create index if not exists build_jobs_claim_idx
  on public.build_jobs(status, created_at)
  where status = 'queued';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists credit_accounts_set_updated_at on public.credit_accounts;
create trigger credit_accounts_set_updated_at
  before update on public.credit_accounts
  for each row execute function public.set_updated_at();

create or replace function public.ensure_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_email text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select w.id into v_workspace_id
  from public.workspaces w
  where w.owner_id = v_user_id
  order by w.created_at
  limit 1;

  if v_workspace_id is not null then
    return v_workspace_id;
  end if;

  select email into v_email from auth.users where id = v_user_id;
  v_slug := 'personal-' || replace(v_user_id::text, '-', '');

  insert into public.workspaces (name, slug, owner_id)
  values (
    coalesce(nullif(split_part(v_email, '@', 1), ''), 'My') || ' workspace',
    v_slug,
    v_user_id
  )
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner')
  on conflict do nothing;

  insert into public.credit_accounts (workspace_id, balance, reserved)
  values (v_workspace_id, 100, 0)
  on conflict do nothing;

  insert into public.credit_ledger (
    workspace_id,
    kind,
    amount,
    balance_after,
    reason,
    idempotency_key
  )
  values (
    v_workspace_id,
    'grant',
    100,
    100,
    'Initial builder credit grant',
    'initial-grant:' || v_workspace_id::text
  )
  on conflict do nothing;

  return v_workspace_id;
end;
$$;

create or replace function public.create_project_with_workspace(
  p_name text,
  p_idea text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_project public.projects;
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

  v_workspace_id := public.ensure_personal_workspace();

  insert into public.projects (
    workspace_id,
    owner_id,
    name,
    original_idea,
    status
  )
  values (
    v_workspace_id,
    auth.uid(),
    trim(p_name),
    trim(p_idea),
    'planning'
  )
  returning * into v_project;

  insert into public.conversations (project_id, created_by, title)
  values (v_project.id, auth.uid(), 'Project planning');

  return v_project;
end;
$$;

create or replace function public.save_project_plan(
  p_project_id uuid,
  p_idea text,
  p_plan jsonb,
  p_provider text,
  p_model text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_version integer;
  v_spec_id uuid;
  v_visual jsonb;
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  select id into v_conversation_id
  from public.conversations
  where project_id = p_project_id
  order by created_at
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (project_id, created_by, title)
    values (p_project_id, auth.uid(), 'Project planning')
    returning id into v_conversation_id;
  end if;

  insert into public.messages (
    conversation_id,
    sender,
    content,
    input_mode,
    charged_build_credits
  )
  values (
    v_conversation_id,
    'user',
    trim(p_idea),
    'text',
    0
  );

  insert into public.messages (
    conversation_id,
    sender,
    content,
    input_mode,
    model_provider,
    model_name,
    charged_build_credits
  )
  values (
    v_conversation_id,
    'assistant',
    coalesce(p_plan ->> 'summary', 'Application plan created.'),
    'system',
    p_provider,
    p_model,
    0
  );

  select coalesce(max(version), 0) + 1 into v_version
  from public.app_spec_versions
  where project_id = p_project_id;

  insert into public.app_spec_versions (
    project_id,
    version,
    spec,
    created_by
  )
  values (
    p_project_id,
    v_version,
    p_plan,
    auth.uid()
  )
  returning id into v_spec_id;

  for v_visual in
    select value
    from jsonb_array_elements(coalesce(p_plan -> 'visualDirections', '[]'::jsonb))
  loop
    insert into public.visual_concepts (
      project_id,
      spec_version_id,
      name,
      description,
      tokens,
      selected
    )
    values (
      p_project_id,
      v_spec_id,
      coalesce(v_visual ->> 'name', 'Visual concept'),
      coalesce(v_visual ->> 'description', ''),
      jsonb_build_object('source_id', coalesce(v_visual ->> 'id', 'concept')),
      false
    );
  end loop;

  update public.projects
  set original_idea = trim(p_idea),
      active_spec_version_id = v_spec_id,
      status = 'planning'
  where id = p_project_id;

  return v_spec_id;
end;
$$;

create or replace function public.select_visual_concept(
  p_project_id uuid,
  p_visual_concept_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  if not exists (
    select 1
    from public.visual_concepts
    where id = p_visual_concept_id
      and project_id = p_project_id
  ) then
    raise exception 'Visual concept not found';
  end if;

  update public.visual_concepts
  set selected = (id = p_visual_concept_id)
  where project_id = p_project_id;

  update public.projects
  set selected_visual_concept_id = p_visual_concept_id
  where id = p_project_id;
end;
$$;

create or replace function public.approve_project_spec(
  p_project_id uuid,
  p_spec_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Project access denied';
  end if;

  update public.app_spec_versions
  set approved_at = now()
  where id = p_spec_version_id
    and project_id = p_project_id;

  if not found then
    raise exception 'Specification not found';
  end if;

  update public.projects
  set active_spec_version_id = p_spec_version_id,
      status = 'ready_to_build'
  where id = p_project_id;
end;
$$;

create or replace function public.claim_next_build_job(
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns public.build_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.build_jobs;
begin
  select * into v_job
  from public.build_jobs
  where status = 'queued'
     or (
       status in ('planning', 'generating', 'installing', 'building', 'testing', 'repairing')
       and lease_expires_at < now()
     )
  order by created_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.build_jobs
  set status = 'planning',
      worker_id = p_worker_id,
      runner_provider = 'ziepher-worker',
      started_at = coalesce(started_at, now()),
      heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60))
  where id = v_job.id
  returning * into v_job;

  update public.projects
  set status = 'building'
  where id = v_job.project_id;

  return v_job;
end;
$$;

create or replace function public.heartbeat_build_job(
  p_build_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.build_jobs
  set heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60))
  where id = p_build_job_id
    and worker_id = p_worker_id
    and status not in ('completed', 'failed', 'cancelled');

  if not found then
    raise exception 'Build lease not found';
  end if;
end;
$$;

create or replace function public.complete_build_job_worker(
  p_build_job_id uuid,
  p_worker_id text,
  p_success boolean,
  p_final_credits integer,
  p_provider text,
  p_model text,
  p_failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id
  from public.build_jobs
  where id = p_build_job_id
    and worker_id = p_worker_id;

  if v_project_id is null then
    raise exception 'Build lease not found';
  end if;

  update public.build_jobs
  set model_provider = p_provider,
      model_name = p_model
  where id = p_build_job_id;

  perform public.finalize_build_job(
    p_build_job_id,
    p_success,
    p_final_credits,
    p_failure_message
  );

  update public.projects
  set status = case when p_success then 'ready_to_deploy' else 'ready_to_build' end
  where id = v_project_id;
end;
$$;

create policy "projects_delete_owner"
on public.projects for delete
using (owner_id = auth.uid());

revoke all on function public.claim_next_build_job(text, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_build_job(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_build_job_worker(uuid, text, boolean, integer, text, text, text) from public, anon, authenticated;

grant execute on function public.claim_next_build_job(text, integer) to service_role;
grant execute on function public.heartbeat_build_job(uuid, text, integer) to service_role;
grant execute on function public.complete_build_job_worker(uuid, text, boolean, integer, text, text, text) to service_role;


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
begin
  select current_version + 1 into v_version
  from public.projects
  where id = p_project_id
  for update;

  if v_version is null then
    raise exception 'Project not found';
  end if;

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

  return v_version;
end;
$$;

revoke all on function public.publish_build_artifacts(uuid, uuid, text, text, text, text, text, uuid)
from public, anon, authenticated;
grant execute on function public.publish_build_artifacts(uuid, uuid, text, text, text, text, text, uuid)
to service_role;
