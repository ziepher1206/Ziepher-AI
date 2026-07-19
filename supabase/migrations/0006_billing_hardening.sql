-- Harden recurring credit grants and payment-state tracking.
alter table public.subscriptions
  add column if not exists billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'annual'));

create index if not exists subscriptions_status_idx
  on public.subscriptions(status);
