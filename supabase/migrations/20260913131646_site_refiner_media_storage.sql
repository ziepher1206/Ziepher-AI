insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "site_media_select_project_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_project_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "site_media_insert_project_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_project_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "site_media_update_project_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_project_member(((storage.foldername(name))[1])::uuid)
    else false
  end
)
with check (
  bucket_id = 'site-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_project_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "site_media_delete_project_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then public.is_project_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);
