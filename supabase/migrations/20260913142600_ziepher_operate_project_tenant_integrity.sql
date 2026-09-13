-- Ensure operational records cannot link a lead in one workspace to a project
-- owned by another workspace.

alter table public.projects
  add constraint projects_id_workspace_unique unique (id, workspace_id);

alter table public.leads
  drop constraint leads_project_id_fkey;

alter table public.leads
  add constraint leads_project_workspace_fk
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete set null;
