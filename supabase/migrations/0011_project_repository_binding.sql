-- Persist the normalized GitHub repository binding used by Ziepher's guarded
-- source-control lifecycle. repository_url remains for backward compatibility
-- with the original prototype; new source-control code uses these fields.

alter table public.projects
  add column if not exists repository_full_name text,
  add column if not exists repository_default_branch text;

alter table public.projects
  add constraint projects_repository_full_name_check
    check (
      repository_full_name is null or
      repository_full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
    ),
  add constraint projects_repository_default_branch_check
    check (
      repository_default_branch is null or
      char_length(repository_default_branch) between 1 and 255
    );

create index if not exists projects_repository_full_name_idx
  on public.projects(repository_full_name)
  where repository_full_name is not null;
