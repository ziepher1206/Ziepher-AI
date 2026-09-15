-- Feed existing Z-Life modules into the normalized My Day stream.
-- Source tables remain authoritative. These triggers only maintain a compact
-- attention record that routes the user back to the owning module.

create or replace function public.sync_home_task_to_zlife_daily_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.zlife_daily_items
    where workspace_id = old.workspace_id
      and source_module = 'home_family'
      and source_entity_type = 'home_task'
      and source_entity_id = old.id::text;
    return old;
  end if;

  if new.status in ('done', 'cancelled') then
    delete from public.zlife_daily_items
    where workspace_id = new.workspace_id
      and source_module = 'home_family'
      and source_entity_type = 'home_task'
      and source_entity_id = new.id::text;
    return new;
  end if;

  insert into public.zlife_daily_items (
    workspace_id, source_module, source_entity_type, source_entity_id,
    item_kind, title, detail, priority, due_at, action_href, metadata
  ) values (
    new.workspace_id, 'home_family', 'home_task', new.id::text,
    'task', new.title, nullif(new.category, ''),
    case when new.priority in ('low','normal','high','urgent') then new.priority else 'normal' end,
    new.due_at, '/home', jsonb_build_object('source_status', new.status)
  )
  on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
    where source_entity_id is not null
  do update set
    title = excluded.title,
    detail = excluded.detail,
    priority = excluded.priority,
    due_at = excluded.due_at,
    action_href = excluded.action_href,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_home_task_to_zlife_daily_item on public.home_tasks;
create trigger sync_home_task_to_zlife_daily_item
after insert or update or delete on public.home_tasks
for each row execute function public.sync_home_task_to_zlife_daily_item();

create or replace function public.sync_appointment_to_zlife_daily_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.zlife_daily_items
    where workspace_id = old.workspace_id
      and source_module = 'business'
      and source_entity_type = 'appointment'
      and source_entity_id = old.id::text;
    return old;
  end if;

  if new.status = 'canceled' then
    delete from public.zlife_daily_items
    where workspace_id = new.workspace_id
      and source_module = 'business'
      and source_entity_type = 'appointment'
      and source_entity_id = new.id::text;
    return new;
  end if;

  insert into public.zlife_daily_items (
    workspace_id, source_module, source_entity_type, source_entity_id,
    item_kind, title, detail, starts_at, action_href, metadata
  ) values (
    new.workspace_id, 'business', 'appointment', new.id::text,
    'appointment', new.title,
    nullif(concat_ws(' · ', new.appointment_type, new.service_address), ''),
    new.starts_at, '/operate/calendar', jsonb_build_object('source_status', new.status)
  )
  on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
    where source_entity_id is not null
  do update set
    title = excluded.title,
    detail = excluded.detail,
    starts_at = excluded.starts_at,
    action_href = excluded.action_href,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_appointment_to_zlife_daily_item on public.appointments;
create trigger sync_appointment_to_zlife_daily_item
after insert or update or delete on public.appointments
for each row execute function public.sync_appointment_to_zlife_daily_item();

create or replace function public.sync_invoice_to_zlife_daily_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.zlife_daily_items
    where workspace_id = old.workspace_id
      and source_module = 'business'
      and source_entity_type = 'invoice'
      and source_entity_id = old.id::text;
    return old;
  end if;

  if new.status not in ('sent', 'partial', 'overdue') or coalesce(new.balance_due_cents, 0) <= 0 then
    delete from public.zlife_daily_items
    where workspace_id = new.workspace_id
      and source_module = 'business'
      and source_entity_type = 'invoice'
      and source_entity_id = new.id::text;
    return new;
  end if;

  insert into public.zlife_daily_items (
    workspace_id, source_module, source_entity_type, source_entity_id,
    item_kind, title, detail, priority, due_at, action_href, metadata
  ) values (
    new.workspace_id, 'business', 'invoice', new.id::text,
    'payment_due',
    'Invoice ' || coalesce(new.invoice_number, 'payment') || ' due',
    'Open balance: $' || to_char(coalesce(new.balance_due_cents, 0) / 100.0, 'FM999999990.00'),
    case when new.status = 'overdue' then 'high' else 'normal' end,
    case when new.due_date is null then null else new.due_date::timestamptz end,
    '/operate/invoices', jsonb_build_object('source_status', new.status)
  )
  on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
    where source_entity_id is not null
  do update set
    title = excluded.title,
    detail = excluded.detail,
    priority = excluded.priority,
    due_at = excluded.due_at,
    action_href = excluded.action_href,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_invoice_to_zlife_daily_item on public.invoices;
create trigger sync_invoice_to_zlife_daily_item
after insert or update or delete on public.invoices
for each row execute function public.sync_invoice_to_zlife_daily_item();

create or replace function public.sync_lead_to_zlife_daily_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.zlife_daily_items
    where workspace_id = old.workspace_id
      and source_module = 'business'
      and source_entity_type = 'lead'
      and source_entity_id = old.id::text;
    return old;
  end if;

  if new.status <> 'new' then
    delete from public.zlife_daily_items
    where workspace_id = new.workspace_id
      and source_module = 'business'
      and source_entity_type = 'lead'
      and source_entity_id = new.id::text;
    return new;
  end if;

  insert into public.zlife_daily_items (
    workspace_id, source_module, source_entity_type, source_entity_id,
    item_kind, title, detail, priority, starts_at, action_href, metadata
  ) values (
    new.workspace_id, 'business', 'lead', new.id::text,
    'business', 'New lead: ' || new.contact_name,
    'Waiting for first contact', 'high', new.received_at, '/operate/leads',
    jsonb_build_object('source_status', new.status)
  )
  on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
    where source_entity_id is not null
  do update set
    title = excluded.title,
    detail = excluded.detail,
    priority = excluded.priority,
    starts_at = excluded.starts_at,
    action_href = excluded.action_href,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_lead_to_zlife_daily_item on public.leads;
create trigger sync_lead_to_zlife_daily_item
after insert or update or delete on public.leads
for each row execute function public.sync_lead_to_zlife_daily_item();

create or replace function public.sync_home_maintenance_to_zlife_daily_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.zlife_daily_items
    where workspace_id = old.workspace_id
      and source_module = 'home_family'
      and source_entity_type = 'maintenance'
      and source_entity_id = old.id::text;
    return old;
  end if;

  insert into public.zlife_daily_items (
    workspace_id, source_module, source_entity_type, source_entity_id,
    item_kind, title, detail, due_at, action_href, metadata
  ) values (
    new.workspace_id, 'home_family', 'maintenance', new.id::text,
    'reminder', new.name, nullif(new.location, ''), new.next_due_at, '/home',
    jsonb_build_object('cadence_days', new.cadence_days)
  )
  on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
    where source_entity_id is not null
  do update set
    title = excluded.title,
    detail = excluded.detail,
    due_at = excluded.due_at,
    action_href = excluded.action_href,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_home_maintenance_to_zlife_daily_item on public.home_maintenance_items;
create trigger sync_home_maintenance_to_zlife_daily_item
after insert or update or delete on public.home_maintenance_items
for each row execute function public.sync_home_maintenance_to_zlife_daily_item();

-- Backfill currently relevant records so My Day is useful immediately after
-- this migration is deliberately applied in a controlled environment.
insert into public.zlife_daily_items (
  workspace_id, source_module, source_entity_type, source_entity_id,
  item_kind, title, detail, priority, due_at, action_href, metadata
)
select workspace_id, 'home_family', 'home_task', id::text, 'task', title,
  nullif(category, ''),
  case when priority in ('low','normal','high','urgent') then priority else 'normal' end,
  due_at, '/home', jsonb_build_object('source_status', status)
from public.home_tasks
where status not in ('done', 'cancelled')
on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
  where source_entity_id is not null
do nothing;

insert into public.zlife_daily_items (
  workspace_id, source_module, source_entity_type, source_entity_id,
  item_kind, title, detail, starts_at, action_href, metadata
)
select workspace_id, 'business', 'appointment', id::text, 'appointment', title,
  nullif(concat_ws(' · ', appointment_type, service_address), ''),
  starts_at, '/operate/calendar', jsonb_build_object('source_status', status)
from public.appointments
where status <> 'canceled'
on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
  where source_entity_id is not null
do nothing;

insert into public.zlife_daily_items (
  workspace_id, source_module, source_entity_type, source_entity_id,
  item_kind, title, detail, priority, starts_at, action_href, metadata
)
select workspace_id, 'business', 'lead', id::text, 'business',
  'New lead: ' || contact_name, 'Waiting for first contact', 'high',
  received_at, '/operate/leads', jsonb_build_object('source_status', status)
from public.leads
where status = 'new'
on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
  where source_entity_id is not null
do nothing;

insert into public.zlife_daily_items (
  workspace_id, source_module, source_entity_type, source_entity_id,
  item_kind, title, detail, priority, due_at, action_href, metadata
)
select workspace_id, 'business', 'invoice', id::text, 'payment_due',
  'Invoice ' || coalesce(invoice_number, 'payment') || ' due',
  'Open balance: $' || to_char(coalesce(balance_due_cents, 0) / 100.0, 'FM999999990.00'),
  case when status = 'overdue' then 'high' else 'normal' end,
  case when due_date is null then null else due_date::timestamptz end,
  '/operate/invoices', jsonb_build_object('source_status', status)
from public.invoices
where status in ('sent', 'partial', 'overdue') and coalesce(balance_due_cents, 0) > 0
on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
  where source_entity_id is not null
do nothing;

insert into public.zlife_daily_items (
  workspace_id, source_module, source_entity_type, source_entity_id,
  item_kind, title, detail, due_at, action_href, metadata
)
select workspace_id, 'home_family', 'maintenance', id::text, 'reminder', name,
  nullif(location, ''), next_due_at, '/home', jsonb_build_object('cadence_days', cadence_days)
from public.home_maintenance_items
on conflict (workspace_id, source_module, source_entity_type, source_entity_id)
  where source_entity_id is not null
do nothing;
