create or replace function public.sync_site_change_request_from_source_control()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.build_job_id is null then
    return new;
  end if;

  update public.site_change_requests
  set source_control_run_id = new.id,
      status = case new.stage
        when 'preview_ready' then 'preview_ready'
        when 'approved' then 'approved'
        when 'merged' then 'publishing'
        when 'production_verified' then 'published'
        when 'blocked' then 'failed'
        when 'failed' then 'failed'
        else 'qa_pending'
      end,
      preview_url = coalesce(new.preview_url, preview_url),
      published_at = case
        when new.stage = 'production_verified' then coalesce(published_at, now())
        else published_at
      end,
      change_metadata = change_metadata || jsonb_build_object(
        'source_control_stage', new.stage,
        'source_control_revision', new.revision,
        'source_control_updated_at', new.updated_at
      )
  where build_job_id = new.build_job_id;

  return new;
end;
$$;

revoke all on function public.sync_site_change_request_from_source_control() from public, anon, authenticated;
grant execute on function public.sync_site_change_request_from_source_control() to service_role;

drop trigger if exists source_control_sync_site_change_request on public.source_control_runs;
create trigger source_control_sync_site_change_request
  after insert or update of stage, preview_url, revision on public.source_control_runs
  for each row execute function public.sync_site_change_request_from_source_control();