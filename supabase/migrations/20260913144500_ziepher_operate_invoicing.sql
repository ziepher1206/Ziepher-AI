-- Ziepher Operate normalized invoicing/payment foundation.
-- Live Stripe activation is intentionally not included here.

create type public.operate_invoice_status as enum (
  'draft', 'sent', 'partial', 'paid', 'overdue', 'void'
);
create type public.operate_payment_status as enum (
  'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'canceled'
);
create type public.operate_milestone_status as enum (
  'unpaid', 'paid', 'refunded', 'canceled'
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid not null,
  property_id uuid,
  job_id uuid,
  invoice_number text not null check (char_length(trim(invoice_number)) between 1 and 80),
  status public.operate_invoice_status not null default 'draft',
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  issue_date date not null default current_date,
  due_date date,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  paid_cents integer not null default 0 check (paid_cents >= 0),
  balance_due_cents integer generated always as (greatest(total_cents - paid_cents, 0)) stored,
  notes text,
  sent_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (workspace_id, invoice_number),
  check (due_date is null or due_date >= issue_date),
  check (paid_cents <= total_cents),
  constraint invoices_customer_workspace_fk
    foreign key (customer_id, workspace_id)
    references public.customers(id, workspace_id)
    on delete restrict,
  constraint invoices_property_workspace_fk
    foreign key (property_id, workspace_id)
    references public.properties(id, workspace_id)
    on delete restrict,
  constraint invoices_job_workspace_fk
    foreign key (job_id, workspace_id)
    references public.jobs(id, workspace_id)
    on delete restrict
);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null,
  position integer not null default 0 check (position >= 0),
  description text not null check (char_length(trim(description)) between 1 and 500),
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  line_total_cents integer generated always as (round(quantity * unit_price_cents)::integer) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint invoice_line_items_invoice_workspace_fk
    foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id)
    on delete cascade
);

create table public.invoice_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null,
  job_id uuid not null,
  position integer not null default 0 check (position >= 0),
  label text not null check (char_length(trim(label)) between 1 and 160),
  amount_cents integer not null check (amount_cents > 0),
  status public.operate_milestone_status not null default 'unpaid',
  due_date date,
  paid_at timestamptz,
  refunded_at timestamptz,
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint invoice_milestones_invoice_workspace_fk
    foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id)
    on delete cascade,
  constraint invoice_milestones_job_workspace_fk
    foreign key (job_id, workspace_id)
    references public.jobs(id, workspace_id)
    on delete restrict
);

create table public.workspace_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_account_id text,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  onboarding_complete boolean not null default false,
  livemode boolean not null default false,
  last_provider_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider),
  unique (provider, provider_account_id)
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null,
  milestone_id uuid,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  provider_charge_id text,
  amount_cents integer not null check (amount_cents > 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status public.operate_payment_status not null default 'pending',
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  succeeded_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (provider, provider_payment_intent_id),
  unique (provider, idempotency_key),
  check (refunded_cents <= amount_cents),
  constraint payment_transactions_invoice_workspace_fk
    foreign key (invoice_id, workspace_id)
    references public.invoices(id, workspace_id)
    on delete restrict,
  constraint payment_transactions_milestone_workspace_fk
    foreign key (milestone_id, workspace_id)
    references public.invoice_milestones(id, workspace_id)
    on delete restrict
);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_event_id text not null,
  event_type text not null,
  livemode boolean not null default false,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index invoices_workspace_status_due_idx
  on public.invoices (workspace_id, status, due_date);
create index invoices_workspace_customer_idx
  on public.invoices (workspace_id, customer_id, created_at desc);
create index invoice_line_items_invoice_position_idx
  on public.invoice_line_items (workspace_id, invoice_id, position);
create index invoice_milestones_invoice_position_idx
  on public.invoice_milestones (workspace_id, invoice_id, position);
create index payment_transactions_invoice_created_idx
  on public.payment_transactions (workspace_id, invoice_id, created_at desc);
create index payment_transactions_status_created_idx
  on public.payment_transactions (workspace_id, status, created_at desc);

create trigger invoices_set_updated_at before update on public.invoices
for each row execute function public.set_updated_at();
create trigger invoice_line_items_set_updated_at before update on public.invoice_line_items
for each row execute function public.set_updated_at();
create trigger invoice_milestones_set_updated_at before update on public.invoice_milestones
for each row execute function public.set_updated_at();
create trigger workspace_payment_accounts_set_updated_at before update on public.workspace_payment_accounts
for each row execute function public.set_updated_at();
create trigger payment_transactions_set_updated_at before update on public.payment_transactions
for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_milestones enable row level security;
alter table public.workspace_payment_accounts enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_provider_events enable row level security;

create policy "Workspace members can operate invoices"
on public.invoices for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can operate invoice line items"
on public.invoice_line_items for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can operate invoice milestones"
on public.invoice_milestones for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "Workspace members can read payment accounts"
on public.workspace_payment_accounts for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "Workspace members can read payment transactions"
on public.payment_transactions for select to authenticated
using (public.is_workspace_member(workspace_id));

-- Provider state/event writes are server mediated. Browsers never receive write access.
revoke all on public.invoices, public.invoice_line_items, public.invoice_milestones,
  public.workspace_payment_accounts, public.payment_transactions, public.payment_provider_events from anon;

grant select, insert, update on public.invoices, public.invoice_line_items, public.invoice_milestones to authenticated;
grant delete on public.invoice_line_items, public.invoice_milestones to authenticated;
grant select on public.workspace_payment_accounts, public.payment_transactions to authenticated;
revoke insert, update, delete on public.workspace_payment_accounts, public.payment_transactions from authenticated;
revoke all on public.payment_provider_events from authenticated;
