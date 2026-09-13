-- Job execution and atomic completion -> draft invoice flow for Ziepher Operate.

create or replace function public.set_operate_job_execution_state(
  p_job_id uuid,
  p_action text
)
returns public.jobs
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select * into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then raise exception 'Job not found.'; end if;
  if not public.is_workspace_member(v_job.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_job.status in ('completed','canceled') then raise exception 'This job can no longer be changed.'; end if;

  if v_action = 'start' then
    if v_job.status not in ('draft','scheduled','paused') then raise exception 'Job cannot be started from its current status.'; end if;
    update public.jobs
    set status = 'active', actual_start_at = coalesce(actual_start_at, now()), updated_at = now()
    where id = p_job_id
    returning * into v_job;

    update public.appointments
    set status = 'in_progress', updated_at = now()
    where workspace_id = v_job.workspace_id
      and job_id = v_job.id
      and status in ('tentative','confirmed');
  elsif v_action = 'pause' then
    if v_job.status <> 'active' then raise exception 'Only an active job can be paused.'; end if;
    update public.jobs
    set status = 'paused', updated_at = now()
    where id = p_job_id
    returning * into v_job;
  elsif v_action = 'resume' then
    if v_job.status <> 'paused' then raise exception 'Only a paused job can be resumed.'; end if;
    update public.jobs
    set status = 'active', actual_start_at = coalesce(actual_start_at, now()), updated_at = now()
    where id = p_job_id
    returning * into v_job;
  else
    raise exception 'Unsupported job action.';
  end if;

  return v_job;
end;
$$;

grant execute on function public.set_operate_job_execution_state(uuid,text) to authenticated;
revoke all on function public.set_operate_job_execution_state(uuid,text) from anon;

create or replace function public.complete_operate_job(
  p_job_id uuid,
  p_final_value_cents integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
  v_estimate public.estimates%rowtype;
  v_invoice_id uuid;
  v_invoice_number text;
  v_final integer;
  v_has_estimate_items boolean := false;
  v_use_estimate_breakdown boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;

  select * into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then raise exception 'Job not found.'; end if;
  if not public.is_workspace_member(v_job.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_job.status = 'canceled' then raise exception 'Canceled jobs cannot be completed.'; end if;

  select i.id into v_invoice_id
  from public.invoices i
  where i.workspace_id = v_job.workspace_id
    and i.job_id = v_job.id
  order by i.created_at asc
  limit 1;

  if v_job.status = 'completed' then
    if v_invoice_id is null then raise exception 'Completed job is missing its invoice.'; end if;
    return v_invoice_id;
  end if;

  v_final := coalesce(p_final_value_cents, v_job.final_value_cents, v_job.estimated_value_cents, 0);
  if v_final < 0 then raise exception 'Final value must be non-negative.'; end if;

  if v_job.estimate_id is not null then
    select * into v_estimate
    from public.estimates
    where id = v_job.estimate_id and workspace_id = v_job.workspace_id;

    if found then
      select exists(
        select 1 from public.estimate_line_items eli
        where eli.workspace_id = v_job.workspace_id and eli.estimate_id = v_estimate.id
      ) into v_has_estimate_items;
      v_use_estimate_breakdown := v_has_estimate_items and v_final = v_estimate.total_cents;
    end if;
  end if;

  update public.jobs
  set status = 'completed',
      actual_start_at = coalesce(actual_start_at, least(coalesce(planned_start_at, now() - interval '1 second'), now() - interval '1 second')),
      actual_end_at = now(),
      final_value_cents = v_final,
      updated_at = now()
  where id = v_job.id;

  update public.appointments
  set status = 'completed', updated_at = now()
  where workspace_id = v_job.workspace_id
    and job_id = v_job.id
    and status in ('tentative','confirmed','in_progress');

  if v_invoice_id is null then
    v_invoice_number := 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_job.id::text, '-', ''), 1, 8));

    insert into public.invoices(
      workspace_id, customer_id, property_id, job_id, invoice_number, status,
      issue_date, due_date, subtotal_cents, tax_cents, discount_cents, total_cents,
      paid_cents, notes
    ) values (
      v_job.workspace_id, v_job.customer_id, v_job.property_id, v_job.id, v_invoice_number, 'draft',
      current_date, current_date + 14,
      case when v_use_estimate_breakdown then v_estimate.subtotal_cents else v_final end,
      case when v_use_estimate_breakdown then v_estimate.tax_cents else 0 end,
      case when v_use_estimate_breakdown then v_estimate.discount_cents else 0 end,
      v_final, 0,
      case when v_use_estimate_breakdown then v_estimate.notes else v_job.description end
    ) returning id into v_invoice_id;

    if v_use_estimate_breakdown then
      insert into public.invoice_line_items(workspace_id, invoice_id, position, description, quantity, unit_price_cents, metadata)
      select eli.workspace_id, v_invoice_id, eli.position, eli.description, eli.quantity, eli.unit_price_cents,
             jsonb_build_object('source', 'estimate', 'estimateLineItemId', eli.id)
      from public.estimate_line_items eli
      where eli.workspace_id = v_job.workspace_id and eli.estimate_id = v_estimate.id
      order by eli.position, eli.created_at;
    else
      insert into public.invoice_line_items(workspace_id, invoice_id, position, description, quantity, unit_price_cents, metadata)
      values(v_job.workspace_id, v_invoice_id, 0, 'Completed service — ' || v_job.title, 1, v_final, jsonb_build_object('source','job'));
    end if;
  end if;

  return v_invoice_id;
end;
$$;

grant execute on function public.complete_operate_job(uuid,integer) to authenticated;
revoke all on function public.complete_operate_job(uuid,integer) from anon;
