-- Atomic Ziepher Operate lead conversion into customer/property/estimate/appointment.
-- Uses the caller's authenticated identity and existing workspace RLS membership model.

create or replace function public.convert_operate_lead_to_estimate(
  p_lead_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_duration_minutes integer default 60
)
returns table (
  customer_id uuid,
  property_id uuid,
  estimate_id uuid,
  appointment_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads%rowtype;
  v_customer_id uuid;
  v_property_id uuid;
  v_estimate_id uuid;
  v_appointment_id uuid;
  v_title text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_duration_minutes < 15 or p_duration_minutes > 1440 then
    raise exception 'Estimate appointment duration must be between 15 and 1440 minutes.';
  end if;

  v_title := trim(coalesce(p_title, ''));
  if char_length(v_title) < 1 or char_length(v_title) > 180 then
    raise exception 'Estimate title must be between 1 and 180 characters.';
  end if;

  select * into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found.';
  end if;

  if not public.is_workspace_member(v_lead.workspace_id) then
    raise exception 'Workspace access required.';
  end if;

  if v_lead.status in ('lost', 'spam') then
    raise exception 'This lead cannot be converted in its current status.';
  end if;

  v_customer_id := v_lead.customer_id;
  if v_customer_id is null then
    -- Reuse an active customer with the same email or phone when possible.
    select c.id into v_customer_id
    from public.customers c
    where c.workspace_id = v_lead.workspace_id
      and c.deleted_at is null
      and (
        (v_lead.email is not null and lower(c.email) = lower(v_lead.email))
        or (v_lead.phone is not null and c.phone = v_lead.phone)
      )
    order by c.created_at asc
    limit 1;

    if v_customer_id is null then
      insert into public.customers (
        workspace_id, display_name, email, phone, notes,
        sms_consent, sms_consent_at
      ) values (
        v_lead.workspace_id,
        v_lead.contact_name,
        v_lead.email,
        v_lead.phone,
        nullif(v_lead.message, ''),
        v_lead.sms_consent,
        case when v_lead.sms_consent then v_lead.sms_consent_at else null end
      )
      returning id into v_customer_id;
    end if;
  end if;

  v_property_id := v_lead.property_id;
  if v_property_id is null and nullif(trim(coalesce(v_lead.service_address, '')), '') is not null then
    select p.id into v_property_id
    from public.properties p
    where p.workspace_id = v_lead.workspace_id
      and p.customer_id = v_customer_id
      and p.deleted_at is null
      and lower(trim(p.address_line_1)) = lower(trim(v_lead.service_address))
    order by p.created_at asc
    limit 1;

    if v_property_id is null then
      insert into public.properties (
        workspace_id, customer_id, label, address_line_1, access_notes
      ) values (
        v_lead.workspace_id,
        v_customer_id,
        'Service property',
        trim(v_lead.service_address),
        null
      )
      returning id into v_property_id;
    end if;
  end if;

  insert into public.estimates (
    workspace_id,
    customer_id,
    property_id,
    lead_id,
    service_id,
    estimator_user_id,
    title,
    notes,
    status,
    scheduled_at
  ) values (
    v_lead.workspace_id,
    v_customer_id,
    v_property_id,
    v_lead.id,
    v_lead.service_id,
    auth.uid(),
    v_title,
    nullif(v_lead.message, ''),
    'scheduled',
    p_starts_at
  )
  returning id into v_estimate_id;

  insert into public.appointments (
    workspace_id,
    customer_id,
    property_id,
    lead_id,
    service_id,
    estimate_id,
    assigned_user_id,
    appointment_type,
    status,
    title,
    notes,
    starts_at,
    ends_at
  ) values (
    v_lead.workspace_id,
    v_customer_id,
    v_property_id,
    v_lead.id,
    v_lead.service_id,
    v_estimate_id,
    auth.uid(),
    'estimate',
    'confirmed',
    v_title,
    nullif(v_lead.message, ''),
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_minutes)
  )
  returning id into v_appointment_id;

  update public.leads
  set customer_id = v_customer_id,
      property_id = v_property_id,
      status = 'estimate_scheduled'
  where id = v_lead.id;

  return query select v_customer_id, v_property_id, v_estimate_id, v_appointment_id;
end;
$$;

grant execute on function public.convert_operate_lead_to_estimate(uuid, text, timestamptz, integer) to authenticated;
revoke all on function public.convert_operate_lead_to_estimate(uuid, text, timestamptz, integer) from anon;
