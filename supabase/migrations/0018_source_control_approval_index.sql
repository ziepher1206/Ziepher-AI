-- Cover the new approval audit foreign key so deletes/joins on auth.users do not
-- require scanning the source-control ledger.
create index if not exists source_control_runs_approved_by_idx
  on public.source_control_runs(approved_by)
  where approved_by is not null;
