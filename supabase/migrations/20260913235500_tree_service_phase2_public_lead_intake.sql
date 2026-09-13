create table if not exists public.operate_lead_intake_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  label text not null default 'Website lead form',
  allowed_origin text,
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  check (char_length(label) between 1 and 160),
  check (allowed_origin is null or char_length(allowed_origin) <= 500)
);

alter table public.operate_lead_intake_tokens enable row level security;

create index if not exists operate_lead_intake_tokens_workspace_created_idx
  on public.operate_lead_intake_tokens(workspace_id, created_at desc);
create index if not exists operate_lead_intake_tokens_project_idx
  on public.operate_lead_intake_tokens(project_id) where project_id is not null;

create policy operate_lead_intake_tokens_select_admin on public.operate_lead_intake_tokens
  for select to authenticated
  using (
    exists (
      select 1 from public.workspaces w
      left join public.workspace_members wm
        on wm.workspace_id = w.id and wm.user_id = (select auth.uid())
      where w.id = workspace_id
        and (w.owner_id = (select auth.uid()) or wm.role in ('owner','admin'))
    )
  );

revoke all on public.operate_lead_intake_tokens from public, anon, authenticated;
grant select on public.operate_lead_intake_tokens to authenticated;
grant select, insert, update, delete on public.operate_lead_intake_tokens to service_role;

alter table public.leads
  add column if not exists public_intake_token_id uuid references public.operate_lead_intake_tokens(id) on delete set null;

create index if not exists leads_public_intake_token_received_idx
  on public.leads(public_intake_token_id, received_at desc)
  where public_intake_token_id is not null;

create or replace function public.create_operate_lead_intake_token(
  p_workspace_id uuid,
  p_project_id uuid default null,
  p_label text default 'Website lead form',
  p_allowed_origin text default null,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_label text := trim(coalesce(p_label, ''));
  v_origin text := nullif(trim(coalesce(p_allowed_origin, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if char_length(v_label) < 1 or char_length(v_label) > 160 then raise exception 'Token label must be between 1 and 160 characters.'; end if;
  if v_origin is not null and char_length(v_origin) > 500 then raise exception 'Allowed origin is too long.'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Expiration must be in the future.'; end if;

  if not exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = p_workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner','admin'))
  ) then raise exception 'Workspace administrator access required.'; end if;

  if p_project_id is not null and not exists (
    select 1 from public.projects p where p.id = p_project_id and p.workspace_id = p_workspace_id
  ) then raise exception 'Project does not belong to this workspace.'; end if;

  insert into public.operate_lead_intake_tokens(workspace_id, project_id, label, allowed_origin, created_by, expires_at)
  values(p_workspace_id, p_project_id, v_label, v_origin, auth.uid(), p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.revoke_operate_lead_intake_token(p_token_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.operate_lead_intake_tokens%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  select * into v_row from public.operate_lead_intake_tokens where id = p_token_id for update;
  if not found then raise exception 'Lead intake token not found.'; end if;
  if not exists (
    select 1 from public.workspaces w
    left join public.workspace_members wm
      on wm.workspace_id = w.id and wm.user_id = auth.uid()
    where w.id = v_row.workspace_id
      and (w.owner_id = auth.uid() or wm.role in ('owner','admin'))
  ) then raise exception 'Workspace administrator access required.'; end if;

  update public.operate_lead_intake_tokens
  set revoked_at = coalesce(revoked_at, now()), updated_at = now()
  where id = v_row.id;
end;
$$;

create or replace function public.submit_public_operate_lead(
  p_token uuid,
  p_submission_id uuid,
  p_origin text,
  p_contact_name text,
  p_email text default null,
  p_phone text default null,
  p_service_address text default null,
  p_message text default null,
  p_source text default 'Website',
  p_source_detail text default null,
  p_sms_consent boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.operate_lead_intake_tokens%rowtype;
  v_existing uuid;
  v_lead_id uuid;
  v_name text := trim(coalesce(p_contact_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_address text := nullif(trim(coalesce(p_service_address, '')), '');
  v_message text := nullif(trim(coalesce(p_message, '')), '');
  v_source text := nullif(trim(coalesce(p_source, '')), '');
  v_detail text := nullif(trim(coalesce(p_source_detail, '')), '');
begin
  select * into v_token
  from public.operate_lead_intake_tokens
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if not found then raise exception 'Lead intake link is invalid or expired.'; end if;

  if v_token.allowed_origin is not null
     and trim(coalesce(p_origin, '')) <> v_token.allowed_origin then
    raise exception 'This website is not allowed to submit through this intake link.';
  end if;

  if p_submission_id is null then raise exception 'Submission ID is required.'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 160 then raise exception 'Name must be between 1 and 160 characters.'; end if;
  if v_email is null and v_phone is null then raise exception 'Add an email address or phone number.'; end if;
  if v_email is not null and (char_length(v_email) > 320 or position('@' in v_email) < 2) then raise exception 'Email address is invalid.'; end if;
  if v_phone is not null and char_length(v_phone) > 40 then raise exception 'Phone number is too long.'; end if;
  if v_address is not null and char_length(v_address) > 500 then raise exception 'Service address is too long.'; end if;
  if v_message is not null and char_length(v_message) > 5000 then raise exception 'Message is too long.'; end if;
  if v_source is not null and char_length(v_source) > 100 then raise exception 'Source is too long.'; end if;
  if v_detail is not null and char_length(v_detail) > 500 then raise exception 'Source detail is too long.'; end if;

  select id into v_existing
  from public.leads
  where workspace_id = v_token.workspace_id and public_submission_id = p_submission_id;
  if v_existing is not null then return v_existing; end if;

  if (
    select count(*) from public.leads
    where public_intake_token_id = v_token.id
      and received_at > now() - interval '1 hour'
  ) >= 120 then raise exception 'This intake form is temporarily rate limited.'; end if;

  insert into public.leads(
    workspace_id, project_id, contact_name, email, phone, service_address, message,
    source, source_detail, status, sms_consent, sms_consent_at,
    public_submission_id, public_intake_token_id
  ) values(
    v_token.workspace_id, v_token.project_id, v_name, v_email, v_phone, v_address, v_message,
    coalesce(v_source, 'Website'), v_detail, 'new', p_sms_consent,
    case when p_sms_consent then now() else null end,
    p_submission_id, v_token.id
  ) returning id into v_lead_id;

  return v_lead_id;
exception
  when unique_violation then
    select id into v_existing
    from public.leads
    where workspace_id = v_token.workspace_id and public_submission_id = p_submission_id;
    if v_existing is not null then return v_existing; end if;
    raise;
end;
$$;

revoke all on function public.create_operate_lead_intake_token(uuid,uuid,text,text,timestamptz) from public, anon;
grant execute on function public.create_operate_lead_intake_token(uuid,uuid,text,text,timestamptz) to authenticated;
revoke all on function public.revoke_operate_lead_intake_token(uuid) from public, anon;
grant execute on function public.revoke_operate_lead_intake_token(uuid) to authenticated;
revoke all on function public.submit_public_operate_lead(uuid,uuid,text,text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.submit_public_operate_lead(uuid,uuid,text,text,text,text,text,text,text,text,boolean) to anon, authenticated;

create or replace function public.convert_operate_lead_to_estimate(
  p_lead_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_duration_minutes integer default 60
) returns table(customer_id uuid, property_id uuid, estimate_id uuid, appointment_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads%rowtype;
  v_customer_id uuid;
  v_property_id uuid;
  v_estimate_id uuid;
  v_appointment_id uuid;
  v_title text;
  v_email text;
  v_phone_digits text;
  v_identity_key text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if p_duration_minutes < 15 or p_duration_minutes > 1440 then raise exception 'Estimate appointment duration must be between 15 and 1440 minutes.'; end if;

  v_title := trim(coalesce(p_title, ''));
  if char_length(v_title) < 1 or char_length(v_title) > 180 then raise exception 'Estimate title must be between 1 and 180 characters.'; end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead not found.'; end if;
  if not public.is_workspace_member(v_lead.workspace_id) then raise exception 'Workspace access required.'; end if;
  if v_lead.status in ('lost','spam') then raise exception 'This lead cannot be converted in its current status.'; end if;

  v_email := nullif(lower(trim(coalesce(v_lead.email, ''))), '');
  v_phone_digits := nullif(regexp_replace(coalesce(v_lead.phone, ''), '[^0-9]', '', 'g'), '');
  v_identity_key := coalesce('e:' || v_email, 'p:' || v_phone_digits, 'lead:' || v_lead.id::text);
  perform pg_advisory_xact_lock(hashtextextended(v_lead.workspace_id::text || ':' || v_identity_key, 0));

  v_customer_id := v_lead.customer_id;
  if v_customer_id is null then
    select c.id into v_customer_id
    from public.customers c
    where c.workspace_id = v_lead.workspace_id
      and c.deleted_at is null
      and (
        (v_email is not null and lower(trim(coalesce(c.email, ''))) = v_email)
        or (v_phone_digits is not null and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_digits)
      )
    order by c.created_at asc
    limit 1;

    if v_customer_id is null then
      insert into public.customers(display_name,email,phone,notes,sms_consent,sms_consent_at,workspace_id)
      values(v_lead.contact_name,v_lead.email,v_lead.phone,nullif(v_lead.message,''),v_lead.sms_consent,
        case when v_lead.sms_consent then v_lead.sms_consent_at else null end,v_lead.workspace_id)
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
      and lower(regexp_replace(trim(p.address_line_1), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(v_lead.service_address), '\\s+', ' ', 'g'))
    order by p.created_at asc
    limit 1;

    if v_property_id is null then
      insert into public.properties(workspace_id,customer_id,label,address_line_1)
      values(v_lead.workspace_id,v_customer_id,'Service property',trim(v_lead.service_address))
      returning id into v_property_id;
    end if;
  end if;

  insert into public.estimates(workspace_id,customer_id,property_id,lead_id,service_id,estimator_user_id,title,notes,status,scheduled_at)
  values(v_lead.workspace_id,v_customer_id,v_property_id,v_lead.id,v_lead.service_id,auth.uid(),v_title,nullif(v_lead.message,''),'scheduled',p_starts_at)
  returning id into v_estimate_id;

  insert into public.appointments(workspace_id,customer_id,property_id,lead_id,service_id,estimate_id,assigned_user_id,appointment_type,status,title,notes,starts_at,ends_at)
  values(v_lead.workspace_id,v_customer_id,v_property_id,v_lead.id,v_lead.service_id,v_estimate_id,auth.uid(),'estimate','confirmed',v_title,nullif(v_lead.message,''),p_starts_at,p_starts_at + make_interval(mins => p_duration_minutes))
  returning id into v_appointment_id;

  update public.leads set customer_id=v_customer_id, property_id=v_property_id, status='estimate_scheduled', updated_at=now() where id=v_lead.id;
  return query select v_customer_id,v_property_id,v_estimate_id,v_appointment_id;
end;
$$;