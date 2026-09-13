-- Transactional estimate editing and explicit acceptance into a draft job.

create or replace function public.save_operate_estimate(
  p_estimate_id uuid,
  p_notes text,
  p_tax_cents integer,
  p_discount_cents integer,
  p_valid_until date,
  p_items jsonb
)
returns public.estimates
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_estimate public.estimates%rowtype;
  v_subtotal integer := 0;
  v_item jsonb;
  v_quantity numeric(12,3);
  v_unit integer;
  v_position integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_tax_cents < 0 or p_discount_cents < 0 then raise exception 'Tax and discount must be non-negative.'; end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then raise exception 'Items must be an array.'; end if;

  select * into v_estimate from public.estimates where id = p_estimate_id for update;
  if not found then raise exception 'Estimate not found.'; end if;
  if not public.is_workspace_member(v_estimate.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_estimate.status in ('accepted','declined','expired','canceled') then raise exception 'This estimate can no longer be edited.'; end if;

  delete from public.estimate_line_items where estimate_id = p_estimate_id and workspace_id = v_estimate.workspace_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_quantity := coalesce((v_item->>'quantity')::numeric, 1);
    v_unit := coalesce((v_item->>'unitPriceCents')::integer, 0);
    if char_length(trim(coalesce(v_item->>'description',''))) < 1 then raise exception 'Every line item needs a description.'; end if;
    if v_quantity <= 0 or v_unit < 0 then raise exception 'Invalid line item quantity or price.'; end if;
    insert into public.estimate_line_items(workspace_id,estimate_id,position,description,quantity,unit_price_cents)
    values(v_estimate.workspace_id,p_estimate_id,v_position,trim(v_item->>'description'),v_quantity,v_unit);
    v_subtotal := v_subtotal + round(v_quantity * v_unit)::integer;
    v_position := v_position + 1;
  end loop;

  if p_discount_cents > v_subtotal + p_tax_cents then raise exception 'Discount cannot exceed subtotal plus tax.'; end if;

  update public.estimates
  set notes = nullif(trim(coalesce(p_notes,'')),''),
      tax_cents = p_tax_cents,
      discount_cents = p_discount_cents,
      subtotal_cents = v_subtotal,
      total_cents = greatest(v_subtotal + p_tax_cents - p_discount_cents, 0),
      valid_until = p_valid_until,
      status = case when status in ('draft','scheduled','completed') then 'completed' else status end,
      completed_at = coalesce(completed_at, now())
  where id = p_estimate_id
  returning * into v_estimate;

  return v_estimate;
end;
$$;

grant execute on function public.save_operate_estimate(uuid,text,integer,integer,date,jsonb) to authenticated;
revoke all on function public.save_operate_estimate(uuid,text,integer,integer,date,jsonb) from anon;

create or replace function public.accept_operate_estimate(p_estimate_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_estimate public.estimates%rowtype;
  v_job_id uuid;
  v_address text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select * into v_estimate from public.estimates where id = p_estimate_id for update;
  if not found then raise exception 'Estimate not found.'; end if;
  if not public.is_workspace_member(v_estimate.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_estimate.total_cents <= 0 then raise exception 'Add priced line items before accepting this estimate.'; end if;

  select j.id into v_job_id from public.jobs j
  where j.workspace_id = v_estimate.workspace_id and j.estimate_id = v_estimate.id
  order by j.created_at asc limit 1;

  if v_job_id is null then
    select p.address_line_1 into v_address from public.properties p
    where p.id = v_estimate.property_id and p.workspace_id = v_estimate.workspace_id;

    insert into public.jobs(
      workspace_id,customer_id,property_id,lead_id,estimate_id,service_id,
      assigned_owner_user_id,title,description,service_address,status,estimated_value_cents
    ) values(
      v_estimate.workspace_id,v_estimate.customer_id,v_estimate.property_id,v_estimate.lead_id,v_estimate.id,v_estimate.service_id,
      auth.uid(),v_estimate.title,v_estimate.notes,v_address,'draft',v_estimate.total_cents
    ) returning id into v_job_id;
  end if;

  update public.estimates set status='accepted', accepted_at=coalesce(accepted_at,now()) where id=v_estimate.id;
  if v_estimate.lead_id is not null then update public.leads set status='won' where id=v_estimate.lead_id and workspace_id=v_estimate.workspace_id; end if;
  return v_job_id;
end;
$$;

grant execute on function public.accept_operate_estimate(uuid) to authenticated;
revoke all on function public.accept_operate_estimate(uuid) from anon;
