alter table public.workspace_business_profiles
  add column if not exists insurance_status text not null default 'not_provided'
    check (insurance_status in ('insured', 'not_insured', 'not_provided'));

comment on column public.workspace_business_profiles.insurance_status is
  'Self-reported business insurance status. Does not imply Ziepher verification.';
