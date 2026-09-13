create table if not exists public.operate_estimate_share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  estimate_id uuid not null,
  token uuid not null default gen_random_uuid() unique,
  created_by uuid not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operate_estimate_share_links_estimate_workspace_fk
    foreign key (estimate_id, workspace_id)
    references public.estimates(id, workspace_id)
    on delete cascade,
  constraint operate_estimate_share_links_creator_workspace_fk
    foreign key (workspace_id, created_by)
    references public.workspace_members(workspace_id, user_id)
    on delete restrict
);

create index if not exists operate_estimate_share_links_estimate_idx
  on public.operate_estimate_share_links (workspace_id, estimate_id, created_at desc);

create trigger operate_estimate_share_links_set_updated_at
before update on public.operate_estimate_share_links
for each row execute function public.set_updated_at();

alter table public.operate_estimate_share_links enable row level security;

create policy "Workspace members can read estimate share links"
on public.operate_estimate_share_links for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace members can create estimate share links"
on public.operate_estimate_share_links for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "Workspace members can revoke estimate share links"
on public.operate_estimate_share_links for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create or replace function public.create_operate_estimate_share_link(p_estimate_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_estimate public.estimates%rowtype;
  v_token uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select * into v_estimate from public.estimates where id = p_estimate_id;
  if not found then raise exception 'Estimate not found.'; end if;
  if not public.is_workspace_member(v_estimate.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_estimate.total_cents <= 0 then raise exception 'Add priced line items before creating an approval link.'; end if;
  if v_estimate.status in ('accepted','declined','expired','canceled') then raise exception 'This estimate can no longer be shared for approval.'; end if;

  update public.operate_estimate_share_links
    set revoked_at = now()
    where workspace_id = v_estimate.workspace_id
      and estimate_id = v_estimate.id
      and revoked_at is null
      and accepted_at is null;

  insert into public.operate_estimate_share_links(workspace_id,estimate_id,created_by)
  values(v_estimate.workspace_id,v_estimate.id,auth.uid())
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.create_operate_estimate_share_link(uuid) from public, anon;
grant execute on function public.create_operate_estimate_share_link(uuid) to authenticated;

create or replace function public.get_public_operate_estimate(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.operate_estimate_share_links%rowtype;
  v_estimate public.estimates%rowtype;
  v_payload jsonb;
begin
  select * into v_link
  from public.operate_estimate_share_links
  where token = p_token
    and revoked_at is null
    and expires_at > now();
  if not found then raise exception 'Approval link is invalid or expired.'; end if;

  select * into v_estimate from public.estimates where id = v_link.estimate_id and workspace_id = v_link.workspace_id;
  if not found then raise exception 'Estimate not found.'; end if;

  select jsonb_build_object(
    'estimateId', v_estimate.id,
    'title', v_estimate.title,
    'notes', v_estimate.notes,
    'status', v_estimate.status,
    'subtotalCents', v_estimate.subtotal_cents,
    'taxCents', v_estimate.tax_cents,
    'discountCents', v_estimate.discount_cents,
    'totalCents', v_estimate.total_cents,
    'validUntil', v_estimate.valid_until,
    'expiresAt', v_link.expires_at,
    'acceptedAt', v_estimate.accepted_at,
    'customerName', c.display_name,
    'propertyAddress', concat_ws(', ', p.address_line_1, p.city, p.region, p.postal_code),
    'businessName', coalesce(bp.business_name, w.name),
    'businessPhone', bp.phone,
    'businessEmail', bp.email,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', li.description,
        'quantity', li.quantity,
        'unitPriceCents', li.unit_price_cents,
        'lineTotalCents', li.line_total_cents
      ) order by li.position)
      from public.estimate_line_items li
      where li.estimate_id = v_estimate.id and li.workspace_id = v_estimate.workspace_id
    ), '[]'::jsonb)
  ) into v_payload
  from public.customers c
  left join public.properties p on p.id = v_estimate.property_id and p.workspace_id = v_estimate.workspace_id
  join public.workspaces w on w.id = v_estimate.workspace_id
  left join public.workspace_business_profiles bp on bp.workspace_id = v_estimate.workspace_id
  where c.id = v_estimate.customer_id and c.workspace_id = v_estimate.workspace_id;

  return v_payload;
end;
$$;

revoke all on function public.get_public_operate_estimate(uuid) from public, authenticated;
grant execute on function public.get_public_operate_estimate(uuid) to anon;

create or replace function public.accept_public_operate_estimate(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.operate_estimate_share_links%rowtype;
  v_estimate public.estimates%rowtype;
  v_job_id uuid;
  v_address text;
  v_owner_id uuid;
begin
  select * into v_link
  from public.operate_estimate_share_links
  where token = p_token
    and revoked_at is null
    and expires_at > now()
  for update;
  if not found then raise exception 'Approval link is invalid or expired.'; end if;

  select * into v_estimate
  from public.estimates
  where id = v_link.estimate_id and workspace_id = v_link.workspace_id
  for update;
  if not found then raise exception 'Estimate not found.'; end if;
  if v_estimate.total_cents <= 0 then raise exception 'This estimate is not ready for approval.'; end if;
  if v_estimate.valid_until is not null and v_estimate.valid_until < current_date then raise exception 'This estimate has expired.'; end if;
  if v_estimate.status in ('declined','expired','canceled') then raise exception 'This estimate can no longer be accepted.'; end if;

  select j.id into v_job_id from public.jobs j
  where j.workspace_id = v_estimate.workspace_id and j.estimate_id = v_estimate.id
  order by j.created_at asc limit 1;

  if v_job_id is null then
    select owner_id into v_owner_id from public.workspaces where id = v_estimate.workspace_id;
    select p.address_line_1 into v_address from public.properties p
      where p.id = v_estimate.property_id and p.workspace_id = v_estimate.workspace_id;

    insert into public.jobs(
      workspace_id,customer_id,property_id,lead_id,estimate_id,service_id,
      assigned_owner_user_id,title,description,service_address,status,estimated_value_cents
    ) values(
      v_estimate.workspace_id,v_estimate.customer_id,v_estimate.property_id,v_estimate.lead_id,v_estimate.id,v_estimate.service_id,
      v_owner_id,v_estimate.title,v_estimate.notes,v_address,'draft',v_estimate.total_cents
    ) returning id into v_job_id;
  end if;

  update public.estimates
    set status='accepted', accepted_at=coalesce(accepted_at,now())
    where id=v_estimate.id and workspace_id=v_estimate.workspace_id;
  if v_estimate.lead_id is not null then
    update public.leads set status='won'
      where id=v_estimate.lead_id and workspace_id=v_estimate.workspace_id;
  end if;
  update public.operate_estimate_share_links set accepted_at=coalesce(accepted_at,now()) where id=v_link.id;

  return v_job_id;
end;
$$;

revoke all on function public.accept_public_operate_estimate(uuid) from public, authenticated;
grant execute on function public.accept_public_operate_estimate(uuid) to anon;
