create index if not exists operate_estimate_media_estimate_workspace_idx
  on public.operate_estimate_media(estimate_id, workspace_id);

create index if not exists operate_estimate_media_property_workspace_idx
  on public.operate_estimate_media(property_id, workspace_id)
  where property_id is not null;

drop policy if exists "Workspace members can add estimate media" on public.operate_estimate_media;
create policy "Workspace members can add estimate media"
on public.operate_estimate_media for insert to authenticated
with check (public.is_workspace_member(workspace_id) and uploaded_by = (select auth.uid()));
