-- Ensure operational records cannot link a lead in one workspace to a project
-- owned by another workspace.
-- `projects(id, workspace_id)` is already unique in the active Ziepher schema.

alter table public.leads
  drop constraint if exists leads_project_id_fkey;

alter table public.leads
  drop constraint if exists leads_project_workspace_fk;

alter table public.leads
  add constraint leads_project_workspace_fk
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete restrict;
