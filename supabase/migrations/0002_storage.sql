insert into storage.buckets (id, name, public)
values
  ('project-artifacts', 'project-artifacts', false),
  ('visual-concepts', 'visual-concepts', false)
on conflict (id) do nothing;

create policy "project_artifact_read"
on storage.objects for select
using (
  bucket_id = 'project-artifacts'
  and public.is_project_member((storage.foldername(name))[1]::uuid)
);

create policy "visual_concept_read"
on storage.objects for select
using (
  bucket_id = 'visual-concepts'
  and public.is_project_member((storage.foldername(name))[1]::uuid)
);

-- Writes should be performed by trusted server workers using the service role.
