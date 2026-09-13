-- Ensure operational records cannot link a lead in one workspace to a project
-- owned by another workspace.
-- The (id, workspace_id) uniqueness constraint already exists from the earlier
-- workspace/project integrity migration, so do not recreate it here.

alter table public.leads
  drop constraint leads_project_id_fkey;

alter table public.leads
  add constraint leads_project_workspace_fk
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete restrict;
