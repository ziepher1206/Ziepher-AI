-- Atomic payment settlement/refund helpers for Ziepher Operate.
-- These functions are service-role only and are intended for verified provider webhooks.

create or replace function public.recompute_operate_invoice_payment_state(
  p_workspace_id uuid,
  p_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
  v_net_paid integer;
  v_status public.operate_invoice_status;
begin
  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
    and workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  select coalesce(sum(greatest(amount_cents - refunded_cents, 0)), 0)::integer
    into v_net_paid
  from public.payment_transactions
  where workspace_id = p_workspace_id
    and invoice_id = p_invoice_id
    and status in ('succeeded', 'partially_refunded', 'refunded');

  v_net_paid := least(v_net_paid, v_invoice.total_cents);

  v_status := case
    when v_invoice.status = 'void' then 'void'::public.operate_invoice_status
    when v_invoice.total_cents > 0 and v_net_paid >= v_invoice.total_cents
      then 'paid'::public.operate_invoice_status
    when v_net_paid > 0 then 'partial'::public.operate_invoice_status
    when v_invoice.sent_at is not null then 'sent'::public.operate_invoice_status
    else 'draft'::public.operate_invoice_status
  end;

  update public.invoices
  set paid_cents = v_net_paid,
      status = v_status,
      paid_at = case when v_status = 'paid' then coalesce(paid_at, now()) else null end,
      updated_at = now()
  where id = p_invoice_id
    and workspace_id = p_workspace_id;
end;
$$;

create or replace function public.settle_operate_checkout_payment(
  p_provider_event_id text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_charge_id text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx public.payment_transactions%rowtype;
begin
  if p_amount_cents <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  select * into v_tx
  from public.payment_transactions
  where provider = 'stripe'
    and provider_checkout_session_id = p_checkout_session_id
  for update;

  if not found then
    raise exception 'Payment transaction not found for checkout session';
  end if;

  if v_tx.amount_cents <> p_amount_cents then
    raise exception 'Provider amount does not match authoritative transaction amount';
  end if;

  if v_tx.status not in ('succeeded', 'partially_refunded', 'refunded') then
    update public.payment_transactions
    set provider_payment_intent_id = coalesce(p_payment_intent_id, provider_payment_intent_id),
        provider_charge_id = coalesce(p_charge_id, provider_charge_id),
        status = 'succeeded',
        succeeded_at = coalesce(succeeded_at, now()),
        failed_at = null,
        metadata = metadata || jsonb_build_object('settledByEvent', p_provider_event_id),
        updated_at = now()
    where id = v_tx.id;
  else
    update public.payment_transactions
    set provider_payment_intent_id = coalesce(provider_payment_intent_id, p_payment_intent_id),
        provider_charge_id = coalesce(provider_charge_id, p_charge_id),
        updated_at = now()
    where id = v_tx.id;
  end if;

  if v_tx.milestone_id is not null then
    update public.invoice_milestones
    set status = 'paid',
        paid_at = coalesce(paid_at, now()),
        refunded_at = null,
        provider_checkout_session_id = p_checkout_session_id,
        provider_payment_intent_id = coalesce(p_payment_intent_id, provider_payment_intent_id),
        updated_at = now()
    where id = v_tx.milestone_id
      and workspace_id = v_tx.workspace_id;
  end if;

  perform public.recompute_operate_invoice_payment_state(v_tx.workspace_id, v_tx.invoice_id);
  return v_tx.id;
end;
$$;

create or replace function public.refund_operate_payment(
  p_provider_event_id text,
  p_charge_id text,
  p_refunded_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx public.payment_transactions%rowtype;
  v_new_status public.operate_payment_status;
begin
  select * into v_tx
  from public.payment_transactions
  where provider = 'stripe'
    and provider_charge_id = p_charge_id
  for update;

  if not found then
    raise exception 'Payment transaction not found for charge';
  end if;

  if p_refunded_cents < 0 or p_refunded_cents > v_tx.amount_cents then
    raise exception 'Refund amount is outside the transaction amount';
  end if;

  v_new_status := case
    when p_refunded_cents = 0 then 'succeeded'::public.operate_payment_status
    when p_refunded_cents >= v_tx.amount_cents then 'refunded'::public.operate_payment_status
    else 'partially_refunded'::public.operate_payment_status
  end;

  update public.payment_transactions
  set refunded_cents = p_refunded_cents,
      status = v_new_status,
      refunded_at = case when p_refunded_cents > 0 then now() else null end,
      metadata = metadata || jsonb_build_object('lastRefundEvent', p_provider_event_id),
      updated_at = now()
  where id = v_tx.id;

  if v_tx.milestone_id is not null then
    update public.invoice_milestones
    set status = case
          when p_refunded_cents >= v_tx.amount_cents then 'refunded'::public.operate_milestone_status
          else 'paid'::public.operate_milestone_status
        end,
        refunded_at = case when p_refunded_cents >= v_tx.amount_cents then now() else null end,
        updated_at = now()
    where id = v_tx.milestone_id
      and workspace_id = v_tx.workspace_id;
  end if;

  perform public.recompute_operate_invoice_payment_state(v_tx.workspace_id, v_tx.invoice_id);
  return v_tx.id;
end;
$$;

create or replace function public.cancel_operate_checkout_payment(
  p_provider_event_id text,
  p_checkout_session_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx
  from public.payment_transactions
  where provider = 'stripe'
    and provider_checkout_session_id = p_checkout_session_id
  for update;

  if not found then
    raise exception 'Payment transaction not found for checkout session';
  end if;

  if v_tx.status = 'pending' then
    update public.payment_transactions
    set status = 'canceled',
        metadata = metadata || jsonb_build_object('canceledByEvent', p_provider_event_id),
        updated_at = now()
    where id = v_tx.id;
  end if;

  return v_tx.id;
end;
$$;

revoke all on function public.recompute_operate_invoice_payment_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.settle_operate_checkout_payment(text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.refund_operate_payment(text, text, integer) from public, anon, authenticated;
revoke all on function public.cancel_operate_checkout_payment(text, text) from public, anon, authenticated;

grant execute on function public.recompute_operate_invoice_payment_state(uuid, uuid) to service_role;
grant execute on function public.settle_operate_checkout_payment(text, text, text, text, integer) to service_role;
grant execute on function public.refund_operate_payment(text, text, integer) to service_role;
grant execute on function public.cancel_operate_checkout_payment(text, text) to service_role;
