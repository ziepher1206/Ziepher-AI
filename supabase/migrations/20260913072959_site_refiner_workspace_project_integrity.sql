alter table public.projects
  add constraint projects_id_workspace_unique unique (id, workspace_id);

alter table public.media_assets
  add constraint media_assets_project_workspace_fk
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete cascade;

alter table public.marketing_campaigns
  add constraint marketing_campaigns_project_workspace_fk
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete cascade;

alter table public.project_cost_events
  add constraint project_cost_events_project_workspace_fk
  foreign key (project_id, workspace_id)
  references public.projects(id, workspace_id)
  on delete cascade;
