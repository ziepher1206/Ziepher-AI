insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operate-media',
  'operate-media',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.operate_job_media (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  job_id uuid not null,
  property_id uuid,
  uploaded_by uuid references auth.users(id) on delete set null,
  category text not null default 'general' check (category in ('before','after','general')),
  storage_bucket text not null default 'operate-media' check (storage_bucket = 'operate-media'),
  storage_path text not null,
  display_name text not null,
  mime_type text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  constraint operate_job_media_job_workspace_fk
    foreign key (job_id, workspace_id)
    references public.jobs(id, workspace_id)
    on delete cascade,
  constraint operate_job_media_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict
);

create index if not exists operate_job_media_job_created_idx
  on public.operate_job_media (workspace_id, job_id, created_at desc);

create trigger operate_job_media_set_updated_at
before update on public.operate_job_media
for each row execute function public.set_updated_at();

alter table public.operate_job_media enable row level security;

create policy "Workspace members can read job media"
on public.operate_job_media for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can add job media"
on public.operate_job_media for insert to authenticated
with check (public.is_workspace_member(workspace_id) and uploaded_by = auth.uid());

create policy "Workspace members can update job media"
on public.operate_job_media for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Workspace members can delete job media"
on public.operate_job_media for delete to authenticated
using (public.is_workspace_member(workspace_id));

create policy "operate_media_select_workspace_member"
on storage.objects for select to authenticated
using (
  bucket_id = 'operate-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "operate_media_insert_workspace_member"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'operate-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "operate_media_update_workspace_member"
on storage.objects for update to authenticated
using (
  bucket_id = 'operate-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    else false
  end
)
with check (
  bucket_id = 'operate-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "operate_media_delete_workspace_member"
on storage.objects for delete to authenticated
using (
  bucket_id = 'operate-media'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    else false
  end
);
