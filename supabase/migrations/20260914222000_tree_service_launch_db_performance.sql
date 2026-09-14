-- Launch-focused Tree Service database performance hardening.
-- Keep the scope narrow: index the hottest cross-tenant workflow foreign keys and
-- remove per-row auth.uid() recomputation from the policies flagged by the advisor.

create index if not exists leads_project_workspace_fk_idx
  on public.leads (project_id, workspace_id);
create index if not exists estimates_lead_workspace_fk_idx
  on public.estimates (lead_id, workspace_id);
create index if not exists appointments_estimate_workspace_fk_idx
  on public.appointments (estimate_id, workspace_id);
create index if not exists jobs_estimate_workspace_fk_idx
  on public.jobs (estimate_id, workspace_id);
create index if not exists invoices_job_workspace_fk_idx
  on public.invoices (job_id, workspace_id);
create index if not exists payment_transactions_invoice_workspace_fk_idx
  on public.payment_transactions (invoice_id, workspace_id);
create index if not exists operate_review_requests_job_workspace_fk_idx
  on public.operate_review_requests (job_id, workspace_id);

alter policy "Workspace admins can manage services"
on public.services
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = services.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = services.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace admins can manage crews"
on public.crews
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = crews.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = crews.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace admins can manage crew membership"
on public.crew_members
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = crew_members.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = crew_members.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace admins can manage availability rules"
on public.availability_rules
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = availability_rules.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = availability_rules.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace admins can manage business profile"
on public.workspace_business_profiles
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = workspace_business_profiles.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = workspace_business_profiles.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace admins can manage schedule overrides"
on public.schedule_overrides
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = schedule_overrides.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = schedule_overrides.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace admins can manage marketing spend"
on public.marketing_source_spend
using (
  exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = marketing_source_spend.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id
     and wm.user_id = (select auth.uid())
    where w.id = marketing_source_spend.workspace_id
      and (w.owner_id = (select auth.uid()) or wm.role in ('owner', 'admin'))
  )
);

alter policy "Workspace members can create estimate share links"
on public.operate_estimate_share_links
with check (
  public.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

alter policy "Workspace members can add job media"
on public.operate_job_media
with check (
  public.is_workspace_member(workspace_id)
  and uploaded_by = (select auth.uid())
);

alter policy "Workspace members can create review request drafts"
on public.operate_review_requests
with check (
  public.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);
