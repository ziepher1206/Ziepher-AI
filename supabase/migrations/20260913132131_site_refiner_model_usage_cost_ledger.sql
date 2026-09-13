create or replace function public.site_refiner_prepare_model_usage()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.workspace_id is null and new.project_id is not null then
    select p.workspace_id into new.workspace_id
    from public.projects p
    where p.id = new.project_id;
  end if;
  return new;
end;
$$;

create or replace function public.site_refiner_record_model_usage_cost()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.workspace_id is not null then
    insert into public.project_cost_events (
      workspace_id,
      project_id,
      category,
      provider,
      operation,
      provider_cost_usd,
      customer_usage_usd,
      source_reference,
      cost_metadata
    ) values (
      new.workspace_id,
      new.project_id,
      'ai',
      new.provider,
      new.operation,
      new.provider_cost_usd,
      new.customer_usage_usd,
      'model_usage:' || new.id::text,
      jsonb_build_object(
        'model', new.model,
        'input_tokens', new.input_tokens,
        'output_tokens', new.output_tokens,
        'cached_input_tokens', new.cached_input_tokens,
        'billable_to_user', new.billable_to_user
      )
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create unique index if not exists project_cost_events_source_reference_unique_idx
  on public.project_cost_events (source_reference)
  where source_reference is not null;

drop trigger if exists model_usage_prepare_site_refiner on public.model_usage;
create trigger model_usage_prepare_site_refiner
before insert on public.model_usage
for each row execute function public.site_refiner_prepare_model_usage();

drop trigger if exists model_usage_record_site_refiner_cost on public.model_usage;
create trigger model_usage_record_site_refiner_cost
after insert on public.model_usage
for each row execute function public.site_refiner_record_model_usage_cost();
